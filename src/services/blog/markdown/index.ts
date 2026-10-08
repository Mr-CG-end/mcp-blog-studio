import { inspectContent } from './inspect'
import { convertLexicalToMarkdown } from './toMarkdown'
import { convertMarkdownToLexical } from './fromMarkdown'
import type { MarkdownConverter } from './types'

export type { Compatibility, MarkdownConverter } from './types'

export function createMarkdownConverter(): MarkdownConverter {
  return {
    inspect: inspectContent,
    toMarkdown: convertLexicalToMarkdown,
    fromMarkdown: convertMarkdownToLexical,
  }
}

export const markdownConverter: MarkdownConverter = createMarkdownConverter()
