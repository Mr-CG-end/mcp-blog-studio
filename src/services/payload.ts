/**
 * MCP Blog Studio — BlogService 真实实现（基于 Payload Local API）
 *
 * 使用 Payload 生成的类型，最小化 any 断言。
 */

import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import type { Post, User } from '@/payload-types'
import type {
  ActorContext,
  BlogService,
  CurrentUser,
  PostSummary,
  PostDetail,
  CreatePostParams,
  UpdatePostParams,
} from '@/mcp/contracts'
import { getServerSideURL } from '@/utilities/getURL'

// ── 工具函数 ───────────────────────────────────────

const id = (v: number | { id: number }): number => (typeof v === 'number' ? v : v.id)

function publicURL(slug: string, status: string | null | undefined): string | null {
  return status === 'published' ? `${getServerSideURL()}/posts/${slug}` : null
}

function resolveState(d: { _status?: string | null; deletedAt?: string | null }): 'draft' | 'published' | 'trashed' {
  return d.deletedAt ? 'trashed' : d._status === 'published' ? 'published' : 'draft'
}

// ── 用户查询 ────────────────────────────────────────

async function fetchUser(actor: ActorContext): Promise<User> {
  const p = await getPayload({ config })
  return p.findByID({ collection: 'users', id: actor.userID, depth: 0, overrideAccess: true }) as Promise<User>
}

// ── DTO 转换 ───────────────────────────────────────

function toSummary(doc: Post): PostSummary {
  return {
    id: doc.id, slug: doc.slug, title: doc.title, summary: doc.summary ?? null,
    state: resolveState(doc), revision: doc.revision,
    categoryIDs: (doc.categories ?? []).map(id),
    heroImageID: doc.heroImage ? id(doc.heroImage as number | { id: number }) : null,
    updatedAt: doc.updatedAt, publishedAt: doc.publishedAt ?? null,
    publicURL: publicURL(doc.slug, doc._status),
  }
}

function defaults(page: number | undefined, limit: number | undefined, max: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(Math.max(1, limit ?? max), max) }
}

// ── where 条件 ─────────────────────────────────────

function stateFilter(state?: string): Where | undefined {
  if (state === 'trashed') return { deletedAt: { exists: true } } satisfies Where
  if (state === 'published') return { and: [{ _status: { equals: 'published' } }, { deletedAt: { exists: false } }] } satisfies Where
  if (state === 'draft') return { and: [{ _status: { equals: 'draft' } }, { deletedAt: { exists: false } }] } satisfies Where
  return { deletedAt: { exists: false } } satisfies Where
}
function buildWhere(state?: string, categoryID?: number): Where | undefined {
  const conds: Where[] = []
  const sf = stateFilter(state); if (sf) conds.push(sf)
  if (categoryID) conds.push({ categories: { contains: categoryID } } satisfies Where)
  return conds.length ? { and: conds } satisfies Where : undefined
}

// ── Markdown 转换 ──────────────────────────────────

/** Payload Lexical 文本节点 */
function tn(text: string, extra?: Record<string, unknown>): Record<string, unknown> {
  return { mode: 'normal', text, type: 'text', style: '', detail: 0, format: 0, version: 1, ...(extra ?? {}) }
}
/** 容器节点（paragraph / heading / list / blockquote） */
function cn(type: string, children: Record<string, unknown>[], extra?: Record<string, unknown>): Record<string, unknown> {
  return { type, format: '', indent: 0, version: 1, children, direction: 'ltr', ...(extra ?? {}) }
}

function parseInline(text: string): Record<string, unknown>[] {
  const segs: Record<string, unknown>[] = []
  let r = text
  while (r) {
    const b = r.match(/^\*\*(.+?)\*\*/)
    if (b) { segs.push(tn(b[1], { bold: true })); r = r.slice(b[0].length); continue }
    const i = r.match(/^\*(.+?)\*/)
    if (i) { segs.push(tn(i[1], { italic: true })); r = r.slice(i[0].length); continue }
    const c = r.match(/^`(.+?)`/)
    if (c) { segs.push(tn(c[1], { code: true })); r = r.slice(c[0].length); continue }
    const l = r.match(/^\[(.+?)\]\((.+?)\)/)
    if (l) { segs.push(cn('link', [tn(l[1])], { url: l[2] })); r = r.slice(l[0].length); continue }
    segs.push(tn(r[0])); r = r.slice(1)
  }
  return segs
}

function markdownToLexical(md: string): { root: Record<string, unknown> } {
  const children: Record<string, unknown>[] = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) { children.push(cn('heading', parseInline(h[2]), { tag: `h${h[1].length}` })); i++; continue }
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const cl: string[] = []; i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) { cl.push(lines[i]); i++ }
      i++; children.push({ type: 'code-block', code: cl.join('\n'), language: lang || null, format: '', indent: 0, version: 1, direction: 'ltr' }); continue
    }
    if (line.startsWith('> ')) { children.push(cn('blockquote', [cn('paragraph', parseInline(line.slice(2)))])); i++; continue }
    if (line.match(/^[-*]\s/)) {
      const items: Record<string, unknown>[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) { items.push(cn('listitem', parseInline(lines[i].replace(/^[-*]\s/, '')))); i++ }
      children.push(cn('list', items, { listType: 'bullet' })); continue
    }
    children.push(cn('paragraph', parseInline(line))); i++
  }
  return { root: cn('root', children) }
}

function lexicalToMarkdown(content: unknown): string {
  const n = content as Record<string, unknown> | undefined
  if (!n) return ''
  const ch = n.children as Array<Record<string, unknown>> | undefined
  if (ch && (n.type === 'root' || n.type === 'blockquote' || n.type === 'list' || n.type === 'paragraph')) return ch.map(lexicalToMarkdown).join(n.type === 'list' ? '\n' : '\n\n').trim()
  if (n.type === 'heading') return '#'.repeat(parseInt((n.tag as string)?.slice(1) || '1')) + ' ' + ch?.map(lexicalToMarkdown).join('') || ''
  if (n.type === 'listitem') return '- ' + ch?.map(lexicalToMarkdown).join('') || ''
  if (n.type === 'code-block' || n.type === 'code') return '```' + ((n as any).language || '') + '\n' + ((n as any).code || '') + '\n```'
  if (n.type === 'link') return '[' + (ch?.map(lexicalToMarkdown).join('') || '') + '](' + (n.url || '') + ')'
  if (n.type === 'text') {
    let t = (n.text as string) || ''
    if (n.bold) t = '**' + t + '**'
    if (n.italic) t = '*' + t + '*'
    return t
  }
  if (n.type === 'blockquote') return '> ' + (ch?.map(lexicalToMarkdown).join('') || '')
  if (n.type === 'upload') return '![' + ((n as any).alt || '') + '](' + ((n as any).url || '') + ')'
  return ch?.map(lexicalToMarkdown).join('') || ''
}

// ── Payload 单例 ────────────────────────────────────

let _payload: Awaited<ReturnType<typeof getPayload>> | null = null
async function payload(): Promise<Awaited<ReturnType<typeof getPayload>>> {
  if (!_payload) _payload = await getPayload({ config })
  return _payload
}

// ── Service ─────────────────────────────────────────

export async function createPayloadService(): Promise<BlogService> {
  const svc = {
    async getIdentity(actor: ActorContext): Promise<CurrentUser> {
      const u = await fetchUser(actor)
      return { id: u.id, name: u.name, role: u.role, capabilities: u.role === 'admin' ? ['read:all', 'write:all', 'manage:users', 'manage:settings'] : ['read:own', 'write:own'] }
    },

    async listPosts(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { page?: number; limit?: number; state?: string; categoryID?: number }
      const { page, limit } = defaults(p.page, p.limit, 12)
      const user = await fetchUser(actor)
      const r = await (await payload()).find({ collection: 'posts', depth: 1, limit, page, sort: '-updatedAt', where: buildWhere(p.state, p.categoryID), user, overrideAccess: false })
      return { items: r.docs.map((d) => toSummary(d as Post)), page: r.page, limit: r.limit, total: r.totalDocs, totalPages: r.totalPages, hasNextPage: r.hasNextPage }
    },

    async getPost(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { id?: number; slug?: string }
      const user = await fetchUser(actor)
      const pl = await payload()
      let doc: Post
      if (p.id) {
        doc = (await pl.findByID({ collection: 'posts', id: p.id, depth: 1, user, overrideAccess: false })) as Post
      } else if (p.slug) {
        const r = await pl.find({ collection: 'posts', limit: 1, where: { slug: { equals: p.slug } }, depth: 1, user, overrideAccess: false })
        if (!r.docs.length) throw Object.assign(new Error('文章不存在'), { code: 'NOT_FOUND' })
        doc = r.docs[0] as Post
      } else {
        throw Object.assign(new Error('必须提供 id 或 slug'), { code: 'VALIDATION_ERROR' })
      }
      return { ...toSummary(doc), markdown: doc.content ? lexicalToMarkdown(doc.content) : '', contentReplaceable: true, warnings: [] } as PostDetail
    },

    async searchPosts(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { page?: number; limit?: number; query: string; state?: string; categoryID?: number }
      const { page, limit } = defaults(p.page, p.limit, 12)
      const user = await fetchUser(actor)
      const conds: Where[] = []
      const sf = stateFilter(p.state); if (sf) conds.push(sf)
      if (p.categoryID) conds.push({ categories: { contains: p.categoryID } } satisfies Where)
      if (p.query?.trim()) {
        const q = p.query.trim().slice(0, 200)
        conds.push({ or: [{ title: { like: q } }, { summary: { like: q } }, { searchText: { like: q } }] } satisfies Where)
      }
      const r = await (await payload()).find({ collection: 'posts', depth: 1, limit, page, sort: '-updatedAt', where: conds.length ? { and: conds } satisfies Where : undefined, user, overrideAccess: false })
      return { items: r.docs.map((d) => toSummary(d as Post)), page: r.page, limit: r.limit, total: r.totalDocs, totalPages: r.totalPages, hasNextPage: r.hasNextPage }
    },

    async listCategories(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 100)
      const user = await fetchUser(actor)
      const r = await (await payload()).find({ collection: 'categories', depth: 0, limit, page, sort: 'title', user, overrideAccess: false })
      return { items: r.docs.map((d) => ({ id: d.id, title: d.title, slug: d.slug })), page: r.page, limit: r.limit, total: r.totalDocs, totalPages: r.totalPages, hasNextPage: r.hasNextPage }
    },

    async listMedia(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number; query?: string } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 50)
      const user = await fetchUser(actor)
      const r = await (await payload()).find({ collection: 'media', depth: 0, limit, page, sort: '-updatedAt', user, overrideAccess: false })
      return { items: r.docs.map((d) => ({ id: d.id, alt: d.alt ?? null, url: d.url ?? '', mimeType: d.mimeType ?? null, width: d.width ?? null, height: d.height ?? null })), page: r.page, limit: r.limit, total: r.totalDocs, totalPages: r.totalPages, hasNextPage: r.hasNextPage }
    },

    async createPost(actor: ActorContext, params: CreatePostParams): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const slug = params.slug || `mcp-${params.requestId.slice(0, 8)}`
      const doc = await (await payload()).create({ collection: 'posts', user, overrideAccess: false, draft: true, data: { title: params.title, slug, summary: params.summary ?? null, owner: actor.userID, authors: [actor.userID], categories: params.categoryIDs ?? [], heroImage: params.heroImageID ?? undefined, _status: 'draft', content: markdownToLexical(params.markdown) as any } })
      return toSummary(doc as Post)
    },

    async updatePost(actor: ActorContext, params: UpdatePostParams): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({ collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false })) as Post
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const data: Record<string, unknown> = { revision: existing.revision + 1 }
      if (params.title !== undefined) data.title = params.title
      if (params.summary !== undefined) data.summary = params.summary
      if (params.categoryIDs !== undefined) data.categories = params.categoryIDs
      if (params.heroImageID !== undefined) data.heroImage = params.heroImageID
      if (params.markdown !== undefined) data.content = markdownToLexical(params.markdown)
      const doc = await pl.update({ collection: 'posts', id: params.id, data, user, overrideAccess: false })
      return toSummary(doc as Post)
    },

    async publishPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({ collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false })) as Post
      if (existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({ collection: 'posts', id: params.id, data: { _status: 'published', publishedAt: existing.publishedAt ?? new Date().toISOString(), revision: existing.revision + 1 }, user, overrideAccess: false })
      return toSummary(doc as Post)
    },

    async unpublishPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({ collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false })) as Post
      if (existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({ collection: 'posts', id: params.id, data: { _status: 'draft', revision: existing.revision + 1 }, user, overrideAccess: false })
      return toSummary(doc as Post)
    },

    async trashPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({ collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false })) as Post
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({ collection: 'posts', id: params.id, data: { _status: 'draft', deletedAt: new Date().toISOString(), revision: existing.revision + 1 }, user, overrideAccess: false })
      return toSummary(doc as Post)
    },

    async restorePost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({ collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false })) as Post
      if (!existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({ collection: 'posts', id: params.id, data: { deletedAt: null, _status: 'draft', revision: existing.revision + 1 }, user, overrideAccess: false })
      return toSummary(doc as Post)
    },
  } as unknown as BlogService
  return svc
}