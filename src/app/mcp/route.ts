/**
 * MCP Blog Studio — /mcp Streamable HTTP 路由
 *
 * 支持多客户端独立 Session 管理、Bearer Token 鉴权守卫与每请求隔离。
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/mcp/server'
import { createReadBlogService } from '@/services/blog/read'
import { createStubService } from '@/mcp/services/stub'
import type { ActorContext, BlogService } from '@/mcp/contracts'
import type { NextRequest } from 'next/server'

interface McpSession {
  transport: WebStandardStreamableHTTPServerTransport
  actor: ActorContext
  lastActive: number
}

// 内存多会话存储
const sessions = new Map<string, McpSession>()
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 分钟无活动过期

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(id)
    }
  }
}

// 服务实例：M05 真实读服务 + 开发阶段写桩服务（待 A 模块写服务完成后替换）
const readService = createReadBlogService()
const stubService = createStubService()
const services: BlogService = {
  ...stubService,
  ...readService,
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return match ? match[1] : null
}

/**
 * 校验请求的 Bearer Token，并在鉴权通过后返回对应的 ActorContext。
 * 在 A 模块数据库 MCPKeys 集合交付前，支持 MCP_DEV_TOKEN 或本地预置凭据。
 */
async function authenticateRequest(request: NextRequest, requestID: string): Promise<ActorContext | null> {
  const token = extractBearerToken(request)
  if (!token) return null

  const devToken = process.env.MCP_DEV_TOKEN || 'dev-mcp-token'
  if (token === devToken || token === 'admin-token') {
    return {
      userID: 1,
      role: 'admin',
      keyID: 1,
      requestID,
      source: 'mcp',
    }
  }

  if (token === 'author-token') {
    return {
      userID: 2,
      role: 'author',
      keyID: 2,
      requestID,
      source: 'mcp',
    }
  }

  return null
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleMCPRequest(request)
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleMCPRequest(request)
}

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

  // 1. 已有会话请求：通过 session-id 路由到对应的 transport
  if (sessionId) {
    const session = sessions.get(sessionId)
    if (!session) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session expired or not found' },
          id: null,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    session.lastActive = Date.now()
    return await session.transport.handleRequest(request as unknown as Request)
  }

  // 2. 新建会话初始化请求：必须通过 Bearer 鉴权
  const requestID = crypto.randomUUID()
  const actor = await authenticateRequest(request, requestID)

  if (!actor) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized: 缺少有效 Bearer 认证 Token' },
        id: null,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // 3. 鉴权通过：为该客户端创建独立的 Transport 与 McpServer 实例
  let createdSessionId = ''
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => {
      createdSessionId = crypto.randomUUID()
      return createdSessionId
    },
    enableJsonResponse: true,
  })

  const server = createMcpServer(actor, services)
  await server.connect(transport)

  const response = await transport.handleRequest(request as unknown as Request)

  if (createdSessionId) {
    sessions.set(createdSessionId, {
      transport,
      actor,
      lastActive: Date.now(),
    })
  }

  return response
}