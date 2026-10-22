import { z } from 'zod'
import type { PageEnvironment, PageResult, PageTool } from './types'

const slug = z.string().min(1).max(120).refine((value) => value !== '.' && value !== '..' && !/[\s/\\?#\u0000-\u001f\u007f]/u.test(value), '非法 slug')
const id = z.number().int().positive().safe()
const pathResult = z.object({
  success: z.boolean(), message: z.string(),
  data: z.object({ path: z.string() }).nullable(), code: z.number().optional(),
})

class ToolFailure extends Error {
  constructor(readonly code: number, message: string) { super(message) }
}

export function createPageTools(env: PageEnvironment, lifecycle: AbortSignal): PageTool[] {
  const result = (data: { path?: string; headingID?: string }): PageResult<typeof data> => ({
    success: true, message: '页面操作已提交', data,
  })

  function navigate(path: string, signal: AbortSignal) {
    signal.throwIfAborted()
    const target = new URL(path, env.getURL())
    if (!path.startsWith('/') || path.startsWith('//') || target.origin !== env.getURL().origin)
      throw new ToolFailure(400, '仅允许本站导航')
    env.navigate(path)
    // Full document navigation can resolve as null in the native API. This is not a render receipt.
    return result({ path })
  }

  async function resolve(action: string, values: Record<string, string>, expected: string, signal: AbortSignal) {
    signal.throwIfAborted()
    const response = await env.fetch(`/api/webmcp?${new URLSearchParams({ action, ...values })}`, {
      credentials: 'same-origin', cache: 'no-store', signal,
    })
    const parsed = pathResult.safeParse(await response.json())
    signal.throwIfAborted()
    if (!parsed.success) throw new ToolFailure(502, '页面接口返回无效结果')
    const payload = parsed.data
    if (!response.ok || !payload.success || !payload.data)
      throw new ToolFailure(response.ok ? (payload.code || 500) : response.status, payload.message || '页面操作失败')
    if (payload.data.path !== expected) throw new ToolFailure(502, '页面接口返回非预期目标')
    return payload.data.path
  }

  function tool<S extends z.ZodType>(
    name: string,
    description: string,
    schema: S,
    properties: Record<string, unknown>,
    required: string[],
    execute: (input: z.output<S>, signal: AbortSignal) => Promise<PageResult<unknown>> | PageResult<unknown>,
  ): PageTool {
    return {
      name, description,
      inputSchema: { type: 'object', properties, required, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, context) => {
        // Chrome 150 supplies only input; newer versions also supply execution cancellation.
        const signal = context?.signal ? AbortSignal.any([lifecycle, context.signal]) : lifecycle
        try {
          signal.throwIfAborted()
          const parsed = schema.safeParse(input)
          if (!parsed.success) throw new ToolFailure(400, '参数无效，请检查字段、类型和范围')
          return JSON.stringify(await execute(parsed.data, signal))
        } catch (error) {
          const failure: PageResult<never> = {
            success: false,
            message: signal.aborted ? '操作已取消' : error instanceof ToolFailure ? error.message : '页面操作失败，请稍后重试',
            data: null,
            code: signal.aborted ? 499 : error instanceof ToolFailure ? error.code : 500,
          }
          return JSON.stringify(failure)
        }
      },
    }
  }

  const idProperty = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
  return [
    tool('set_search_query', '在本站搜索标题、摘要或正文，并打开实际搜索结果。空字符串清空搜索。',
      z.object({ query: z.string().max(200) }).strict(), { query: { type: 'string', maxLength: 200 } }, ['query'],
      ({ query }, signal) => navigate(`/search?${new URLSearchParams({ q: query.trim() })}`, signal)),
    tool('filter_posts', '按分类 slug 与页码浏览公开文章；省略分类保留当前分类，空字符串清除分类。',
      z.object({ categorySlug: z.union([slug, z.literal('')]).optional(), page: z.number().int().min(1).max(10000).optional() }).strict(),
      { categorySlug: { type: 'string', maxLength: 120 }, page: { type: 'integer', minimum: 1, maximum: 10000 } }, [],
      async ({ categorySlug, page = 1 }, signal) => {
        const current = env.getURL()
        const existingCategory = current.pathname.startsWith('/categories/')
          ? decodeURIComponent(current.pathname.slice('/categories/'.length))
          : current.pathname === '/posts' ? current.searchParams.get('categorySlug') || '' : ''
        const selected = categorySlug ?? existingCategory
        if (selected) {
          if (!slug.safeParse(selected).success) throw new ToolFailure(400, '非法分类')
          await resolve('category', { slug: selected }, `/posts?${new URLSearchParams({ categorySlug: selected })}`, signal)
        }
        return navigate(`/posts?${new URLSearchParams({ ...(selected ? { categorySlug: selected } : {}), page: String(page) })}`, signal)
      }),
    tool('open_post', '打开一篇公开且未回收的本站文章；不能打开私有草稿。',
      z.object({ slug }).strict(), { slug: { type: 'string', minLength: 1, maxLength: 120 } }, ['slug'],
      async ({ slug: value }, signal) => navigate(await resolve('post', { slug: value }, `/posts/${encodeURIComponent(value)}`, signal), signal)),
    tool('open_admin_panel', '打开本站后台；未登录时显示登录页，此工具不授予权限。',
      z.object({}).strict(), {}, [], (_, signal) => navigate('/admin', signal)),
    tool('open_post_editor', '使用当前后台登录会话打开有权编辑的文章；作者只能编辑自己的文章。',
      z.object({ id }).strict(), { id: idProperty }, ['id'],
      async ({ id: value }, signal) => navigate(await resolve('editor', { id: String(value) }, `/admin/collections/posts/${value}`, signal), signal)),
    tool('preview_post', '使用当前后台登录会话预览有权读取的文章，服务端再次验证权限。',
      z.object({ id }).strict(), { id: idProperty }, ['id'],
      async ({ id: value }, signal) => navigate(await resolve('preview', { id: String(value) }, `/next/webmcp-preview?id=${value}`, signal), signal)),
    tool('scroll_to_section', '滚动到当前文章正文中实际存在的标题 ID；不会滚动到正文外的元素。',
      z.object({ headingID: z.string().min(1).max(300) }).strict(), { headingID: { type: 'string', minLength: 1, maxLength: 300 } }, ['headingID'],
      ({ headingID }, signal) => {
        signal.throwIfAborted()
        const heading = env.document.getElementById(headingID)
        if (!heading || !/^H[1-6]$/.test(heading.tagName) || !heading.closest('[data-article-content]'))
          throw new ToolFailure(404, '当前文章中未找到此标题')
        heading.scrollIntoView({ behavior: 'instant', block: 'start' })
        return result({ headingID })
      }),
  ]
}
