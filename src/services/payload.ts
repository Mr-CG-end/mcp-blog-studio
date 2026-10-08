/**
 * MCP Blog Studio — BlogService 真实实现（基于 Payload Local API）
 *
 * 使用 Payload 生成的类型，最小化 any 断言。
 */

import config from '@payload-config'
import { getPayload } from 'payload'
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

/** 关系字段归一化：`number | { id: number }` → `number` */
const id = (v: number | { id: number }): number => (typeof v === 'number' ? v : v.id)

/** 公开 URL（仅已发布文章） */
function publicURL(slug: string, status: string | null | undefined): string | null {
  return status === 'published' ? `${getServerSideURL()}/posts/${slug}` : null
}

/** _status + deletedAt → MCP PostState */
function resolveState(d: { _status?: string | null; deletedAt?: string | null }): 'draft' | 'published' | 'trashed' {
  return d.deletedAt ? 'trashed' : d._status === 'published' ? 'published' : 'draft'
}

// ── Payload 查询用户（每个请求最多一次） ───────────────

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

// ── 分页默认值 ─────────────────────────────────────

function defaults(page: number | undefined, limit: number | undefined, max: number) {
  return { page: Math.max(1, page ?? 1), limit: Math.min(Math.max(1, limit ?? max), max) }
}

// ── Service 工厂 ───────────────────────────────────

/** 首次调用时初始化 Payload，之后复用同一实例 */
let _payload: Awaited<ReturnType<typeof getPayload>> | null = null

async function payload(): Promise<Awaited<ReturnType<typeof getPayload>>> {
  if (!_payload) _payload = await getPayload({ config })
  return _payload
}

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

      const r = await (await payload()).find({
        collection: 'posts', depth: 1, limit, page, sort: '-updatedAt',
        user, overrideAccess: false,
      })

      return {
        items: r.docs.map((d) => toSummary(d as Post)),
        page: r.page, limit: r.limit, total: r.totalDocs,
        totalPages: r.totalPages, hasNextPage: r.hasNextPage,
      }
    },

    async getPost(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { id?: number; slug?: string }
      const user = await fetchUser(actor)
      const pl = await payload()
      let doc: Post

      if (p.id) {
        doc = (await pl.findByID({
          collection: 'posts', id: p.id, depth: 1, user, overrideAccess: false,
        })) as Post
      } else if (p.slug) {
        const r = await pl.find({
          collection: 'posts', limit: 1, where: { slug: { equals: p.slug } },
          depth: 1, user, overrideAccess: false,
        })
        if (!r.docs.length) {
          throw Object.assign(new Error('文章不存在'), { code: 'NOT_FOUND' })
        }
        doc = r.docs[0] as Post
      } else {
        throw Object.assign(new Error('必须提供 id 或 slug'), { code: 'VALIDATION_ERROR' })
      }

      return {
        ...toSummary(doc),
        markdown: '', // TODO: RichText → Markdown 转换
        contentReplaceable: true,
        warnings: [],
      } as PostDetail
    },

    async searchPosts(actor: ActorContext, params: Record<string, unknown>) {
      const p = params as { page?: number; limit?: number; query: string; state?: string; categoryID?: number }
      const { page, limit } = defaults(p.page, p.limit, 12)
      const user = await fetchUser(actor)

      const r = await (await payload()).find({
        collection: 'posts', depth: 1, limit, page, sort: '-updatedAt',
        user, overrideAccess: false,
      })

      return {
        items: r.docs.map((d) => toSummary(d as Post)),
        page: r.page, limit: r.limit, total: r.totalDocs,
        totalPages: r.totalPages, hasNextPage: r.hasNextPage,
      }
    },

    async listCategories(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 100)
      const user = await fetchUser(actor)
      const r = await (await payload()).find({
        collection: 'categories', depth: 0, limit, page, sort: 'title',
        user, overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => ({ id: d.id, title: d.title, slug: d.slug })),
        page: r.page, limit: r.limit, total: r.totalDocs,
        totalPages: r.totalPages, hasNextPage: r.hasNextPage,
      }
    },

    async listMedia(actor: ActorContext, _params: Record<string, unknown>) {
      const p = _params as { page?: number; limit?: number; query?: string } | undefined
      const { page, limit } = defaults(p?.page, p?.limit, 50)
      const user = await fetchUser(actor)
      const r = await (await payload()).find({
        collection: 'media', depth: 0, limit, page, sort: '-updatedAt',
        user, overrideAccess: false,
      })
      return {
        items: r.docs.map((d) => ({
          id: d.id, alt: d.alt ?? null, url: d.url ?? '',
          mimeType: d.mimeType ?? null, width: d.width ?? null, height: d.height ?? null,
        })),
        page: r.page, limit: r.limit, total: r.totalDocs,
        totalPages: r.totalPages, hasNextPage: r.hasNextPage,
      }
    },

    async createPost(actor: ActorContext, params: CreatePostParams): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const slug = params.slug || `mcp-${params.requestId.slice(0, 8)}`
      const doc = await (await payload()).create({
        collection: 'posts', user, overrideAccess: false, draft: true,
        data: {
          title: params.title,
          slug,
          summary: params.summary ?? null,
          owner: actor.userID,
          authors: [actor.userID],
          categories: params.categoryIDs ?? [],
          heroImage: params.heroImageID ?? undefined,
          _status: 'draft',
          // content 为 Payload 必填，暂时填充最小富文本结构
          // TODO: 接入 Markdown → RichText 转换器
          content: {
            root: {
              type: 'root',
              format: '',
              indent: 0,
              version: 1,
              children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text: params.markdown.slice(0, 500), version: 1 }] }],
              direction: 'ltr',
            },
          },
        },
      })
      return toSummary(doc as Post)
    },

    async updatePost(actor: ActorContext, params: UpdatePostParams): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false,
      })) as Post

      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
      }

      const data: Record<string, unknown> = { revision: existing.revision + 1 }
      if (params.title !== undefined) data.title = params.title
      if (params.summary !== undefined) data.summary = params.summary
      if (params.categoryIDs !== undefined) data.categories = params.categoryIDs
      if (params.heroImageID !== undefined) data.heroImage = params.heroImageID

      const doc = await pl.update({
        collection: 'posts', id: params.id, data, user, overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async publishPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false,
      })) as Post

      if (existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })

      const doc = await pl.update({
        collection: 'posts', id: params.id,
        data: {
          _status: 'published',
          publishedAt: existing.publishedAt ?? new Date().toISOString(),
          revision: existing.revision + 1,
        },
        user, overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async unpublishPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false,
      })) as Post

      if (existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })

      const doc = await pl.update({
        collection: 'posts', id: params.id,
        data: { _status: 'draft', revision: existing.revision + 1 },
        user, overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async trashPost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false,
      })) as Post

      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })

      const doc = await pl.update({
        collection: 'posts', id: params.id,
        data: {
          _status: 'draft',
          deletedAt: new Date().toISOString(),
          revision: existing.revision + 1,
        },
        user, overrideAccess: false,
      })
      return toSummary(doc as Post)
    },

    async restorePost(actor: ActorContext, params: { id: number; expectedRevision: number }): Promise<PostSummary> {
      const user = await fetchUser(actor)
      const pl = await payload()
      const existing = (await pl.findByID({
        collection: 'posts', id: params.id, depth: 0, user, overrideAccess: false,
      })) as Post

      if (!existing.deletedAt) throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' })
      if (existing.revision !== params.expectedRevision) throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })

      const doc = await pl.update({
        collection: 'posts', id: params.id,
        data: { deletedAt: null, _status: 'draft', revision: existing.revision + 1 },
        user, overrideAccess: false,
      })
      return toSummary(doc as Post)
    },
  } as unknown as BlogService

  return svc
}