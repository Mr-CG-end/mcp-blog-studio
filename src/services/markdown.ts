import {
  $createServerBlockNode, $isServerBlockNode, ServerBlockNode,
  convertLexicalToMarkdown, convertMarkdownToLexical, editorConfigFactory,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { ElementTransformer, MultilineElementTransformer, TextMatchTransformer } from '@payloadcms/richtext-lexical/lexical/markdown'
import type { RichTextField, SanitizedConfig } from 'payload'
import type { MarkdownConverter, ResolvedMedia } from '@/mcp/contracts'
import type { Post } from '@/payload-types'

type Node = Record<string, unknown>
const record = (value: unknown): Node | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Node : null

function unsupported(message: string): never {
  throw Object.assign(new Error(message), { code: 'UNSUPPORTED_CONTENT' })
}

// Extend the official transformer pipeline for the Code block already registered on Posts.
const codeTransformer: MultilineElementTransformer = {
  type: 'multiline-element', dependencies: [ServerBlockNode],
  regExpStart: /^\s*(`{3,}|~{3,})([^\s`]*)\s*$/,
  regExpEnd: { regExp: /^\s*(?:`{3,}|~{3,})\s*$/, optional: true },
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex, startMatch }) => {
    const fence = startMatch[1]
    let end = startLineIndex + 1
    while (end < lines.length) {
      const candidate = lines[end].trim()
      if (candidate.length >= fence.length && [...candidate].every((char) => char === fence[0])) break
      end++
    }
    rootNode.append($createServerBlockNode({ blockType: 'code', blockName: '',
      language: startMatch[2] || 'text', code: lines.slice(startLineIndex + 1, end).join('\n') }))
    return [true, Math.min(end, lines.length - 1)]
  },
  replace: () => false,
  export: (node) => {
    if (!$isServerBlockNode(node)) return null
    const fields = node.getFields()
    if (fields.blockType !== 'code' || typeof fields.code !== 'string') return null
    const longest = Math.max(2, ...(fields.code.match(/`+/g) ?? []).map((run) => run.length))
    const fence = '`'.repeat(longest + 1)
    return `${fence}${typeof fields.language === 'string' ? fields.language : ''}\n${fields.code}\n${fence}`
  },
}

type ConversionIssue = { code: 'INVALID_REFERENCE' | 'UNSUPPORTED_CONTENT'; message: string }
function imageTransformer(media: ResolvedMedia[], issues: ConversionIssue[], urls?: Set<string>): ElementTransformer {
  return {
    type: 'element', dependencies: [ServerBlockNode],
    regExp: /^!\[([^\]]*)\]\(([^\s]+)\)\s*$/,
    replace: (parent, _children, match) => {
      const url = match[2]
      urls?.add(url)
      const resolved = media.find((item) => item.url === url)
      if (!resolved && !urls) {
        issues.push({ code: 'INVALID_REFERENCE', message: '图片必须引用已有媒体库 URL' })
        return
      }
      if (resolved && match[1] !== resolved.alt) {
        issues.push({ code: 'UNSUPPORTED_CONTENT', message: '图片 alt 与媒体库不一致，请在后台维护媒体 alt' })
        return
      }
      parent.replace($createServerBlockNode({ blockType: 'mediaBlock', blockName: '', media: resolved?.id ?? 1 }))
    },
    export: (node) => {
      if (!$isServerBlockNode(node)) return null
      const fields = node.getFields()
      if (fields.blockType !== 'mediaBlock') return null
      const populated = record(fields.media)
      const resolved = media.find((item) => item.id === (populated?.id ?? fields.media))
      const url = resolved?.url ?? populated?.url
      const alt = resolved?.alt ?? populated?.alt ?? ''
      if (typeof url !== 'string') unsupported('媒体 URL 无法解析，请使用后台编辑')
      return `![${String(alt)}](${url})`
    },
  }
}

// MediaBlock is a block-level feature; rejecting inline images prevents silently changing layout.
const inlineImageGuard = (issues: ConversionIssue[]): TextMatchTransformer => ({
  type: 'text-match', dependencies: [], regExp: /!\[[^\]]*\]\([^\n]*\)$/,
  importRegExp: /!\[[^\]]*\]\([^\n]*\)/,
  replace: () => { issues.push({ code: 'UNSUPPORTED_CONTENT', message: '图片请单独成段；当前文章编辑器使用媒体区块' }) },
})

function withTransformers(config: SanitizedServerEditorConfig, media: ResolvedMedia[], issues: ConversionIssue[], urls?: Set<string>) {
  return { ...config, features: { ...config.features,
    markdownTransformers: [codeTransformer, imageTransformer(media, issues, urls), inlineImageGuard(issues), ...config.features.markdownTransformers],
  } }
}

const supportedNodes = new Set(['root', 'paragraph', 'text', 'heading', 'list', 'listitem', 'quote', 'link',
  'autolink', 'linebreak', 'horizontalrule', 'table', 'tablerow', 'tablecell', 'block'])

/** Inspect before parsing: Lexical throws on unknown types, while Markdown may omit unsupported fields. */
function inspect(content: unknown) {
  const warnings = new Set<string>()
  const hasPipe = (value: unknown): boolean => {
    const node = record(value)
    const url = record(node?.fields)?.url
    return Boolean(typeof node?.text === 'string' && node.text.includes('|')) ||
      Boolean(typeof url === 'string' && url.includes('|')) ||
      (Array.isArray(node?.children) && node.children.some(hasPipe))
  }
  const visit = (value: unknown): Node | null => {
    const node = record(value)
    if (!node || !supportedNodes.has(String(node.type))) {
      warnings.add(`不支持的正文节点：${String(node?.type ?? 'invalid')}`)
      return null
    }
    const fields = record(node.fields)
    if (node.type === 'block' && fields?.blockType !== 'code' && fields?.blockType !== 'mediaBlock') {
      warnings.add(`区块 ${String(fields?.blockType)} 无法通过 Markdown 无损替换`)
      return null
    }
    if (node.type === 'block' && fields?.blockType === 'code' && typeof fields.code !== 'string') {
      warnings.add('代码区块内容无效')
      return null
    }
    if (node.type === 'block' && fields?.blockName) warnings.add('区块名称无法通过 Markdown 保留')
    if (node.type === 'block' && fields?.blockType === 'code' && typeof fields.language === 'string' && /[\s`]/.test(fields.language)) warnings.add('代码语言标识无法通过 Markdown 保留')
    if (node.type === 'block' && fields?.blockType === 'mediaBlock') {
      const media = record(fields.media)
      if (media && (typeof media.alt === 'string' && /[\[\]\\\n]/.test(media.alt) || typeof media.url === 'string' && /\s/.test(media.url))) warnings.add('媒体 alt 或 URL 包含无法往返转换的 Markdown 字符')
      if (!fields.media) warnings.add('媒体区块缺少有效引用')
    }
    if (node.type === 'link' && (fields?.linkType !== 'custom' || fields.newTab)) warnings.add('链接包含 Markdown 无法保留的内部引用或打开方式')
    if (node.type === 'text' && (Number(node.format ?? 0) & ~19 || node.style || node.bold || node.italic || node.code)) warnings.add('文本包含 Markdown 无法保留的格式或旧版非标准属性')
    if (node.type !== 'text' && node.format && node.format !== 'left') warnings.add('正文包含 Markdown 无法保留的对齐方式')
    if (node.type === 'tablecell' && (Number(node.colSpan ?? 1) > 1 || Number(node.rowSpan ?? 1) > 1 || node.backgroundColor)) warnings.add('表格包含 Markdown 无法保留的合并单元格或颜色')
    if (node.type === 'tablecell' && (hasPipe(node) || Number(node.headerState ?? 0) > 1)) warnings.add('表格包含无法往返转换的管道字符或列标题')
    if (node.type === 'list' && node.listType === 'check') warnings.add('当前文章编辑器未启用勾选列表')
    const children = Array.isArray(node.children) ? node.children.map(visit).filter((child) => child !== null) : undefined
    return { ...node, ...(children ? { children } : {}) }
  }
  const root = record(content)?.root
  if (!root) warnings.add('正文缺少 Lexical root')
  const readableRoot = root ? visit(root) : null
  return { contentReplaceable: warnings.size === 0, warnings: [...warnings], readableRoot }
}

export function createMarkdownConverter(config: SanitizedConfig): Omit<MarkdownConverter, 'fromMarkdown'> & {
  fromMarkdown(markdown: string, media: ResolvedMedia[]): Post['content']
  mediaURLs(markdown: string): string[]
} {
  const field = config.collections.find((collection) => collection.slug === 'posts')?.fields
    .find((field): field is RichTextField => field.type === 'richText' && field.name === 'content')
  if (!field) throw new Error('找不到文章正文的 Lexical 配置')
  const editorConfig = editorConfigFactory.fromField({ field })
  const convert = (markdown: string, media: ResolvedMedia[], urls?: Set<string>) => {
    const issues: ConversionIssue[] = []
    const content = convertMarkdownToLexical({ markdown, editorConfig: withTransformers(editorConfig, media, issues, urls) })
    // Headless Lexical logs and swallows exceptions thrown inside update callbacks.
    // Propagate validation errors outside the callback, before a database write can occur.
    if (issues[0]) throw Object.assign(new Error(issues[0].message), { code: issues[0].code })
    return content
  }
  return {
    fromMarkdown: (markdown, media) => convert(markdown, media),
    mediaURLs: (markdown) => {
      const urls = new Set<string>()
      convert(markdown, [], urls)
      return [...urls]
    },
    inspectRichText: (content) => {
      const { contentReplaceable, warnings } = inspect(content)
      return { contentReplaceable, warnings }
    },
    toMarkdown: (content, media) => {
      const { warnings, readableRoot } = inspect(content)
      if (!readableRoot || !Array.isArray(readableRoot.children) || !readableRoot.children.length) return { markdown: '', warnings }
      try {
        return { markdown: convertLexicalToMarkdown({ data: { root: readableRoot } as unknown as SerializedEditorState,
          editorConfig: withTransformers(editorConfig, media, []) }), warnings }
      } catch {
        return { markdown: '', warnings: [...warnings, '正文转换失败，请在后台编辑；禁止通过 Markdown 覆盖'] }
      }
    },
  }
}
