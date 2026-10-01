/**
 * MCP Blog Studio — v1 核心契约与类型定义
 *
 * 本文是双人开发交接基线，由 A 侧统一维护。
 * 双方共同确认后修改，变更需另一方 review。
 */

// ─── 认证上下文 ───────────────────────────────────────────

/** 服务端生成的认证上下文，客户端不允许传 owner/role/where 等字段 */
export interface ActorContext {
  userID: number
  role: 'admin' | 'author'
  keyID: number
  requestID: string
  source: 'mcp'
}

// ─── 文章状态 ───────────────────────────────────────────

export type PostState = 'draft' | 'published' | 'trashed'

// ─── DTO ───────────────────────────────────────────

/** 文章摘要（列表返回） */
export interface PostSummary {
  id: number
  slug: string
  title: string
  summary: string | null
  state: PostState
  revision: number
  categoryIDs: number[]
  heroImageID: number | null
  updatedAt: string // ISO 8601
  publishedAt: string | null // ISO 8601
  publicURL: string | null
}

/** 文章详情（含正文） */
export interface PostDetail extends PostSummary {
  markdown: string
  contentReplaceable: boolean
  warnings: string[]
}

/** 通用分页结果 */
export interface PageResult<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

/** 分类信息 */
export interface CategorySummary {
  id: number
  title: string
  slug: string
}

/** 媒体信息 */
export interface MediaSummary {
  id: number
  alt: string
  url: string
  mimeType: string
  width: number
  height: number
}

/** 当前用户信息 */
export interface CurrentUser {
  id: number
  name: string
  role: 'admin' | 'author'
  capabilities: string[]
}

// ─── 错误码 ───────────────────────────────────────────

export type BlogErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_REFERENCE'
  | 'VERSION_CONFLICT'
  | 'REQUEST_CONFLICT'
  | 'INVALID_STATE'
  | 'UNSUPPORTED_CONTENT'
  | 'INTERNAL_ERROR'

export interface BlogError {
  code: BlogErrorCode
  message: string
  requestId?: string
}

// ─── 工具参数 ───────────────────────────────────────────

/** 通用分页参数 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** list_posts */
export interface ListPostsParams extends PaginationParams {
  state?: PostState
  categoryID?: number
}

/** get_post — id 和 slug 必须且只能提供一个 */
export interface GetPostParams {
  id?: number
  slug?: string
}

/** search_posts */
export interface SearchPostsParams extends PaginationParams {
  query: string
  state?: PostState
  categoryID?: number
}

/** list_categories */
export interface ListCategoriesParams extends PaginationParams {}

/** list_media */
export interface ListMediaParams extends PaginationParams {
  query?: string
}

/** create_post */
export interface CreatePostParams {
  requestId: string // UUID
  title: string // 1–200 字符
  markdown: string // 1–100000 字符
  summary?: string // 最多 500 字符
  categoryIDs?: number[]
  heroImageID?: number | null
  slug?: string // 最多 120 字符
}

/** update_post — 至少提供一个修改字段 */
export interface UpdatePostParams {
  id: number
  expectedRevision: number
  title?: string
  summary?: string | null
  markdown?: string
  categoryIDs?: number[]
  heroImageID?: number | null
}

/** publish_post */
export interface PublishPostParams {
  id: number
  expectedRevision: number
}

/** unpublish_post */
export interface UnpublishPostParams {
  id: number
  expectedRevision: number
}

/** trash_post */
export interface TrashPostParams {
  id: number
  expectedRevision: number
}

/** restore_post */
export interface RestorePostParams {
  id: number
  expectedRevision: number
}

// ─── 工具结果 ───────────────────────────────────────────

/** MCP 工具调用的业务结果 */
export interface ToolResult<T = unknown> {
  ok: boolean
  data?: T
  error?: BlogError
  requestId: string
}

// ─── Markdown 转换器接口 ─────────────────────────────

/** 已解析的媒体引用，供转换器将 markdown 图片标记映射到数据库媒体 */
export interface ResolvedMedia {
  url: string
  id: number
  alt: string
}

export interface MarkdownConverter {
  /** Markdown → Payload RichText */
  fromMarkdown(markdown: string, resolvedMedia: ResolvedMedia[]): unknown

  /** 检查 RichText 是否可无损替换 */
  inspectRichText(content: unknown): { contentReplaceable: boolean; warnings: string[] }

  /** Payload RichText → Markdown */
  toMarkdown(content: unknown, resolvedMedia: ResolvedMedia[]): { markdown: string; warnings: string[] }
}

// ─── 服务接口 ───────────────────────────────────────────

/** BlogService — 业务层接口，工具层仅负责参数映射 */
export interface BlogService {
  // 身份
  getIdentity(ctx: ActorContext): Promise<CurrentUser>

  // 读
  listPosts(ctx: ActorContext, params: ListPostsParams): Promise<PageResult<PostSummary>>
  getPost(ctx: ActorContext, params: GetPostParams): Promise<PostDetail>
  searchPosts(ctx: ActorContext, params: SearchPostsParams): Promise<PageResult<PostSummary>>

  // 分类/媒体
  listCategories(ctx: ActorContext, params: ListCategoriesParams): Promise<PageResult<CategorySummary>>
  listMedia(ctx: ActorContext, params: ListMediaParams): Promise<PageResult<MediaSummary>>

  // 写
  createPost(ctx: ActorContext, params: CreatePostParams): Promise<PostSummary>
  updatePost(ctx: ActorContext, params: UpdatePostParams): Promise<PostSummary>
  publishPost(ctx: ActorContext, params: PublishPostParams): Promise<PostSummary>
  unpublishPost(ctx: ActorContext, params: UnpublishPostParams): Promise<PostSummary>
  trashPost(ctx: ActorContext, params: TrashPostParams): Promise<PostSummary>
  restorePost(ctx: ActorContext, params: RestorePostParams): Promise<PostSummary>
}