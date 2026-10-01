/**
 * MCP Blog Studio — 6 个写工具注册
 *
 * 负责：create_post、update_post、publish_post、unpublish_post、trash_post、restore_post
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { BlogService, ToolResult, BlogErrorCode } from '../contracts'

/** 写工具定义 */
const WRITE_TOOLS = [
  {
    name: 'create_post',
    description: '创建文章草稿。返回创建的 PostSummary，owner 为当前用户。幂等：相同 requestId 只创建一篇。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requestId: { type: 'string', description: '幂等 ID（UUID），相同 ID 相同输入只创建一篇' },
        title: { type: 'string', description: '文章标题，1–200 字符' },
        markdown: { type: 'string', description: '正文 Markdown，1–100000 字符' },
        summary: { type: 'string', description: '摘要，最多 500 字符' },
        categoryIDs: { type: 'array', items: { type: 'number' }, description: '分类 ID 列表' },
        heroImageID: { type: 'number', description: '封面图片 ID' },
        slug: { type: 'string', description: '自定义 slug，最多 120 字符；不提供则自动生成' },
      },
      required: ['requestId', 'title', 'markdown'],
    },
  },
  {
    name: 'update_post',
    description: '修改文章。至少提供一个修改字段。不能修改 slug、owner、状态。已发布文章保存后立即生效。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID' },
        expectedRevision: { type: 'number', description: '预期版本号，冲突则拒绝' },
        title: { type: 'string', description: '新标题' },
        summary: { type: 'string', description: '新摘要，传 null 清空' },
        markdown: { type: 'string', description: '新正文 Markdown' },
        categoryIDs: { type: 'array', items: { type: 'number' }, description: '分类 ID 列表，传 [] 清空' },
        heroImageID: { type: 'number', description: '封面图片 ID，传 null 移除' },
      },
      required: ['id', 'expectedRevision'],
    },
  },
  {
    name: 'publish_post',
    description: '发布文章。草稿 → 已发布。校验完整内容与引用。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID' },
        expectedRevision: { type: 'number', description: '预期版本号' },
      },
      required: ['id', 'expectedRevision'],
    },
  },
  {
    name: 'unpublish_post',
    description: '下架文章。已发布 → 草稿。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID' },
        expectedRevision: { type: 'number', description: '预期版本号' },
      },
      required: ['id', 'expectedRevision'],
    },
  },
  {
    name: 'trash_post',
    description: '将文章移入回收站。草稿/已发布 → 回收站。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID' },
        expectedRevision: { type: 'number', description: '预期版本号' },
      },
      required: ['id', 'expectedRevision'],
    },
  },
  {
    name: 'restore_post',
    description: '从回收站恢复文章。回收站 → 草稿（绝不直接恢复为已发布）。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: '文章 ID' },
        expectedRevision: { type: 'number', description: '预期版本号' },
      },
      required: ['id', 'expectedRevision'],
    },
  },
]

export function getWriteToolDefinitions(): typeof WRITE_TOOLS {
  return WRITE_TOOLS
}

export function getWriteToolHandlers(service: BlogService): Map<string, (args: Record<string, unknown>) => Promise<ToolResult>> {
  const handlers = new Map<string, (args: Record<string, unknown>) => Promise<ToolResult>>()
  const ctx = { userID: 1, role: 'admin' as const, keyID: 1, requestID: 'stub', source: 'mcp' as const }

  handlers.set('create_post', async (args) => {
    // 参数校验
    if (!args.title || typeof args.title !== 'string' || args.title.length < 1 || args.title.length > 200) {
      return errorResult('VALIDATION_ERROR', '标题为必填，1–200 字符')
    }
    if (!args.markdown || typeof args.markdown !== 'string' || args.markdown.length < 1 || args.markdown.length > 100000) {
      return errorResult('VALIDATION_ERROR', '正文为必填，1–100000 字符')
    }
    if (!args.requestId || typeof args.requestId !== 'string') {
      return errorResult('VALIDATION_ERROR', 'requestId 为必填 UUID')
    }
    try {
      const result = await service.createPost(ctx, {
        requestId: args.requestId as string,
        title: args.title as string,
        markdown: args.markdown as string,
        summary: args.summary as string | undefined,
        categoryIDs: args.categoryIDs as number[] | undefined,
        heroImageID: args.heroImageID as number | undefined,
        slug: args.slug as string | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  handlers.set('update_post', async (args) => {
    if (!args.id || typeof args.id !== 'number') {
      return errorResult('VALIDATION_ERROR', 'id 为必填数字')
    }
    if (!args.expectedRevision || typeof args.expectedRevision !== 'number') {
      return errorResult('VALIDATION_ERROR', 'expectedRevision 为必填正整数')
    }
    // 至少提供一个修改字段
    const hasChanges = ['title', 'summary', 'markdown', 'categoryIDs', 'heroImageID'].some(
      (k) => args[k] !== undefined,
    )
    if (!hasChanges) {
      return errorResult('VALIDATION_ERROR', '至少提供一个修改字段')
    }
    try {
      const result = await service.updatePost(ctx, {
        id: args.id as number,
        expectedRevision: args.expectedRevision as number,
        title: args.title as string | undefined,
        summary: args.summary as string | null | undefined,
        markdown: args.markdown as string | undefined,
        categoryIDs: args.categoryIDs as number[] | undefined,
        heroImageID: args.heroImageID as number | null | undefined,
      })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  handlers.set('publish_post', async (args) => {
    if (!args.id || typeof args.id !== 'number') return errorResult('VALIDATION_ERROR', 'id 为必填数字')
    if (!args.expectedRevision || typeof args.expectedRevision !== 'number') return errorResult('VALIDATION_ERROR', 'expectedRevision 为必填正整数')
    try {
      const result = await service.publishPost(ctx, { id: args.id as number, expectedRevision: args.expectedRevision as number })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  handlers.set('unpublish_post', async (args) => {
    if (!args.id || typeof args.id !== 'number') return errorResult('VALIDATION_ERROR', 'id 为必填数字')
    if (!args.expectedRevision || typeof args.expectedRevision !== 'number') return errorResult('VALIDATION_ERROR', 'expectedRevision 为必填正整数')
    try {
      const result = await service.unpublishPost(ctx, { id: args.id as number, expectedRevision: args.expectedRevision as number })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  handlers.set('trash_post', async (args) => {
    if (!args.id || typeof args.id !== 'number') return errorResult('VALIDATION_ERROR', 'id 为必填数字')
    if (!args.expectedRevision || typeof args.expectedRevision !== 'number') return errorResult('VALIDATION_ERROR', 'expectedRevision 为必填正整数')
    try {
      const result = await service.trashPost(ctx, { id: args.id as number, expectedRevision: args.expectedRevision as number })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  handlers.set('restore_post', async (args) => {
    if (!args.id || typeof args.id !== 'number') return errorResult('VALIDATION_ERROR', 'id 为必填数字')
    if (!args.expectedRevision || typeof args.expectedRevision !== 'number') return errorResult('VALIDATION_ERROR', 'expectedRevision 为必填正整数')
    try {
      const result = await service.restorePost(ctx, { id: args.id as number, expectedRevision: args.expectedRevision as number })
      return { ok: true, data: result, requestId: 'stub' }
    } catch (e: unknown) {
      return toError(e)
    }
  })

  return handlers
}

function errorResult(code: BlogErrorCode, message: string): ToolResult {
  return { ok: false, error: { code, message }, requestId: 'stub' }
}

function toError(e: unknown): ToolResult {
  const err = e as { code?: string; message?: string }
  return {
    ok: false,
    error: { code: (err.code as BlogErrorCode) || 'INTERNAL_ERROR', message: err.message || '内部错误' },
    requestId: 'stub',
  }
}