import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type {
  CollectionBeforeDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload'
import { APIError } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { isAdmin } from '@/access/roles'

export async function lockContent(req: PayloadRequest) {
  const id = await req.transactionID
  if (id != null)
    await (req.payload.db as unknown as PostgresAdapter).sessions[id]?.db.execute(
      sql`SELECT pg_advisory_xact_lock(871209)`,
    )
}
export const lockContentChange: CollectionBeforeChangeHook = async ({ data, req }) => {
  await lockContent(req)
  return data
}
export const ownMedia: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  data.owner = originalDoc?.owner
    ? typeof originalDoc.owner === 'object'
      ? originalDoc.owner.id
      : originalDoc.owner
    : req.user?.id
  if (!isAdmin(req.user) && !req.user) throw new APIError('请先登录', 401)
  if (
    req.file &&
    (req.file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype))
  )
    throw new APIError('仅支持 5 MB 以内的 JPEG、PNG、WebP 图片', 400)
  return data
}
export function referencesMedia(value: unknown, id: number): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((v) => referencesMedia(v, id))
  const obj = value as Record<string, unknown>
  const matches = (v: unknown) =>
    Number(typeof v === 'object' && v ? (v as { id?: unknown }).id : v) === id
  if (obj.relationTo === 'media' && matches(obj.value)) return true
  for (const key of ['heroImage', 'media', 'image', 'brandImage'])
    if (obj[key] != null && matches(obj[key])) return true
  return Object.values(obj).some((v) => referencesMedia(v, id))
}
export const protectReferencedMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await lockContent(req)
  const settings = await req.payload.findGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    req,
    depth: 0,
  })
  if (referencesMedia(settings, Number(id)))
    throw new APIError('图片正在被站点设置引用，请先解除引用', 409)
  for (const collection of ['posts', 'pages'] as const) {
    let page = 1
    while (true) {
      // Internal existence check, never returned to the caller; includes other users' drafts.
      const result = await req.payload.find({
        collection,
        overrideAccess: true,
        req,
        trash: true,
        depth: 0,
        page,
        limit: 100,
      })
      if (result.docs.some((doc) => referencesMedia(doc, Number(id))))
        throw new APIError('图片正在被文章或页面引用，请先解除引用', 409)
      if (!result.hasNextPage) break
      page++
    }
  }
}
