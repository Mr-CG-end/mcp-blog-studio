import configPromise from '@payload-config'
import { getPayload, type Payload, type Where } from 'payload'
import { BlogError } from '@/mcp/errors'
import { markdownConverter } from './markdown'
import type { MarkdownConverter } from './markdown'
import type {
  ActorContext,
  BlogInput,
  BlogOutput,
  PageResult,
  PostDetail,
  PostState,
  PostSummary,
  ReadBlogService,
} from '@/mcp/contracts'

let cachedPayload: Payload | null = null

async function getOrInitPayload(): Promise<Payload> {
  if (!cachedPayload) {
    cachedPayload = await getPayload({ config: configPromise })
  }
  return cachedPayload
}

function getServerUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

function extractOwnerId(owner: unknown): number | null {
  if (typeof owner === 'number') return owner
  if (typeof owner === 'object' && owner !== null && 'id' in owner) {
    const id = (owner as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

function toPostSummary(doc: Record<string, unknown>, serverUrl: string): PostSummary {
  const isTrashed = Boolean(doc.deletedAt)
  const status = typeof doc._status === 'string' ? doc._status : 'draft'
  const state: PostState = isTrashed ? 'trashed' : status === 'published' ? 'published' : 'draft'
  const slug = typeof doc.slug === 'string' ? doc.slug : `post-${doc.id}`
  const publicURL = state === 'published' ? `${serverUrl}/posts/${slug}` : null

  const categoryIDs: number[] = []
  if (Array.isArray(doc.categories)) {
    for (const cat of doc.categories) {
      if (typeof cat === 'number') categoryIDs.push(cat)
      else if (typeof cat === 'object' && cat !== null && 'id' in cat) {
        const id = (cat as { id: unknown }).id
        if (typeof id === 'number') categoryIDs.push(id)
      }
    }
  }

  let heroImageID: number | null = null
  if (typeof doc.heroImage === 'number') {
    heroImageID = doc.heroImage
  } else if (typeof doc.heroImage === 'object' && doc.heroImage !== null && 'id' in doc.heroImage) {
    const id = (doc.heroImage as { id: unknown }).id
    if (typeof id === 'number') heroImageID = id
  }

  return {
    id: typeof doc.id === 'number' ? doc.id : Number(doc.id),
    slug,
    title: typeof doc.title === 'string' ? doc.title : '',
    summary: typeof doc.summary === 'string' ? doc.summary : null,
    state,
    revision: typeof doc.revision === 'number' ? doc.revision : 1,
    categoryIDs,
    heroImageID,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string).toISOString() : new Date().toISOString(),
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt as string).toISOString() : null,
    publicURL,
  }
}

/**
 * 构造符合角色访问控制（readPosts）与状态筛选的 Where 条件。
 */
function buildStateAndAccessWhere(actor: ActorContext, stateFilter?: PostState): Where {
  const isAdmin = actor.role === 'admin'
  const isAuthor = actor.role === 'author'
  const ownerWhere: Where = { owner: { equals: actor.userID } }

  // 1. 显式查询回收站：deletedAt exists: true
  if (stateFilter === 'trashed') {
    const trashedBase: Where = { deletedAt: { exists: true } }
    return isAdmin ? trashedBase : { and: [trashedBase, ownerWhere] }
  }

  // 2. 显式查询草稿：_status: draft 且未被回收
  if (stateFilter === 'draft') {
    const draftBase: Where = {
      and: [{ _status: { equals: 'draft' } }, { deletedAt: { exists: false } }],
    }
    return isAdmin ? draftBase : { and: [draftBase, ownerWhere] }
  }

  // 3. 显式查询已发布：_status: published 且未被回收
  if (stateFilter === 'published') {
    return {
      and: [{ _status: { equals: 'published' } }, { deletedAt: { exists: false } }],
    }
  }

  // 4. 未指定状态（默认列表）：排除回收站，普通作者查已发布 + 自己的草稿；管理员查全部未回收内容
  const notTrashed: Where = { deletedAt: { exists: false } }
  if (isAdmin) {
    return notTrashed
  }
  if (isAuthor) {
    return {
      and: [
        notTrashed,
        {
          or: [{ _status: { equals: 'published' } }, ownerWhere],
        },
      ],
    }
  }

  // 未登录或其它情况仅可看公开已发布文章
  return {
    and: [{ _status: { equals: 'published' } }, notTrashed],
  }
}

export function createReadBlogService(
  customPayload?: Payload,
  converter: MarkdownConverter = markdownConverter,
): ReadBlogService {
  async function getPl(): Promise<Payload> {
    return customPayload || getOrInitPayload()
  }

  return {
    async getIdentity(actor: ActorContext, _input: BlogInput<'getIdentity'>): Promise<BlogOutput<'getIdentity'>> {
      const pl = await getPl()
      let name = actor.role === 'admin' ? '管理员' : '作者'
      try {
        const user = await pl.findByID({
          collection: 'users',
          id: actor.userID,
          overrideAccess: true,
          depth: 0,
        })
        if (user && typeof user.name === 'string') {
          name = user.name
        }
      } catch {
        // 用户查询失败时使用基于角色的默认名称
      }

      return {
        id: actor.userID,
        name,
        role: actor.role,
        capabilities:
          actor.role === 'admin'
            ? ['read:all', 'write:all', 'manage:users', 'manage:settings']
            : ['read:own', 'write:own'],
      }
    },

    async listPosts(actor, input): Promise<PageResult<PostSummary>> {
      const pl = await getPl()
      const serverUrl = getServerUrl()
      const conditions: Where[] = [buildStateAndAccessWhere(actor, input.state)]

      if (input.categoryID) {
        conditions.push({ categories: { contains: input.categoryID } })
      }

      const page = input.page || 1
      const limit = Math.min(input.limit || 12, 50)

      const result = await pl.find({
        collection: 'posts',
        where: { and: conditions },
        overrideAccess: true,
        page,
        limit,
        sort: ['-updatedAt'],
        depth: 0,
      })

      return {
        items: result.docs.map((d) => toPostSummary(d as unknown as Record<string, unknown>, serverUrl)),
        page: result.page || 1,
        limit: result.limit || limit,
        total: result.totalDocs || 0,
        totalPages: result.totalPages || 0,
        hasNextPage: result.hasNextPage || false,
      }
    },

    async getPost(actor, input): Promise<PostDetail> {
      const pl = await getPl()
      const serverUrl = getServerUrl()
      const whereCondition: Where =
        input.id !== undefined
          ? { id: { equals: input.id } }
          : { slug: { equals: input.slug! } }

      const result = await pl.find({
        collection: 'posts',
        where: whereCondition,
        overrideAccess: true,
        limit: 1,
        depth: 1,
      })

      const doc = result.docs[0] as unknown as Record<string, unknown> | undefined
      if (!doc) {
        throw new BlogError('NOT_FOUND', '文章不存在')
      }

      const isTrashed = Boolean(doc.deletedAt)
      const isPublished = doc._status === 'published' && !isTrashed
      const docOwner = extractOwnerId(doc.owner)

      // 权限检查：非公开文章（草稿或回收站），非管理员且非作者本人统一返回 NOT_FOUND
      if (!isPublished && actor.role !== 'admin' && docOwner !== actor.userID) {
        throw new BlogError('NOT_FOUND', '文章不存在')
      }

      const summary = toPostSummary(doc, serverUrl)
      const converted = await converter.toMarkdown(doc.content)

      return {
        ...summary,
        markdown: converted.markdown,
        contentReplaceable: converted.contentReplaceable,
        warnings: converted.warnings,
      }
    },

    async searchPosts(actor, input): Promise<PageResult<PostSummary>> {
      const pl = await getPl()
      const serverUrl = getServerUrl()
      const trimmedQuery = input.query.trim()
      const conditions: Where[] = [buildStateAndAccessWhere(actor, input.state)]

      if (input.categoryID) {
        conditions.push({ categories: { contains: input.categoryID } })
      }

      if (trimmedQuery) {
        conditions.push({
          or: [
            { title: { like: trimmedQuery } },
            { summary: { like: trimmedQuery } },
            { searchText: { like: trimmedQuery } },
          ],
        })
      }

      const page = input.page || 1
      const limit = Math.min(input.limit || 12, 50)

      const result = await pl.find({
        collection: 'posts',
        where: { and: conditions },
        overrideAccess: true,
        page,
        limit,
        sort: ['-updatedAt'],
        depth: 0,
      })

      return {
        items: result.docs.map((d) => toPostSummary(d as unknown as Record<string, unknown>, serverUrl)),
        page: result.page || 1,
        limit: result.limit || limit,
        total: result.totalDocs || 0,
        totalPages: result.totalPages || 0,
        hasNextPage: result.hasNextPage || false,
      }
    },

    async listCategories(_actor, input): Promise<PageResult<{ id: number; title: string; slug: string }>> {
      const pl = await getPl()
      const page = input.page || 1
      const limit = Math.min(input.limit || 12, 50)

      const result = await pl.find({
        collection: 'categories',
        overrideAccess: true,
        page,
        limit,
        sort: 'title',
        depth: 0,
      })

      return {
        items: result.docs.map((c) => ({
          id: typeof c.id === 'number' ? c.id : Number(c.id),
          title: typeof c.title === 'string' ? c.title : '',
          slug: typeof c.slug === 'string' ? c.slug : '',
        })),
        page: result.page || 1,
        limit: result.limit || limit,
        total: result.totalDocs || 0,
        totalPages: result.totalPages || 0,
        hasNextPage: result.hasNextPage || false,
      }
    },

    async listMedia(_actor, input): Promise<PageResult<{
      id: number
      alt: string | null
      url: string
      mimeType: string | null
      width: number | null
      height: number | null
    }>> {
      const pl = await getPl()
      const conditions: Where[] = []
      const trimmedQuery = input.query?.trim()

      if (trimmedQuery) {
        conditions.push({
          or: [
            { alt: { like: trimmedQuery } },
            { filename: { like: trimmedQuery } },
          ],
        })
      }

      const page = input.page || 1
      const limit = Math.min(input.limit || 12, 50)

      const result = await pl.find({
        collection: 'media',
        where: conditions.length > 0 ? { and: conditions } : undefined,
        overrideAccess: true,
        page,
        limit,
        sort: ['-updatedAt'],
        depth: 0,
      })

      return {
        items: result.docs.map((m) => {
          const id = typeof m.id === 'number' ? m.id : Number(m.id)
          const url = typeof m.url === 'string' && m.url
            ? m.url
            : typeof m.filename === 'string'
              ? `/api/media/file/${m.filename}`
              : ''
          return {
            id,
            alt: typeof m.alt === 'string' ? m.alt : null,
            url,
            mimeType: typeof m.mimeType === 'string' ? m.mimeType : null,
            width: typeof m.width === 'number' ? m.width : null,
            height: typeof m.height === 'number' ? m.height : null,
          }
        }),
        page: result.page || 1,
        limit: result.limit || limit,
        total: result.totalDocs || 0,
        totalPages: result.totalPages || 0,
        hasNextPage: result.hasNextPage || false,
      }
    },
  }
}
