/**
 * MCP Blog Studio — /mcp Streamable HTTP 路由
 *
 * Bearer token 鉴权 → 创建对应角色的 McpServer → 处理请求。
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMCPServer } from '@/mcp/server'
import { createPayloadService } from '@/services/payload'
import { validateMCPToken } from '@/collections/MCPKeys'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { ActorContext } from '@/mcp/contracts'
import type { NextRequest } from 'next/server'

// 服务实例（单例）
const servicePromise = createPayloadService()
const payloadPromise = getPayload({ config })

// 会话管理
const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>()

async function authenticate(request: NextRequest): Promise<ActorContext | null> {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null

  const token = auth.slice(7).trim()
  if (!token) return null

  const payload = await payloadPromise
  const result = await validateMCPToken(payload, token)
  if (!result) return null

  return {
    userID: result.userID,
    role: result.role as 'admin' | 'author',
    keyID: result.keyID,
    requestID: crypto.randomUUID(),
    source: 'mcp',
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 无密钥时允许 dev 回退
    const actor = await authenticate(request)
    const effectiveActor: ActorContext = actor ?? {
      userID: 1, role: 'admin', keyID: 0, requestID: crypto.randomUUID(), source: 'mcp',
    }

    const sessionId = request.headers.get('mcp-session-id')
    let transport: WebStandardStreamableHTTPServerTransport
    let isNewSession = false

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!
    } else {
      transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (sid: string) => { sessions.set(sid, transport) },
        onsessionclosed: (sid: string) => { sessions.delete(sid) },
      })
      const server = createMCPServer(await servicePromise)
      await server.connect(transport)
      isNewSession = true
    }

    const response = await transport.handleRequest(request as unknown as Request)

    if (isNewSession && transport.sessionId) {
      const headers = new Headers(response.headers)
      headers.set('Mcp-Session-Id', transport.sessionId)
      return new Response(response.body, { status: response.status, headers })
    }

    return response
  } catch (error) {
    console.error('[MCP] Request failed:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function GET(request: NextRequest) { return POST(request) }
export async function DELETE(request: NextRequest) { return POST(request) }
