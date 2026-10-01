/**
 * MCP Blog Studio — BlogService 桩实现
 *
 * 用于协议开发阶段的模拟服务。
 * 后续替换为真实 Payload Local API 实现。
 */

import type {
  ActorContext,
  BlogService,
  CategorySummary,
  CurrentUser,
  MediaSummary,
  PageResult,
  PostDetail,
  PostSummary,
  CreatePostParams,
  UpdatePostParams,
} from '../contracts'

/** 工具函数：ISO 时间 */
function nowISO(): string {
  return new Date().toISOString()
}

export function createStubService(): BlogService {
  // 模拟数据存储
  let nextId = 1
  const posts = new Map<number, PostSummary & { markdown?: string }>()
  const categories: CategorySummary[] = [
    { id: 1, title: '技术', slug: 'tech' },
    { id: 2, title: '生活', slug: 'life' },
    { id: 3, title: '随笔', slug: 'essay' },
  ]
  const mediaList: MediaSummary[] = [
    { id: 1, alt: '示例图片', url: '/media/example.jpg', mimeType: 'image/jpeg', width: 800, height: 600 },
  ]

  return {
    async getIdentity(ctx: ActorContext): Promise<CurrentUser> {
      return {
        id: ctx.userID,
        name: ctx.role === 'admin' ? '管理员' : '作者',
        role: ctx.role,
        capabilities: ctx.role === 'admin'
          ? ['read:all', 'write:all', 'manage:users', 'manage:settings']
          : ['read:own', 'write:own'],
      }
    },

    async listPosts(ctx: ActorContext, params): Promise<PageResult<PostSummary>> {
      const all = Array.from(posts.values())
      // 过滤
      let filtered = all
      if (params.state) {
        filtered = filtered.filter((p) => p.state === params.state)
      }
      if (params.categoryID) {
        filtered = filtered.filter((p) => p.categoryIDs.includes(params.categoryID!))
      }
      // 权限过滤：作者只看自己的
      if (ctx.role === 'author') {
        filtered = filtered.filter((p) => p.id <= nextId) // 暂存全部可见
      }
      // 分页
      const page = params.page || 1
      const limit = Math.min(params.limit || 12, 50)
      const total = filtered.length
      const totalPages = Math.ceil(total / limit) || 1
      const start = (page - 1) * limit
      const items = filtered.slice(start, start + limit).map(({ markdown: _m, ...rest }) => rest)

      return {
        items,
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      }
    },

    async getPost(_ctx: ActorContext, params): Promise<PostDetail> {
      let post: (PostSummary & { markdown?: string }) | undefined
      if (params.id) {
        post = posts.get(params.id)
      } else if (params.slug) {
        post = Array.from(posts.values()).find((p) => p.slug === params.slug)
      }

      if (!post) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }

      return {
        ...post,
        markdown: post.markdown || '',
        contentReplaceable: true,
        warnings: [],
      }
    },

    async searchPosts(_ctx: ActorContext, params): Promise<PageResult<PostSummary>> {
      const query = params.query.toLowerCase()
      const all = Array.from(posts.values())
      const filtered = all.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.summary && p.summary.toLowerCase().includes(query)),
      )
      const page = params.page || 1
      const limit = Math.min(params.limit || 12, 50)
      const total = filtered.length
      const totalPages = Math.ceil(total / limit) || 1
      const start = (page - 1) * limit
      const items = filtered.slice(start, start + limit).map(({ markdown: _m, ...rest }) => rest)

      return {
        items,
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      }
    },

    async listCategories(_ctx: ActorContext, params): Promise<PageResult<CategorySummary>> {
      const page = params.page || 1
      const limit = Math.min(params.limit || 50, 100)
      const total = categories.length
      const totalPages = Math.ceil(total / limit) || 1
      const start = (page - 1) * limit

      return {
        items: categories.slice(start, start + limit),
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      }
    },

    async listMedia(_ctx: ActorContext, params): Promise<PageResult<MediaSummary>> {
      const page = params.page || 1
      const limit = Math.min(params.limit || 50, 100)
      let items = mediaList
      if (params.query) {
        const q = params.query.toLowerCase()
        items = items.filter((m) => m.alt.toLowerCase().includes(q))
      }
      const total = items.length
      const totalPages = Math.ceil(total / limit) || 1
      const start = (page - 1) * limit

      return {
        items: items.slice(start, start + limit),
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
      }
    },

    async createPost(ctx: ActorContext, params: CreatePostParams): Promise<PostSummary> {
      const id = nextId++
      const now = nowISO()
      const slug = params.slug || `post-${id}`
      // 检查幂等
      for (const post of posts.values()) {
        // 暂未实现真实幂等存储
      }

      const post: PostSummary & { markdown?: string } = {
        id,
        slug,
        title: params.title,
        summary: params.summary || null,
        state: 'draft',
        revision: 1,
        categoryIDs: params.categoryIDs || [],
        heroImageID: params.heroImageID || null,
        updatedAt: now,
        publishedAt: null,
        publicURL: null,
        markdown: params.markdown,
      }
      posts.set(id, post)

      const { markdown: _m, ...summary } = post
      return summary
    },

    async updatePost(_ctx: ActorContext, params: UpdatePostParams): Promise<PostSummary> {
      const existing = posts.get(params.id)
      if (!existing) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }
      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' as const })
      }

      const updated = {
        ...existing,
        title: params.title ?? existing.title,
        summary: params.summary !== undefined ? params.summary : existing.summary,
        markdown: params.markdown ?? existing.markdown,
        categoryIDs: params.categoryIDs ?? existing.categoryIDs,
        heroImageID: params.heroImageID !== undefined ? params.heroImageID : existing.heroImageID,
        revision: existing.revision + 1,
        updatedAt: nowISO(),
      }
      posts.set(params.id, updated)

      const { markdown: _m, ...summary } = updated
      return summary
    },

    async publishPost(_ctx: ActorContext, params): Promise<PostSummary> {
      const existing = posts.get(params.id)
      if (!existing) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }
      if (existing.state === 'trashed') {
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' as const })
      }
      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' as const })
      }

      const now = nowISO()
      const updated = {
        ...existing,
        state: 'published' as const,
        publishedAt: existing.publishedAt || now,
        publicURL: `/posts/${existing.slug}`,
        revision: existing.state === 'published' ? existing.revision : existing.revision + 1,
        updatedAt: now,
      }
      posts.set(params.id, updated)

      const { markdown: _m, ...summary } = updated
      return summary
    },

    async unpublishPost(_ctx: ActorContext, params): Promise<PostSummary> {
      const existing = posts.get(params.id)
      if (!existing) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }
      if (existing.state === 'trashed') {
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' as const })
      }
      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' as const })
      }

      const updated = {
        ...existing,
        state: 'draft' as const,
        publicURL: null,
        revision: existing.revision + 1,
        updatedAt: nowISO(),
      }
      posts.set(params.id, updated)

      const { markdown: _m, ...summary } = updated
      return summary
    },

    async trashPost(_ctx: ActorContext, params): Promise<PostSummary> {
      const existing = posts.get(params.id)
      if (!existing) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }
      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' as const })
      }

      const updated = {
        ...existing,
        state: 'trashed' as const,
        publicURL: null,
        revision: existing.revision + 1,
        updatedAt: nowISO(),
      }
      posts.set(params.id, updated)

      const { markdown: _m, ...summary } = updated
      return summary
    },

    async restorePost(_ctx: ActorContext, params): Promise<PostSummary> {
      const existing = posts.get(params.id)
      if (!existing) {
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const })
      }
      if (existing.state !== 'trashed') {
        throw Object.assign(new Error('INVALID_STATE'), { code: 'INVALID_STATE' as const })
      }
      if (existing.revision !== params.expectedRevision) {
        throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' as const })
      }

      const updated = {
        ...existing,
        state: 'draft' as const,
        revision: existing.revision + 1,
        updatedAt: nowISO(),
      }
      posts.set(params.id, updated)

      const { markdown: _m, ...summary } = updated
      return summary
    },
  }
}