import { describe, expect, it } from 'vitest'
import { markdownConverter } from '@/services/blog/markdown'

describe('M07: MarkdownConverter', () => {
  it('支持普通段落与行内样式的双向往返', async () => {
    const md = '这是**粗体**，这是*斜体*，这是~~删除线~~，这是`const a = 1`，以及[博客链接](https://example.com)。'
    const { content } = await markdownConverter.fromMarkdown(md)
    expect(content).toBeDefined()

    const inspection = await markdownConverter.inspect(content)
    expect(inspection.contentReplaceable).toBe(true)
    expect(inspection.warnings).toHaveLength(0)

    const result = await markdownConverter.toMarkdown(content)
    expect(result.contentReplaceable).toBe(true)
    expect(result.markdown).toContain('**粗体**')
    expect(result.markdown).toContain('*斜体*')
    expect(result.markdown).toContain('~~删除线~~')
    expect(result.markdown).toContain('`const a = 1`')
    expect(result.markdown).toContain('[博客链接](https://example.com)')
  })

  it('支持标题、引用、列表与分割线', async () => {
    const md = `# 一级标题

## 二级标题

> 这是一个引述段落

- 无序项一
- 无序项二

1. 有序项一
2. 有序项二

---`

    const { content } = await markdownConverter.fromMarkdown(md)
    const result = await markdownConverter.toMarkdown(content)

    expect(result.markdown).toContain('# 一级标题')
    expect(result.markdown).toContain('## 二级标题')
    expect(result.markdown).toContain('> 这是一个引述段落')
    expect(result.markdown).toContain('- 无序项一')
    expect(result.markdown).toContain('1. 有序项一')
    expect(result.markdown).toContain('---')
  })

  it('支持代码块与语言标记无损互转', async () => {
    const md = `\`\`\`typescript
interface User {
  id: number
  name: string
}
\`\`\``

    const { content } = await markdownConverter.fromMarkdown(md)
    const result = await markdownConverter.toMarkdown(content)

    expect(result.contentReplaceable).toBe(true)
    expect(result.markdown).toContain('```typescript')
    expect(result.markdown).toContain('interface User {')
    expect(result.markdown).toContain('```')
  })

  it('支持图片媒体块识别与转换', async () => {
    const md = '![封面配图](https://example.com/cover.webp)'
    const { content } = await markdownConverter.fromMarkdown(md)
    const result = await markdownConverter.toMarkdown(content)

    expect(result.contentReplaceable).toBe(true)
    expect(result.markdown).toBe('![封面配图](https://example.com/cover.webp)')
  })

  it('当文章包含 Banner 横幅区块时，标记不可整体覆盖并输出警告', async () => {
    const contentWithBanner = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '前置说明' }],
          },
          {
            type: 'block',
            fields: {
              blockType: 'banner',
              style: 'warning',
              content: {},
            },
          },
        ],
      },
    }

    const inspection = await markdownConverter.inspect(contentWithBanner)
    expect(inspection.contentReplaceable).toBe(false)
    expect(inspection.warnings.some((w) => w.includes('Banner'))).toBe(true)

    const result = await markdownConverter.toMarkdown(contentWithBanner)
    expect(result.contentReplaceable).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.markdown).toContain('前置说明')
  })

  it('当文章包含表格或未知节点时，正确拦截不可替换性', async () => {
    const contentWithTable = {
      root: {
        type: 'root',
        children: [
          {
            type: 'table',
            children: [],
          },
        ],
      },
    }

    const inspection = await markdownConverter.inspect(contentWithTable)
    expect(inspection.contentReplaceable).toBe(false)
    expect(inspection.warnings.some((w) => w.includes('表格'))).toBe(true)
  })

  it('处理空字符串或边界输入时保持健壮', async () => {
    const emptyResult = await markdownConverter.fromMarkdown('')
    expect(emptyResult.content).toBeDefined()

    const toMdResult = await markdownConverter.toMarkdown(emptyResult.content)
    expect(toMdResult.markdown).toBe('')
    expect(toMdResult.contentReplaceable).toBe(true)
  })
})
