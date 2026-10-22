// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createPageTools } from '@/webmcp/tools'
import { registerPageTools } from '@/webmcp/register'
import type { PageEnvironment, WebMCPContext } from '@/webmcp/types'

function setup(url = 'https://blog.example/posts') {
  const navigate = vi.fn()
  const fetcher = vi.fn<typeof fetch>()
  const environment: PageEnvironment = {
    document,
    getURL: () => new URL(url),
    navigate,
    fetch: fetcher,
  }
  const controller = new AbortController()
  const tools = createPageTools(environment, controller.signal)
  const execute = async (name: string, input: unknown, signal = new AbortController().signal) => {
    const tool = tools.find((entry) => entry.name === name)
    if (!tool) throw new Error('Missing tool')
    return JSON.parse(await tool.execute(input, { signal })) as {
      success: boolean; code?: number; data: { path?: string } | null
    }
  }
  return { tools, execute, navigate, fetcher, controller }
}

describe('WebMCP page tools', () => {
  it('supports native Chrome 150 callbacks without an execution context', async () => {
    const { tools, navigate } = setup()
    const tool = tools.find((entry) => entry.name === 'open_admin_panel')!
    const invoke = tool.execute as (input: unknown) => Promise<string>
    expect(JSON.parse(await invoke({}))).toMatchObject({ success: true })
    expect(navigate).toHaveBeenCalledWith('/admin')
  })
  it('registers seven page actions and safely encodes search text', async () => {
    const { tools, execute, navigate } = setup()
    expect(tools).toHaveLength(7)
    expect((await execute('set_search_query', { query: '中文 & #测试' })).success).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/search?q=%E4%B8%AD%E6%96%87+%26+%23%E6%B5%8B%E8%AF%95')
  })

  it('validates unknown fields, ids and pagination before navigation or requests', async () => {
    const { execute, navigate, fetcher } = setup()
    for (const [name, input] of [
      ['open_post_editor', { id: 0 }],
      ['preview_post', { id: '1' }],
      ['filter_posts', { page: 1.5 }],
      ['open_admin_panel', { url: 'https://evil.example' }],
      ['set_search_query', { query: 'a'.repeat(201) }],
      ['open_post', { slug: '..' }],
      ['open_post', { slug: 'a/b' }],
    ] as const) expect((await execute(name, input)).code).toBe(400)
    expect(navigate).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('keeps the selected category while paging and supports clearing it', async () => {
    const { execute, navigate, fetcher } = setup('https://blog.example/posts?categorySlug=typescript&page=1')
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: '/posts?categorySlug=typescript' } }))
    await execute('filter_posts', { page: 2 })
    expect(navigate).toHaveBeenLastCalledWith('/posts?categorySlug=typescript&page=2')
    await execute('filter_posts', { categorySlug: '', page: 1 })
    expect(navigate).toHaveBeenLastCalledWith('/posts?page=1')
  })

  it('resolves public targets and refuses external or mismatched redirect paths', async () => {
    const { execute, fetcher, navigate } = setup()
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: 'https://evil.example/' } }))
    expect((await execute('open_post', { slug: 'hello' })).success).toBe(false)
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: '/admin' } }))
    expect((await execute('open_post', { slug: 'hello' })).success).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: '/posts/hello' } }))
    expect((await execute('open_post', { slug: 'hello' })).success).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/posts/hello')
    expect(fetcher).toHaveBeenLastCalledWith('/api/webmcp?action=post&slug=hello', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }))
  })

  it('keeps category selection when invoked from its existing category page', async () => {
    const { execute, fetcher, navigate } = setup('https://blog.example/categories/typescript')
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: '/posts?categorySlug=typescript' } }))
    expect((await execute('filter_posts', { page: 2 })).success).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/posts?categorySlug=typescript&page=2')
  })

  it('uses URLSearchParams encoding for category punctuation consistently', async () => {
    const { execute, fetcher, navigate } = setup()
    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: '', data: { path: '/posts?categorySlug=a%7Eb%21' } }))
    expect((await execute('filter_posts', { categorySlug: 'a~b!' })).success).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/posts?categorySlug=a%7Eb%21&page=1')
  })

  it('does not navigate after cancellation or page disposal, including pending lookups', async () => {
    const { execute, fetcher, navigate, controller } = setup()
    let complete: ((response: Response) => void) | undefined
    fetcher.mockImplementationOnce(() => new Promise<Response>((resolve) => { complete = resolve }))
    const pending = execute('open_post', { slug: 'hello' })
    controller.abort()
    complete?.(Response.json({ success: true, message: '', data: { path: '/posts/hello' } }))
    expect((await pending).code).toBe(499)
    expect((await execute('open_admin_panel', {})).code).toBe(499)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('returns permission errors and safe failures without navigating', async () => {
    const { execute, fetcher, navigate } = setup()
    fetcher.mockResolvedValueOnce(Response.json({ success: false, message: '请先登录', data: null, code: 401 }, { status: 401 }))
    expect((await execute('preview_post', { id: 1 })).code).toBe(401)
    fetcher.mockRejectedValueOnce(new Error('private backend connection details'))
    const result = await execute('open_post_editor', { id: 1 })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result)).not.toContain('private backend')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('scrolls only to a heading inside the current article, including unicode ids', async () => {
    document.body.innerHTML = '<h2 id="outside">outside</h2><article data-article-content><h2 id="中文">正文</h2><div id="not-heading"></div></article>'
    const heading = document.getElementById('中文')!
    heading.scrollIntoView = vi.fn()
    const { execute } = setup('https://blog.example/posts/hello')
    expect((await execute('scroll_to_section', { headingID: 'outside' })).code).toBe(404)
    expect((await execute('scroll_to_section', { headingID: 'not-heading' })).code).toBe(404)
    expect((await execute('scroll_to_section', { headingID: '中文' })).success).toBe(true)
    expect(heading.scrollIntoView).toHaveBeenCalled()
  })
})

describe('WebMCP registration lifecycle', () => {
  it('does nothing on unsupported browsers and removes partial registrations on failure', async () => {
    const controller = new AbortController()
    await registerPageTools(undefined, [], controller)
    const registerTool = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('unsupported'))
    const context: WebMCPContext = { registerTool }
    const { tools } = setup()
    await expect(registerPageTools(context, tools, controller)).rejects.toThrow('unsupported')
    expect(controller.signal.aborted).toBe(true)
    expect(registerTool).toHaveBeenCalledTimes(2)
  })

  it('stops registering when disposed during an asynchronous registration', async () => {
    const controller = new AbortController()
    const registerTool = vi.fn().mockImplementation(async () => { controller.abort() })
    const { tools } = setup()
    await registerPageTools({ registerTool }, tools, controller)
    expect(registerTool).toHaveBeenCalledTimes(1)
    expect(registerTool).toHaveBeenCalledWith(tools[0], { signal: controller.signal })
  })
})
