export function plainText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  if (Array.isArray(content)) return content.map(plainText).join(' ')
  const node = content as {
    text?: string
    fields?: { code?: string }
    children?: unknown[]
    root?: unknown
  }
  return [
    node.text || '',
    node.fields?.code || '',
    ...(node.children || []).map(plainText),
    ...(node.root ? [plainText(node.root)] : []),
  ]
    .join(' ')
    .trim()
}
