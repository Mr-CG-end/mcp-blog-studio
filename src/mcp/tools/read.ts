/**
 * MCP Blog Studio — 6 个读工具注册
 *
 * 负责：get_current_user、list_posts、get_post、search_posts、list_categories、list_media
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { BlogService, ToolResult } from '../contracts'

/** 工具定义列表 */
const READ_TOOLS = [
  {
    name: 'get_current_user',
    description: '获取当前认证用户的信息和权限',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_posts',
    description: '获取文章列表，支持按状态和分类筛选',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number', description: '页码，默认 1' },
        limit: { type: 'number', description: '每页数量，默认 12，最大 50' },
        state: {
          type: 'string',
          enum: ['draft', 'published', 'trashed'],
          description: '按状态筛选，默认排除回收站',
        },
        categoryID: { type: 'number', description: '按分类 ID 筛选' },
      },
      required: [],
    },
  },
  {
    name: 'get_post',
    description: '获取单篇文章详情（含正文 Markdown）',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID（与 slug 二选一）' },
        slug: { type: 'string', description: '文章 slug（与 id 二选一），最长 120 字符' },
      },
      required: [],
    },
  },
  {
    name: 'search_posts',
    description: '搜索文章（标题/摘要/正文），支持中文',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '搜索关键词，1–200 字符' },
        page: { type: 'number', description: '页码，默认 1' },
        limit: { type: 'number', description: '每页数量，默认 12，最大 50' },
        state: {
          type: 'string',
          enum: ['draft', 'published', 'trashed'],
          description: '按状态筛选',
        },
        categoryID: { type: 'number', description: '按分类 ID 筛选' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_categories',
    description: '获取分类列表',
    inputSchema: {
      type: 'object' as const,
      properties: {
        page: { type: 'number', description: '页码，默认 1' },
        limit: { type: 'number', description: '每页数量，默认 50，最大 100' },
      },
      required: [],
    },
  },
  {
    name: 'list_media',
    description: '获取媒体文件列表（图片等）',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '按替代文本搜索' },
        page: { type: 'number', description: '页码，默认 1' },
        limit: { type: 'number', description: '每页数量，默认 50，最大 100' },
      },
      required: [],
    },
  },
]

/** 工具名 → 处理函数 */
type ToolHandler = (args: Record<string, unknown>, ctx: { user?: { id: number; role: string } }) => Promise<ToolResult>

export function registerReadTools(server: Server, service: BlogService): void {
  // 构建工具名 → 处理函数的映射
  const handlers = new Map<string, ToolHandler>()

  handlers.set('get_current_user', async (_args) => {
    // 桩实现：返回固定用户
    return {
      ok: true,
      data: { id: 1, name: '桩用户', role: 'admin', capabilities: ['read:all', 'write:all'] },
      requestId: 'stub',
    }
  })

  handlers.set('list_posts', async (args) => {
    const result = await service.listPosts(
      stubContext(),
      {
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
        state: args.state as 'draft' | 'published' | 'trashed' | undefined,
        categoryID: args.categoryID as number | undefined,
      },
    )
    return { ok: true, data: result, requestId: 'stub' }
  })

  handlers.set('get_post', async (args) => {
    if (!args.id && !args.slug) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: '必须提供 id 或 slug' },
        requestId: 'stub',
      }
    }
    if (args.id && args.slug) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'id 和 slug 只能提供一个' },
        requestId: 'stub',
      }
    }
    try {
      const result = await service.getPost(stubContext(), {
        id: args.id as number | undefined,
        slug: args.slug as string | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      return {
        ok: false,
        error: { code: (err.code as any) || 'NOT_FOUND', message: err.message || '文章不存在' },
        requestId: 'stub',
      }
    }
  })

  handlers.set('search_posts', async (args) => {
    if (!args.query || typeof args.query !== 'string' || args.query.length < 1) {
      return {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'query 为必填，1–200 字符' },
        requestId: 'stub',
      }
    }
    const result = await service.searchPosts(stubContext(), {
      query: args.query as string,
      page: args.page as number | undefined,
      limit: args.limit as number | undefined,
      state: args.state as 'draft' | 'published' | 'trashed' | undefined,
      categoryID: args.categoryID as number | undefined,
    })
    return { ok: true, data: result, requestId: 'stub' }
  })

  handlers.set('list_categories', async (args) => {
    const result = await service.listCategories(stubContext(), {
      page: args.page as number | undefined,
      limit: args.limit as number | undefined,
    })
    return { ok: true, data: result, requestId: 'stub' }
  })

  handlers.set('list_media', async (args) => {
    const result = await service.listMedia(stubContext(), {
      query: args.query as string | undefined,
      page: args.page as number | undefined,
      limit: args.limit as number | undefined,
    })
    return { ok: true, data: result, requestId: 'stub' }
  })

  // 注册 tools/list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: READ_TOOLS }
  })

  // 注册 tools/call handler（读工具部分）
  const originalHandler = server.setRequestHandler.bind(server)
  // 注意：CallToolRequestSchema 在 server.ts 中综合注册
  // 这里使用额外的 setRequestHandler 调用会被覆盖，所以改为直接返回工具列表
}

/**
 * 注册 tools/call 请求处理器（组合读写）
 * 在 server.ts 的 createMCPServer 中统一处理
 */
export function getReadToolHandlers(service: BlogService): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>()

  handlers.set('get_current_user', async (_args, _ctx) => {
    return {
      ok: true,
      data: { id: _ctx?.user?.id || 1, name: '桩用户', role: _ctx?.user?.role || 'admin', capabilities: [] },
      requestId: 'stub',
    }
  })

  handlers.set('list_posts', async (args) => {
    try {
      const result = await service.listPosts(stubContext(), {
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
        state: args.state as any,
        categoryID: args.categoryID as number | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toErrorResult(e)
    }
  })

  handlers.set('get_post', async (args) => {
    if (!args.id && !args.slug) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: '必须提供 id 或 slug' }, requestId: 'stub' }
    }
    if (args.id && args.slug) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'id 和 slug 只能提供一个' }, requestId: 'stub' }
    }
    try {
      const result = await service.getPost(stubContext(), {
        id: args.id as number | undefined,
        slug: args.slug as string | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toErrorResult(e)
    }
  })

  handlers.set('search_posts', async (args) => {
    if (!args.query || typeof args.query !== 'string' || args.query.length < 1 || args.query.length > 200) {
      return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'query 为必填，1–200 字符' }, requestId: 'stub' }
    }
    try {
      const result = await service.searchPosts(stubContext(), {
        query: args.query as string,
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
        state: args.state as any,
        categoryID: args.categoryID as number | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toErrorResult(e)
    }
  })

  handlers.set('list_categories', async (args) => {
    try {
      const result = await service.listCategories(stubContext(), {
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toErrorResult(e)
    }
  })

  handlers.set('list_media', async (args) => {
    try {
      const result = await service.listMedia(stubContext(), {
        query: args.query as string | undefined,
        page: args.page as number | undefined,
        limit: args.limit as number | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toErrorResult(e)
    }
  })

  return handlers
}

/** 桩上下文 */
function stubContext() {
  return { userID: 1, role: 'admin' as const, keyID: 1, requestID: 'stub', source: 'mcp' as const }
}

/** 错误转换为 ToolResult */
function toErrorResult(e: unknown): ToolResult {
  const err = e as { code?: string; message?: string }
  return {
    ok: false,
    error: { code: (err.code as any) || 'INTERNAL_ERROR', message: err.message || '内部错误' },
    requestId: 'stub',
  }
}

/** 获取读工具定义列表 */
export function getReadToolDefinitions(): typeof READ_TOOLS {
  return READ_TOOLS
}