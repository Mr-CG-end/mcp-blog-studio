import config from '@payload-config'
import type { SanitizedConfig } from 'payload'
import { createMarkdownConverter as createPayloadConverter } from '@/services/markdown'
import type { MarkdownConverter } from './types'
export type { Compatibility, MarkdownConverter } from './types'

export interface ResolvedMedia {
  id: number
  url: string
  alt: string
}

/** Adapt the B service contract to the same Posts editor pipeline used by writes. */
export function createMarkdownConverter(
  options: {
    config?: SanitizedConfig | Promise<SanitizedConfig>
    resolveMedia?: (urls: string[]) => Promise<ResolvedMedia[]>
  } = {},
): MarkdownConverter {
  const engine = async () => createPayloadConverter(await (options.config ?? config))
  return {
    inspect: async (content) => {
      const converter = await engine()
      const compatibility = converter.inspectRichText(content)
      if (!compatibility.contentReplaceable) return compatibility
      const converted = converter.toMarkdown(content, [])
      const warnings = [...new Set([...compatibility.warnings, ...converted.warnings])]
      return { contentReplaceable: warnings.length === 0, warnings }
    },
    toMarkdown: async (content) => {
      const converter = await engine()
      const converted = converter.toMarkdown(content, [])
      const compatibility = converter.inspectRichText(content)
      const warnings = [...new Set([...compatibility.warnings, ...converted.warnings])]
      return { ...converted, warnings, contentReplaceable: warnings.length === 0 }
    },
    fromMarkdown: async (markdown) => {
      const converter = await engine()
      const urls = converter.mediaURLs(markdown)
      const media = urls.length && options.resolveMedia ? await options.resolveMedia(urls) : []
      return { content: converter.fromMarkdown(markdown, media) }
    },
  }
}

export const markdownConverter = createMarkdownConverter()
