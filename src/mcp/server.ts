import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ActorContext, BlogService } from './contracts'
import { registerReadTools } from './tools/read'
import { registerWriteTools } from './tools/write'

/** A fresh server per HTTP request: no shared actor or in-memory authentication session. */
export function createMcpServer(actor: ActorContext, services: BlogService) {
  const server = new McpServer({ name: 'mcp-blog-studio', version: '0.1.0' })
  registerReadTools(server, services, actor)
  registerWriteTools(server, services, actor)
  return server
}
