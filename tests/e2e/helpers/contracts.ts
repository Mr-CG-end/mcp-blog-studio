import fs from 'node:fs'
import path from 'node:path'

export interface ShiroPostItem {
  id: string
  title: string
  slug: string
  summary: string
  created: string
  modified: string
  category?: { id: string; name: string; slug: string }
  cover?: string
  tags?: string[]
}

export interface ShiroPostDetail extends ShiroPostItem {
  text: string
  content?: string
  contentFormat: 'markdown'
  author?: { name: string; avatar?: string }
}

export interface ShiroSiteInfo {
  title: string
  description: string
  avatar?: string
  socialLinks: Array<{ label: string; url: string }>
}

export const paths = {
  shiroAdapter: path.resolve(process.cwd(), 'src/services/shiroAdapter.ts'),
  lexicalToMarkdown: path.resolve(process.cwd(), 'src/utilities/lexicalToMarkdown.ts'),
}

export function isShiroAdapterImplemented(): boolean {
  return fs.existsSync(paths.shiroAdapter)
}

export function isLexicalToMarkdownImplemented(): boolean {
  return fs.existsSync(paths.lexicalToMarkdown)
}

export async function getShiroAdapter(): Promise<{
  toShiroPostItem: (doc: Record<string, unknown>) => ShiroPostItem
  toShiroPostDetail: (doc: Record<string, unknown>) => ShiroPostDetail
  toShiroSiteInfo: (settings: Record<string, unknown>) => ShiroSiteInfo
} | null> {
  if (!isShiroAdapterImplemented()) return null
  try {
    return await import(paths.shiroAdapter)
  } catch {
    return null
  }
}

export async function getLexicalToMarkdown(): Promise<((rootNode: { root?: unknown } | null | undefined) => string) | null> {
  if (!isLexicalToMarkdownImplemented()) return null
  try {
    const mod = await import(paths.lexicalToMarkdown)
    return mod.lexicalToMarkdown || mod.default
  } catch {
    return null
  }
}
