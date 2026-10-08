export type Compatibility = {
  contentReplaceable: boolean
  warnings: string[]
}

export interface MarkdownConverter {
  inspect(content: unknown): Promise<Compatibility>
  toMarkdown(content: unknown): Promise<Compatibility & { markdown: string }>
  fromMarkdown(markdown: string): Promise<{ content: unknown }>
}

export type LexicalTextNode = {
  type: 'text'
  text: string
  format?: number
  version?: number
  mode?: 'normal' | 'token' | 'segmented'
  style?: string
  detail?: number
}

export type LexicalLinkNode = {
  type: 'link'
  fields?: {
    url?: string
    newTab?: boolean
  }
  children?: LexicalInlineNode[]
  version?: number
}

export type LexicalInlineNode = LexicalTextNode | LexicalLinkNode | { [key: string]: unknown }

export type LexicalParagraphNode = {
  type: 'paragraph'
  children?: LexicalInlineNode[]
  version?: number
  direction?: string | null
  format?: string | number
  indent?: number
}

export type LexicalHeadingNode = {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  children?: LexicalInlineNode[]
  version?: number
  direction?: string | null
  format?: string | number
  indent?: number
}

export type LexicalQuoteNode = {
  type: 'quote'
  children?: LexicalInlineNode[]
  version?: number
  direction?: string | null
  format?: string | number
  indent?: number
}

export type LexicalListItemNode = {
  type: 'listitem'
  value?: number
  children?: (LexicalInlineNode | LexicalListNode)[]
  version?: number
}

export type LexicalListNode = {
  type: 'list'
  listType?: 'bullet' | 'number' | 'check'
  tag?: 'ul' | 'ol'
  start?: number
  children?: LexicalListItemNode[]
  version?: number
}

export type LexicalHorizontalRuleNode = {
  type: 'horizontalrule'
  version?: number
}

export type LexicalCodeBlock = {
  type: 'block'
  fields: {
    blockType: 'code'
    language?: string
    code?: string
  }
  version?: number
}

export type LexicalMediaBlock = {
  type: 'block'
  fields: {
    blockType: 'mediaBlock'
    media?: number | { id?: number; url?: string; alt?: string; filename?: string }
  }
  version?: number
}

export type LexicalBannerBlock = {
  type: 'block'
  fields: {
    blockType: 'banner'
    style?: string
    content?: unknown
  }
  version?: number
}

export type LexicalCustomBlock = LexicalCodeBlock | LexicalMediaBlock | LexicalBannerBlock | {
  type: 'block'
  fields?: {
    blockType?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type LexicalBlockNode =
  | LexicalParagraphNode
  | LexicalHeadingNode
  | LexicalQuoteNode
  | LexicalListNode
  | LexicalHorizontalRuleNode
  | LexicalCustomBlock
  | { type: string; [key: string]: unknown }

export type LexicalRootNode = {
  type: 'root'
  direction?: string | null
  format?: string | number
  indent?: number
  version?: number
  children?: LexicalBlockNode[]
}

export type LexicalContent = {
  root?: LexicalRootNode
  [key: string]: unknown
}
