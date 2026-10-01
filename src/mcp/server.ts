/**
 * MCP Blog Studio — MCP Server 注册入口
 *
 * 创建 MCP Server 实例，通过 ListToolsRequestSchema 和 CallToolRequestSchema
 * 注册所有 12 个工具。读工具和写工具各自独立注册函数，便于双人并行开发。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { BlogService, ToolResult } from './contracts'
import { getReadToolDefinitions, getReadToolHandlers } from './tools/read'
import { getWriteToolDefinitions, getWriteToolHandlers } from './tools/write'

export function createMCPServer(service: BlogService): Server {
  const server = new Server(
    {
      name: 'MCP Blog Studio',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // 合并所有工具定义
  const allToolDefs = [...getReadToolDefinitions(), ...getWriteToolDefinitions()]

  // 合并所有工具处理器
  const allHandlers = new Map<string, (args: Record<string, unknown>) => Promise<ToolResult>>()
  for (const [name, handler] of getReadToolHandlers(service)) {
    allHandlers.set(name, handler as any)
  }
  for (const [name, handler] of getWriteToolHandlers(service)) {
    allHandlers.set(name, handler)
  }

  // 注册 tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allToolDefs }
  })

  // 注册 tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const handler = allHandlers.get(name)
    if (!handler) {
      return {
        content: [{ type: 'text', text: `未知工具: ${name}` }],
        isError: true,
      }
    }

    try {
      const result = await handler(args || {})

      if (result.ok && result.data) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          _meta: { requestId: result.requestId },
        }
      }

      // 业务错误
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: result.error, requestId: result.requestId },
              null,
              2,
            ),
          },
        ],
        isError: true,
      }
    } catch (e: unknown) {
      const err = e as Error
      return {
        content: [{ type: 'text', text: `内部错误: ${err.message}` }],
        isError: true,
      }
    }
  })

  return server
}