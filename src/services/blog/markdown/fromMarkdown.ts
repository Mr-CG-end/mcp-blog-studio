import type {
  LexicalBlockNode,
  LexicalContent,
  LexicalHeadingNode,
  LexicalInlineNode,
  LexicalListItemNode,
  LexicalListNode,
  LexicalParagraphNode,
} from './types'

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2
const FORMAT_STRIKETHROUGH = 4
const FORMAT_CODE = 16

/**
 * 解析行内文本格式（粗体、斜体、删除线、行内代码、链接）。
 */
function parseInline(text: string): LexicalInlineNode[] {
  const nodes: LexicalInlineNode[] = []
  if (!text) return nodes

  // 匹配标记：链接、行内代码、粗体、斜体、删除线
  const pattern = /(!?\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index)
      if (plain) {
        nodes.push({ type: 'text', text: plain, format: 0, version: 1 })
      }
    }

    const [full, , linkText, linkUrl, codeText, boldText, italicText, strikeText] = match

    if (linkText !== undefined && linkUrl !== undefined) {
      if (full.startsWith('!')) {
        // 图片行内节点直接作为文本展示，或保留
        nodes.push({ type: 'text', text: full, format: 0, version: 1 })
      } else {
        nodes.push({
          type: 'link',
          fields: { url: linkUrl, newTab: false },
          children: parseInline(linkText),
          version: 1,
        })
      }
    } else if (codeText !== undefined) {
      nodes.push({ type: 'text', text: codeText, format: FORMAT_CODE, version: 1 })
    } else if (boldText !== undefined) {
      nodes.push({ type: 'text', text: boldText, format: FORMAT_BOLD, version: 1 })
    } else if (italicText !== undefined) {
      nodes.push({ type: 'text', text: italicText, format: FORMAT_ITALIC, version: 1 })
    } else if (strikeText !== undefined) {
      nodes.push({ type: 'text', text: strikeText, format: FORMAT_STRIKETHROUGH, version: 1 })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex)
    if (trailing) {
      nodes.push({ type: 'text', text: trailing, format: 0, version: 1 })
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'text', text, format: 0, version: 1 })
  }

  return nodes
}

function createParagraph(text: string): LexicalParagraphNode {
  return {
    type: 'paragraph',
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    children: parseInline(text),
  }
}

/**
 * 将 Markdown 文本还原为 Lexical AST 结构。
 */
export async function convertMarkdownToLexical(markdown: string): Promise<{ content: LexicalContent }> {
  if (!markdown || !markdown.trim()) {
    return {
      content: {
        root: {
          type: 'root',
          format: '',
          indent: 0,
          version: 1,
          direction: null,
          children: [createParagraph('')],
        },
      },
    }
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const children: LexicalBlockNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 1. 空行跳过
    if (!trimmed) {
      i++
      continue
    }

    // 2. 代码块：```lang ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'text'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // 跳过闭合 ```

      children.push({
        type: 'block',
        version: 1,
        fields: {
          blockType: 'code',
          language,
          code: codeLines.join('\n'),
        },
      })
      continue
    }

    // 3. 分割线：---, ***, ___
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      children.push({ type: 'horizontalrule', version: 1 })
      i++
      continue
    }

    // 4. 独立图片块：![alt](url)
    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed)
    if (imageMatch) {
      children.push({
        type: 'block',
        version: 1,
        fields: {
          blockType: 'mediaBlock',
          media: {
            alt: imageMatch[1] || '',
            url: imageMatch[2] || '',
          },
        },
      })
      i++
      continue
    }

    // 5. 标题：# 到 ######
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      const headingTag = `h${level}` as LexicalHeadingNode['tag']
      children.push({
        type: 'heading',
        tag: headingTag,
        direction: null,
        format: '',
        indent: 0,
        version: 1,
        children: parseInline(headingMatch[2]),
      })
      i++
      continue
    }

    // 6. 引用块：> ...
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      children.push({
        type: 'quote',
        direction: null,
        format: '',
        indent: 0,
        version: 1,
        children: parseInline(quoteLines.join('\n')),
      })
      continue
    }

    // 7. 列表（有序或无序）
    const isUnordered = /^[-*+]\s+(.+)$/.test(trimmed)
    const isOrdered = /^\d+\.\s+(.+)$/.test(trimmed)
    if (isUnordered || isOrdered) {
      const listType = isOrdered ? 'number' : 'bullet'
      const tag = isOrdered ? 'ol' : 'ul'
      const listItems: LexicalListItemNode[] = []
      let itemValue = 1

      while (i < lines.length) {
        const itemLine = lines[i].trim()
        const match = isOrdered ? /^\d+\.\s+(.+)$/.exec(itemLine) : /^[-*+]\s+(.+)$/.exec(itemLine)
        if (!match) break

        listItems.push({
          type: 'listitem',
          value: itemValue++,
          version: 1,
          children: parseInline(match[1]),
        })
        i++
      }

      children.push({
        type: 'list',
        listType,
        tag,
        start: 1,
        version: 1,
        children: listItems,
      } as LexicalListNode)
      continue
    }

    // 8. 普通段落：收集连续非空非特殊行
    const paragraphLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^(\*\*\*|---|___)$/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i])
      i++
    }

    children.push(createParagraph(paragraphLines.join('\n')))
  }

  return {
    content: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: null,
        children,
      },
    },
  }
}
