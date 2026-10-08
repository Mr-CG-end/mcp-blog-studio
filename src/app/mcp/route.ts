/**
 * MCP Blog Studio — /mcp Streamable HTTP 路由
 *
 * 支持多客户端独立 Session 管理、Bearer Token 鉴权守卫与每请求隔离。
 * 基于 Payload Local API 的真实数据库服务。
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/mcp/server'
import { createPayloadService } from '@/services/payload'
import { validateMCPToken } from '@/collections/MCPKeys'
import type { ActorContext } from '@/mcp/contracts'
import type { NextRequest } from 'next/server'

interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport
  actor: ActorContext
  lastActive: number
}

// 全局服务实例（单例）
const servicePromise = createPayloadService()

// 内存多会话存储
const sessions = new Map<string, McpSession>()
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 分钟无活动过期

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) sessions.delete(id)
  }
}

async function authenticateBearer(request: NextRequest, requestID: string): Promise<ActorContext | null> {
  const auth = request.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null

  const token = auth.slice(7).trim()
  if (!token) return null

  const { getPayload } = await import('payload')
  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })
  const result = await validateMCPToken(payload, token)
  if (!result) return null

  return { userID: result.userID, role: result.role as 'admin' | 'author', keyID: result.keyID, requestID, source: 'mcp' }
}

export async function GET(request: NextRequest): Promise<Response> { return handleMCPRequest(request) }
export async function POST(request: NextRequest): Promise<Response> { return handleMCPRequest(request) }
export async function DELETE(request: NextRequest): Promise<Response> {
  cleanupExpiredSessions()
  const sessionId = request.headers.get('mcp-session-id')
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    sessions.delete(sessionId)
    return await session.transport.handleRequest(request as unknown as Request)
  }
  return new Response(null, { status: 204 })
}

async function handleMCPRequest(request: NextRequest): Promise<Response> {
  cleanupExpiredSessions()
  const sessionId = request.headers.get('mcp-session-id')

  // 1. 已有会话
  if (sessionId) {
    const session = sessions.get(sessionId)
    if (!session) return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Session expired' }, id: null }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    // Revalidate on every call so an existing session cannot bypass a scheduled revocation.
    const actor = await authenticateBearer(request, crypto.randomUUID())
    if (!actor || actor.keyID !== session.actor.keyID || actor.userID !== session.actor.userID || actor.role !== session.actor.role)
      return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized' }, id: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    session.lastActive = Date.now()
    return await session.transport.handleRequest(request as unknown as Request)
  }

  // 2. 新会话：Bearer 鉴权
  const requestID = crypto.randomUUID()
  const actor = await authenticateBearer(request, requestID)
  if (!actor) return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized' }, id: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  // 3. 创建独立 Transport + McpServer
  let createdSessionId = ''
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => { createdSessionId = crypto.randomUUID(); return createdSessionId },
    enableJsonResponse: true,
  })
  const server = createMcpServer(actor, await servicePromise)
  await server.connect(transport)

  const response = await transport.handleRequest(request as unknown as Request)
  if (createdSessionId) sessions.set(createdSessionId, { transport, actor, lastActive: Date.now() })
  return response
}
