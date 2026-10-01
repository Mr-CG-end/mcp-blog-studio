/**
 * MCP Blog Studio — /mcp Streamable HTTP 路由
 *
 * 状态模式：Transport 管理会话，初始化时分配 session ID。
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { createMcpServer } from '@/mcp/server'
import { createStubService } from '@/mcp/services/stub'
import type { ActorContext } from '@/mcp/contracts'
import type { NextRequest } from 'next/server'

// 缺省/桩 ActorContext，用于协议冒烟验证；后续由 Bearer 鉴权中间件填充
const defaultActor: ActorContext = {
  userID: 1,
  role: 'admin',
  keyID: 1,
  requestID: 'dev-init',
  source: 'mcp',
}

// 单例
const service = createStubService()
const mcpServer = createMcpServer(defaultActor, service)
let transport: WebStandardStreamableHTTPServerTransport | null = null

async function getTransport(): Promise<WebStandardStreamableHTTPServerTransport> {
  if (!transport) {
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    })
    await mcpServer.connect(transport)
    console.log('[MCP] Transport initialized (stateful)')
  }
  return transport
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleMCPRequest(request)
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleMCPRequest(request)
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return handleMCPRequest(request)
}

async function handleMCPRequest(request: NextRequest): Promise<Response> {
  try {
    const t = await getTransport()
    return await t.handleRequest(request as unknown as Request)
  } catch (error) {
    console.error('[MCP] Request failed:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}