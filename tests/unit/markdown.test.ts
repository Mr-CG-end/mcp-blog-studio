import { describe, expect, it } from 'vitest'
import { createMarkdownConverter } from '@/services/blog/markdown'
import { BlogError, toolFailure } from '@/mcp/errors'

const converter = createMarkdownConverter()

describe('实际 Posts 编辑器的 Markdown 转换', () => {
  it.each([
    '# 标题\n\n普通 **粗体** 与 *斜体*、`inline` 和 [链接](https://example.com)',
    '> 引用\n\n- 一\n    - 嵌套\n- 二\n\n1. 有序\n2. 列表\n\n---',
    '````ts\nconst code = "```"\n````',
    '',
  ])('受支持内容通过同一编辑器转换两次后语义稳定：%s', async (markdown) => {
    const first = await converter.fromMarkdown(markdown)
    const exported = await converter.toMarkdown(first.content)
    expect(exported.contentReplaceable, exported.warnings.join(';')).toBe(true)
    const second = await converter.fromMarkdown(exported.markdown)
    expect((await converter.toMarkdown(second.content)).markdown).toBe(exported.markdown)
  })

  it('媒体解析只接受注入解析器返回的既有 URL 和 alt', async () => {
    const media = { id: 42, url: 'https://example.com/media/image.png', alt: '图片' }
    const resolved = createMarkdownConverter({
      resolveMedia: async (urls) => (urls.includes(media.url) ? [media] : []),
    })
    const parsed = await resolved.fromMarkdown(`![图片](${media.url})`)
    expect(JSON.stringify(parsed.content)).toContain('"media":42')
    await expect(converter.fromMarkdown(`![图片](${media.url})`)).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
    })
    await expect(resolved.fromMarkdown(`![不同 alt](${media.url})`)).rejects.toMatchObject({
      code: 'UNSUPPORTED_CONTENT',
    })
    // Without a populated URL, reading is allowed but full replacement is blocked.
    expect((await resolved.toMarkdown(parsed.content)).contentReplaceable).toBe(false)
  })

  it.each(['banner', 'future-block'])('未知或不可逆区块 %s 拦截替换', async (blockType) => {
    const result = await converter.toMarkdown({
      root: {
        type: 'root',
        version: 1,
        children: [{ type: 'block', version: 2, fields: { blockType, content: 'secret' } }],
      },
    })
    expect(result.contentReplaceable).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it.each([
    '<script>alert(1)</script>',
    '[危险](javascript:alert(1))',
    '文字 ![图片](https://example.com/a.png)',
  ])('不支持的输入明确拒绝：%s', async (markdown) => {
    await expect(converter.fromMarkdown(markdown)).rejects.toMatchObject({
      code: 'UNSUPPORTED_CONTENT',
    })
  })

  it('代码块中的 HTML 保留为示例代码', async () => {
    const { content } = await converter.fromMarkdown('```html\n<script>alert(1)</script>\n```')
    expect((await converter.toMarkdown(content)).markdown).toContain('<script>alert(1)</script>')
  })

  it('业务错误映射但不泄露底层错误消息，输出错误归为服务端错误', () => {
    expect(
      toolFailure(Object.assign(new Error('sensitive SQL'), { code: 'VERSION_CONFLICT' }), 'req')
        .error.code,
    ).toBe('VERSION_CONFLICT')
    expect(toolFailure(new Error('sensitive SQL'), 'req').error.message).not.toContain('SQL')
    expect(toolFailure(new BlogError('NOT_FOUND', '文章不存在'), 'req').error.code).toBe(
      'NOT_FOUND',
    )
  })
})
