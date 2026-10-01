import { describe, expect, it } from 'vitest'
import { toLexical } from '../../scripts/yohaku/lexical.mjs'

describe('Yohaku HTML conversion', () => {
  it('keeps headings and paragraphs inside a details block as editable blocks', () => {
    const result = toLexical(
      '<details><summary>个人标签</summary><div><h2>性格</h2><p>第一段</p><p>第二段</p></div></details>',
    ) as { root: { children: { type: string }[] } }
    expect(result.root.children.map((node) => node.type)).toEqual([
      'paragraph',
      'heading',
      'paragraph',
      'paragraph',
    ])
  })
  it('preserves nested headings, formatted text and mapped internal links without scripts', () => {
    const result = JSON.stringify(
      toLexical(
        '<h2>标题</h2><h3>子标题</h3><p>正文<strong>加粗</strong><a href="/posts/tech/test">链接</a></p><script>evil()</script>',
        { links: new Map([['https://innei.in/posts/tech/test', '/posts/test']]) },
      ),
    )
    expect(result).toContain('"tag":"h2"')
    expect(result).toContain('"tag":"h3"')
    expect(result).toContain('"format":1')
    expect(result).toContain('"url":"/posts/test"')
    expect(result).not.toContain('evil')
  })
  it('preserves table spans, code whitespace and media references', () => {
    const result = JSON.stringify(
      toLexical(
        '<table><tr><th colspan="2">表头</th></tr><tr><td>一</td><td>二</td></tr></table><pre><code class="language-js">  const a = 1;\n</code></pre><img src="/photo.png">',
        { media: new Map([['https://innei.in/photo.png', 42]]) },
      ),
    )
    expect(result).toContain('"colSpan":2')
    expect(result).toContain('"blockType":"code"')
    expect(result).toContain('  const a = 1;\\n')
    expect(result).toContain('"media":42')
  })
  it('records unavailable embeds and rejects executable links', () => {
    const omissions: unknown[] = []
    const result = JSON.stringify(
      toLexical(
        '<div class="rich-block-anchor">Whiteboard</div><p><a href="javascript:evil()">保留文本</a></p>',
        { omissions },
      ),
    )
    expect(omissions).toHaveLength(1)
    expect(result).toContain('保留文本')
    expect(result).not.toContain('javascript:')
    expect(result).not.toContain('Whiteboard')
  })
})

it('retains code inside lists, clickable images and mapped fragments', () => {
  const result = JSON.stringify(
    toLexical(
      '<ol><li>步骤<div><pre><code>line 1\n  line 2</code></pre></div></li></ol><button><img src="/photo.png"></button><a href="/posts/tech/test#part">标题</a>',
      {
        media: new Map([['https://innei.in/photo.png', 42]]),
        links: new Map([['https://innei.in/posts/tech/test', '/posts/test']]),
      },
    ),
  )
  expect(result).toContain('"blockType":"code"')
  expect(result).toContain('line 1\\n  line 2')
  expect(result).toContain('"media":42')
  expect(result).toContain('"url":"/posts/test#part"')
})
