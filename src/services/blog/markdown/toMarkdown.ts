import { inspectContent } from './inspect'
import type { Compatibility, LexicalContent, LexicalBlockNode, LexicalInlineNode } from './types'

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2
const FORMAT_STRIKETHROUGH = 4
const FORMAT_CODE = 16

function renderInline(node: LexicalInlineNode | unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>

  if (n.type === 'text') {
    let text = typeof n.text === 'string' ? n.text : ''
    const format = typeof n.format === 'number' ? n.format : 0

    if (text.length === 0) return ''

    if (format & FORMAT_CODE) {
      text = `\`${text}\``
    }
    if (format & FORMAT_BOLD) {
      text = `**${text}**`
    }
    if (format & FORMAT_ITALIC) {
      text = `*${text}*`
    }
    if (format & FORMAT_STRIKETHROUGH) {
      text = `~~${text}~~`
    }
    return text
  }

  if (n.type === 'link') {
    const fields = n.fields as Record<string, unknown> | undefined
    const url = typeof fields?.url === 'string' ? fields.url : ''
    const label = renderInlineList(n.children as LexicalInlineNode[]) || url
    return `[${label}](${url})`
  }

  return ''
}

function renderInlineList(children?: (LexicalInlineNode | unknown)[]): string {
  if (!Array.isArray(children)) return ''
  return children.map(renderInline).join('')
}

function headingLevel(tag?: string): number {
  switch (tag) {
    case 'h1': return 1
    case 'h2': return 2
    case 'h3': return 3
    case 'h4': return 4
    case 'h5': return 5
    case 'h6': return 6
    default: return 2
  }
}

function renderBlock(node: LexicalBlockNode | unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  const type = typeof n.type === 'string' ? n.type : ''

  switch (type) {
    case 'paragraph': {
      const text = renderInlineList(n.children as LexicalInlineNode[])
      return text.trim().length > 0 ? `${text}\n\n` : '\n'
    }

    case 'heading': {
      const tag = typeof n.tag === 'string' ? n.tag : 'h2'
      const level = headingLevel(tag)
      const text = renderInlineList(n.children as LexicalInlineNode[])
      return `${'#'.repeat(level)} ${text}\n\n`
    }

    case 'quote': {
      const text = renderInlineList(n.children as LexicalInlineNode[])
      const lines = text.split('\n')
      return `${lines.map((l) => `> ${l}`).join('\n')}\n\n`
    }

    case 'horizontalrule': {
      return '---\n\n'
    }

    case 'list': {
      const isOrdered = n.listType === 'number' || n.tag === 'ol'
      const items = Array.isArray(n.children) ? n.children : []
      const renderedItems = items.map((item, index) => {
        const itemObj = item as Record<string, unknown>
        const itemChildren = Array.isArray(itemObj.children) ? itemObj.children : []
        const prefix = isOrdered ? `${index + 1}. ` : '- '
        const text = renderInlineList(itemChildren as LexicalInlineNode[])
        return `${prefix}${text}`
      })
      return `${renderedItems.join('\n')}\n\n`
    }

    case 'block': {
      const fields = n.fields as Record<string, unknown> | undefined
      const blockType = typeof fields?.blockType === 'string' ? fields.blockType : ''

      if (blockType === 'code') {
        const lang = typeof fields?.language === 'string' ? fields.language : 'text'
        const code = typeof fields?.code === 'string' ? fields.code : ''
        return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
      }

      if (blockType === 'mediaBlock') {
        const media = fields?.media
        let alt = ''
        let url = ''
        if (typeof media === 'object' && media !== null) {
          const m = media as Record<string, unknown>
          alt = typeof m.alt === 'string' ? m.alt : ''
          url = typeof m.url === 'string' ? m.url : ''
        } else if (typeof media === 'number') {
          alt = `media-${media}`
          url = `/media/${media}`
        }
        return `![${alt}](${url})\n\n`
      }

      if (blockType === 'banner') {
        const style = typeof fields?.style === 'string' ? fields.style.toUpperCase() : 'NOTE'
        return `> [!${style}]\n> (横幅区块)\n\n`
      }

      return `<!-- unsupported-block: ${blockType} -->\n\n`
    }

    default: {
      return ''
    }
  }
}

/**
 * 将 Payload Lexical AST 转换为标准 Markdown 文本，并附加无损可替换性检查信息。
 */
export async function convertLexicalToMarkdown(
  content: unknown,
): Promise<Compatibility & { markdown: string }> {
  const compatibility = await inspectContent(content)

  if (!content || typeof content !== 'object') {
    return { ...compatibility, markdown: '' }
  }

  const lexical = content as LexicalContent
  const root = lexical.root
  if (!root || !Array.isArray(root.children)) {
    return { ...compatibility, markdown: '' }
  }

  const parts = root.children.map(renderBlock)
  const markdown = parts.join('').trim()

  return {
    ...compatibility,
    markdown,
  }
}
