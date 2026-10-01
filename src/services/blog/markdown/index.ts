export type Compatibility = { contentReplaceable: boolean; warnings: string[] }
/** B supplies these adapters against the existing Payload rich-text model. */
export interface MarkdownConverter {
  inspect(content: unknown): Promise<Compatibility>
  toMarkdown(content: unknown): Promise<Compatibility & { markdown: string }>
  fromMarkdown(markdown: string): Promise<{ content: unknown }>
}
