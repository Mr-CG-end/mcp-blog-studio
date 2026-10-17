/** Stateless Streamable HTTP: each request owns its authenticated server and transport. */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/mcp/server'
import { createPayloadService } from '@/services/payload'
import { validateMCPToken } from '@/collections/MCPKeys'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'
const MAX_BODY_BYTES = 1024 * 1024

function failure(status: number, message: string) {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message }, id: null },
    {
      status,
      headers: { 'Cache-Control': 'no-store', ...(status === 405 ? { Allow: 'POST' } : {}) },
    },
  )
}

async function handle(request: Request): Promise<Response> {
  const requestID = crypto.randomUUID()
  const expected = new URL(process.env.NEXT_PUBLIC_SERVER_URL || request.url)
  const origin = request.headers.get('origin')
  const host = request.headers.get('host') || new URL(request.url).host
  if (host !== expected.host || (origin && origin !== expected.origin))
    return failure(403, 'Forbidden origin or host')
  const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '')?.[1]
  if (!token) return failure(401, 'Unauthorized: 缺少有效 Bearer 认证 Token')
  let server: ReturnType<typeof createMcpServer> | undefined
  try {
    const payload = await getPayload({ config })
    const identity = await validateMCPToken(payload, token)
    if (!identity || !['admin', 'author'].includes(identity.role))
      return failure(401, 'Unauthorized: 缺少有效 Bearer 认证 Token')
    if (request.method !== 'POST') return failure(405, 'Method not allowed')
    // Bound streamed bodies too: Content-Length alone is controlled by the caller.
    const reader = request.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_BODY_BYTES) {
            await reader.cancel()
            return failure(413, 'Request body too large')
          }
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
    }
    const body = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true })
    server = createMcpServer(
      { ...identity, role: identity.role as 'admin' | 'author', requestID, source: 'mcp' },
      await createPayloadService(),
    )
    await server.connect(transport)
    const response = await transport.handleRequest(
      new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body,
        signal: request.signal,
      }),
    )
    // JSON mode has a finite body. Consume it before closing the SDK connection.
    const bytes = await response.arrayBuffer()
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'no-store')
    return new Response(bytes.byteLength ? bytes : null, { status: response.status, headers })
  } catch {
    console.error(`[MCP] Request failed: ${requestID}`)
    return failure(500, `Internal server error (${requestID})`)
  } finally {
    await server?.close()
  }
}

export const POST = handle
export const GET = handle
export const DELETE = handle
