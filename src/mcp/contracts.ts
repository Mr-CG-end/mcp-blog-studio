import { z } from 'zod'

/** Created only by server-side authentication, never from tool arguments. */
export type ActorContext = Readonly<{
  userID: number
  role: 'admin' | 'author'
  keyID: number
  requestID: string
  source: 'mcp'
}>

export type PostState = 'draft' | 'published' | 'trashed'

const id = z.number().int().positive()
const state = z.enum(['draft', 'published', 'trashed'])
const pagination = { page: id.default(1), limit: id.max(50).default(12) }
const fields = {
  title: z.string().min(1).max(200),
  summary: z.string().max(500),
  markdown: z.string().min(1).max(100000),
  categoryIDs: z.array(id),
  heroImageID: id.nullable(),
}
export const revisionInput = z.object({ id, expectedRevision: id }).strict()
export const inputs = {
  getIdentity: z.object({}).strict(),
  listPosts: z.object({ ...pagination, state: state.optional(), categoryID: id.optional() }).strict(),
  getPost: z.object({ id: id.optional(), slug: z.string().min(1).max(120).optional() }).strict()
    .refine((value) => (value.id === undefined) !== (value.slug === undefined), 'Exactly one of id or slug is required'),
  searchPosts: z.object({ ...pagination, query: z.string().min(1).max(200), state: state.optional(), categoryID: id.optional() }).strict(),
  listCategories: z.object(pagination).strict(),
  listMedia: z.object({ ...pagination, query: z.string().min(1).max(200).optional() }).strict(),
  createPost: z.object({ requestId: z.string().uuid(), title: fields.title, markdown: fields.markdown,
    summary: fields.summary.optional(), categoryIDs: fields.categoryIDs.optional(),
    heroImageID: fields.heroImageID.optional(), slug: z.string().min(1).max(120).optional() }).strict(),
  updatePost: revisionInput.extend({ title: fields.title.optional(), summary: fields.summary.optional(),
    markdown: fields.markdown.optional(), categoryIDs: fields.categoryIDs.optional(), heroImageID: fields.heroImageID.optional() })
    .refine((value) => Object.keys(fields).some((key) => value[key as keyof typeof value] !== undefined), 'At least one changed field is required'),
  publishPost: revisionInput,
  unpublishPost: revisionInput,
  trashPost: revisionInput,
  restorePost: revisionInput,
}
export const postSummarySchema = z.object({
  id, slug: z.string(), title: z.string(), summary: z.string().nullable(), state, revision: id,
  categoryIDs: z.array(id), heroImageID: id.nullable(), updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(), publicURL: z.string().url().nullable(),
}).strict()
const pageOf = <T extends z.ZodTypeAny>(item: T) => z.object({
  items: z.array(item), page: id, limit: id.max(50), total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(), hasNextPage: z.boolean(),
}).strict()
export const outputs = {
  getIdentity: z.object({ id, name: z.string(), role: z.enum(['admin', 'author']), capabilities: z.array(z.string()) }).strict(),
  listPosts: pageOf(postSummarySchema),
  getPost: postSummarySchema.extend({ markdown: z.string(), contentReplaceable: z.boolean(), warnings: z.array(z.string()) }),
  searchPosts: pageOf(postSummarySchema),
  listCategories: pageOf(z.object({ id, title: z.string(), slug: z.string() }).strict()),
  listMedia: pageOf(z.object({ id, alt: z.string().nullable(), url: z.string(), mimeType: z.string().nullable(), width: z.number().nullable(), height: z.number().nullable() }).strict()),
  createPost: postSummarySchema, updatePost: postSummarySchema, publishPost: postSummarySchema,
  unpublishPost: postSummarySchema, trashPost: postSummarySchema, restorePost: postSummarySchema,
}
export type PostSummary = z.infer<typeof postSummarySchema>
export type PostDetail = z.infer<typeof outputs.getPost>
export type PageResult<T> = { items: T[]; page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean }
export type CategorySummary = z.infer<(typeof outputs)['listCategories']>['items'][number]
export type MediaSummary = z.infer<(typeof outputs)['listMedia']>['items'][number]
export type CurrentUser = z.infer<(typeof outputs)['getIdentity']>
export type CreatePostParams = BlogInput<'createPost'>
export type UpdatePostParams = BlogInput<'updatePost'>
export type BlogMethod = keyof typeof inputs
export type BlogInput<K extends BlogMethod> = z.infer<(typeof inputs)[K]>
export type BlogOutput<K extends BlogMethod> = z.infer<(typeof outputs)[K]>
export type BlogService = { [K in BlogMethod]: (actor: ActorContext, input: BlogInput<K>) => Promise<BlogOutput<K>> }
export type ReadBlogService = Pick<BlogService, 'getIdentity' | 'listPosts' | 'getPost' | 'searchPosts' | 'listCategories' | 'listMedia'>
export type WriteBlogService = Omit<BlogService, keyof ReadBlogService>
