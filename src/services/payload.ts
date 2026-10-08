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
import { createMarkdownConverter } from '@/services/markdown'

// ── 工具函数 ───────────────────────────────────────

const id = (v: number | { id: number }): number => (typeof v === 'number' ? v : v.id)

function publicURL(slug: string, status: string | null | undefined): string | null {
  return status === 'published' ? `${getServerSideURL()}/posts/${slug}` : null
}

function resolveState(d: {
  _status?: string | null
  deletedAt?: string | null
}): 'draft' | 'published' | 'trashed' {
  return d.deletedAt ? 'trashed' : d._status === 'published' ? 'published' : 'draft'
}

// ── 用户查询 ────────────────────────────────────────

async function fetchUser(actor: ActorContext): Promise<User> {
  const p = await getPayload({ config })
  return p.findByID({
    collection: 'users',
    id: actor.userID,
    depth: 0,
    overrideAccess: true,
  }) as Promise<User>
}

// ── DTO 转换 ───────────────────────────────────────

function toSummary(doc: Post): PostSummary {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary ?? null,
    state: resolveState(doc),
    revision: doc.revision,
    categoryIDs: (doc.categories ?? []).map(id),
    heroImageID: doc.heroImage ? id(doc.heroImage as number | { id: number }) : null,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt ?? null,
    publicURL: publicURL(doc.slug, doc._status),
  }
}

function defaults(page: number | undefined, limit: number | undefined, max: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(Math.max(1, limit ?? max), max) }
}

// ── where 条件 ─────────────────────────────────────

function stateFilter(state?: string): Where | undefined {
  if (state === 'trashed') return { deletedAt: { exists: true } } satisfies Where
  if (state === 'published')
    return {
      and: [{ _status: { equals: 'published' } }, { deletedAt: { exists: false } }],
    } satisfies Where
  if (state === 'draft')
    return {
      and: [{ _status: { equals: 'draft' } }, { deletedAt: { exists: false } }],
    } satisfies Where
  return { deletedAt: { exists: false } } satisfies Where
}
function buildWhere(state?: string, categoryID?: number): Where | undefined {
  const conds: Where[] = []
  const sf = stateFilter(state)
  if (sf) conds.push(sf)
  if (categoryID) conds.push({ categories: { contains: categoryID } } satisfies Where)
  return conds.length ? ({ and: conds } satisfies Where) : undefined
}

// ── Payload 单例 ────────────────────────────────────

let _payload: Awaited<ReturnType<typeof getPayload>> | null = null
async function payload(): Promise<Awaited<ReturnType<typeof getPayload>>> {
  if (!_payload) _payload = await getPayload({ config })
  return _payload
}

async function convertPostMarkdown(markdown: string, user: User): Promise<Post['content']> {
  const pl = await payload()
  const converter = createMarkdownConverter(pl.config)
  const urls = converter.mediaURLs(markdown)
  if (!urls.length) return converter.fromMarkdown(markdown, [])
  // Only resolve existing database media; never fetch a Markdown URL over the network.
  const filenames = urls.map((url) => {
    try {
      return decodeURIComponent(new URL(url, getServerSideURL()).pathname.split('/').pop() ?? '')
    } catch {
      throw Object.assign(new Error('图片 URL 无效'), { code: 'INVALID_REFERENCE' })
    }
  })
  const media = await pl.find({
    collection: 'media',
    where: { filename: { in: filenames } },
    pagination: false,
    depth: 0,
    user,
    overrideAccess: false,
  })
  return converter.fromMarkdown(
    markdown,
    media.docs.flatMap((item) =>
      item.url ? [{ id: item.id, url: item.url, alt: item.alt ?? '' }] : [],
    ),
  )
}

// ── 幂等存储（进程内，重启重置；后续改为数据库持久化） ──

const idempotencyStore = new Map<string, { inputHash: string; postID: number }>()

/** 对 createPost 的输入做简单哈希，用于比较输入是否相同 */
function hashInput(params: CreatePostParams): string {
  const str = `${params.title}|${params.markdown}|${params.summary ?? ''}|${JSON.stringify(params.categoryIDs)}|${params.heroImageID ?? ''}`
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

// ── Service ─────────────────────────────────────────

export async function createPayloadService(): Promise<BlogService> {
  const svc = {
    async getIdentity(actor: ActorContext): Promise<CurrentUser> {
      const u = await fetchUser(actor)
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        capabilities:
          u.role === 'admin'
            ? ['read:all', 'write:all', 'manage:users', 'manage:settings']
            : ['read:own', 'write:own'],
      }
    },

    async listPosts(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { page?: number; limit?: number; state?: string; categoryID?: number }
      const { page, limit } = defaults(p.page, p.limit, 12)
      const user = await fetchUser(actor)
      const r = await (
        await payload()
      ).find({
        collection: 'posts',
        depth: 1,
        limit,
        page,
        sort: '-updatedAt',
        where: buildWhere(p.state, p.categoryID),
        user,
        overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => toSummary(d as Post)),
        page: r.page,
        limit: r.limit,
        total: r.totalDocs,
        totalPages: r.totalPages,
        hasNextPage: r.hasNextPage,
      }
    },

    async getPost(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { id?: number; slug?: string }
      const user = await fetchUser(actor)
      const pl = await payload()
      let doc: Post
      if (p.id) {
        doc = (await pl.findByID({
          collection: 'posts',
          id: p.id,
          depth: 1,
          user,
          overrideAccess: false,
        })) as Post
      } else if (p.slug) {
        const r = await pl.find({
          collection: 'posts',
          limit: 1,
          where: { slug: { equals: p.slug } },
          depth: 1,
          user,
          overrideAccess: false,
        })
        if (!r.docs.length) throw Object.assign(new Error('文章不存在'), { code: 'NOT_FOUND' })
        doc = r.docs[0] as Post
      } else {
        throw Object.assign(new Error('必须提供 id 或 slug'), { code: 'VALIDATION_ERROR' })
      }
      const converter = createMarkdownConverter(pl.config)
      const converted = converter.toMarkdown(doc.content, [])
      return {
        ...toSummary(doc),
        ...converted,
        contentReplaceable:
          converter.inspectRichText(doc.content).contentReplaceable &&
          converted.warnings.length === 0,
      } as PostDetail
    },

    async searchPosts(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as {
        page?: number
        limit?: number
        query: string
        state?: string
        categoryID?: number
      }
      const { page, limit } = defaults(p.page, p.limit, 12)
      const user = await fetchUser(actor)
      const conds: Where[] = []
      const sf = stateFilter(p.state)
      if (sf) conds.push(sf)
      if (p.categoryID) conds.push({ categories: { contains: p.categoryID } } satisfies Where)
      if (p.query?.trim()) {
        const q = p.query.trim().slice(0, 200)
        conds.push({
          or: [{ title: { like: q } }, { summary: { like: q } }, { searchText: { like: q } }],
        } satisfies Where)
      }
      const r = await (
        await payload()
      ).find({
        collection: 'posts',
        depth: 1,
        limit,
        page,
        sort: '-updatedAt',
        where: conds.length ? ({ and: conds } satisfies Where) : undefined,
        user,
        overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => toSummary(d as Post)),
        page: r.page,
        limit: r.limit,
        total: r.totalDocs,
        totalPages: r.totalPages,
        hasNextPage: r.hasNextPage,
      }
    },

    async listCategories(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 100)
      const user = await fetchUser(actor)
      const r = await (
        await payload()
      ).find({
        collection: 'categories',
        depth: 0,
        limit,
        page,
        sort: 'title',
        user,
        overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => ({ id: d.id, title: d.title, slug: d.slug })),
        page: r.page,
        limit: r.limit,
        total: r.totalDocs,
        totalPages: r.totalPages,
        hasNextPage: r.hasNextPage,
      }
    },

    async listMedia(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number; query?: string } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 50)
      const user = await fetchUser(actor)
      const r = await (
        await payload()
      ).find({
        collection: 'media',
        depth: 0,
        limit,
        page,
        sort: '-updatedAt',
        user,
        overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => ({
          id: d.id,
          alt: d.alt ?? null,
          url: d.url ?? '',
          mimeType: d.mimeType ?? null,
          width: d.width ?? null,
          height: d.height ?? null,
        })),
        page: r.page,
        limit: r.limit,
        total: r.totalDocs,
        totalPages: r.totalPages,
        hasNextPage: r.hasNextPage,
      }
    },

    async createPost(actor: ActorContext, params: CreatePostParams): Promise<PostSummary> {
      const pl = await payload()
      // 幂等检查（查数据库持久化记录）
      const idemKey = `${actor.keyID}:${params.requestId}`
      const idemResult = await pl.find({
        collection: 'mcp-idempotency',
        where: { idemKey: { equals: idemKey } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      const existing = idemResult.docs[0] as { inputHash: string; postID: number } | undefined
      if (existing) {
        const inputHash = hashInput(params)
        if (existing.inputHash === inputHash) {
          const user = await fetchUser(actor)
          const doc = (await pl.findByID({
            collection: 'posts',
            id: existing.postID,
            depth: 0,
            user,
            overrideAccess: false,
          })) as Post
          return toSummary(doc)
        }
        throw Object.assign(new Error('REQUEST_CONFLICT'), {
          code: 'REQUEST_CONFLICT',
          message: '此 requestId 已被用于不同的输入',
        })
      }

      const user = await fetchUser(actor)
      const slug = params.slug || `mcp-${params.requestId.slice(0, 8)}`
      const content = await convertPostMarkdown(params.markdown, user)
      const doc = await pl.create({
        collection: 'posts',
        user,
        overrideAccess: false,
        draft: true,
        data: {
          title: params.title,
          slug,
          summary: params.summary ?? null,
          owner: actor.userID,
          authors: [actor.userID],
          categories: params.categoryIDs ?? [],
          heroImage: params.heroImageID ?? undefined,
          _status: 'draft',
          content,
        },
      })
      // 记录幂等到数据库
      await pl.create({
        collection: 'mcp-idempotency',
        data: { idemKey, inputHash: hashInput(params), postID: doc.id },
        overrideAccess: true,
      })
      return toSummary(doc as Post)
    },

    async updatePost(actor: ActorContext, params: UpdatePostParams): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts',
        id: params.id,
        depth: params.markdown !== undefined ? 1 : 0,
        user,
        overrideAccess: false,
      })) as Post
      if (existing.revision !== params.expectedRevision)
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      // enforcePost validates the submitted revision and increments it under its row lock.
      const data: Record<string, unknown> = { revision: params.expectedRevision }
      if (params.title !== undefined) data.title = params.title
      if (params.summary !== undefined) data.summary = params.summary
      if (params.categoryIDs !== undefined) data.categories = params.categoryIDs
      if (params.heroImageID !== undefined) data.heroImage = params.heroImageID
      if (params.markdown !== undefined) {
        const compatibility = createMarkdownConverter(pl.config).inspectRichText(existing.content)
        if (!compatibility.contentReplaceable)
          throw Object.assign(new Error('正文包含无法无损转换的区块，请使用后台编辑'), {
            code: 'UNSUPPORTED_CONTENT',
          })
        data.content = await convertPostMarkdown(params.markdown, user)
      }
      const doc = await pl.update({
        collection: 'posts',
        id: params.id,
        data,
        user,
        overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async publishPost(
      actor: ActorContext,
      params: { id: number; expectedRevision: number },
    ): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts',
        id: params.id,
        depth: 0,
        user,
        overrideAccess: false,
      })) as Post
      if (existing.deletedAt)
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision)
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({
        collection: 'posts',
        id: params.id,
        data: {
          _status: 'published',
          publishedAt: existing.publishedAt ?? new Date().toISOString(),
          revision: existing.revision + 1,
        },
        user,
        overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async unpublishPost(
      actor: ActorContext,
      params: { id: number; expectedRevision: number },
    ): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts',
        id: params.id,
        depth: 0,
        user,
        overrideAccess: false,
      })) as Post
      if (existing.deletedAt)
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision)
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({
        collection: 'posts',
        id: params.id,
        data: { _status: 'draft', revision: existing.revision + 1 },
        user,
        overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async trashPost(
      actor: ActorContext,
      params: { id: number; expectedRevision: number },
    ): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts',
        id: params.id,
        depth: 0,
        user,
        overrideAccess: false,
      })) as Post
      if (existing.revision !== params.expectedRevision)
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({
        collection: 'posts',
        id: params.id,
        data: {
          _status: 'draft',
          deletedAt: new Date().toISOString(),
          revision: existing.revision + 1,
        },
        user,
        overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async restorePost(
      actor: ActorContext,
      params: { id: number; expectedRevision: number },
    ): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts',
        id: params.id,
        depth: 0,
        user,
        overrideAccess: false,
      })) as Post
      if (!existing.deletedAt)
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision)
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      const doc = await pl.update({
        collection: 'posts',
        id: params.id,
        data: { deletedAt: null, _status: 'draft', revision: existing.revision + 1 },
        user,
        overrideAccess: false,
      })
      return toSummary(doc as Post)
    },
  } as unknown as BlogService
  return svc
}
