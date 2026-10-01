import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { APIError, type CollectionBeforeChangeHook } from 'payload'
import { isAdmin } from '@/access/roles'
import { plainText } from '@/services/content'

export const enforcePost: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation === 'create') {
    data.owner = isAdmin(req.user) && data.owner ? data.owner : req.user?.id
    data.authors = data.authors?.length ? data.authors : [req.user?.id]
    data.revision = 1
    data._status = data._status || 'draft'
  } else {
    if (!isAdmin(req.user))
      data.owner = typeof originalDoc.owner === 'object' ? originalDoc.owner.id : originalDoc.owner
    const transactionID = await req.transactionID
    const transaction =
      transactionID != null
        ? (req.payload.db as unknown as PostgresAdapter).sessions[transactionID]?.db
        : undefined
    if (!transaction) throw new APIError('文章写入必须在数据库事务中执行', 500)
    // Lock the current row before validating the submitted revision. It serializes all
    // writers (admin, REST and MCP), not just writes within a single Node process.
    const result = await transaction.execute(
      sql`SELECT revision FROM posts WHERE id = ${originalDoc.id} FOR UPDATE`,
    )
    const current = Number(result.rows[0]?.revision)
    const expected = req.context.isRestoringVersion
      ? originalDoc.revision
      : (data.revision ?? (Object.hasOwn(data, 'deletedAt') ? originalDoc.revision : undefined))
    if (expected === undefined || Number(expected) !== current)
      throw new APIError('VERSION_CONFLICT：文章已被修改，请重新读取后再提交', 409)
    data.revision = current + 1
    if (req.context.isRestoringVersion) {
      data.owner = typeof originalDoc.owner === 'object' ? originalDoc.owner.id : originalDoc.owner
      data.slug = originalDoc.slug
      data.deletedAt = originalDoc.deletedAt
      data._status = 'draft'
    }
    if (originalDoc.deletedAt && data.deletedAt === null) data._status = 'draft'
    if (data.deletedAt) data._status = 'draft'
  }
  if (data.content) data.searchText = plainText(data.content)
  if (data._status === 'published' && !data.publishedAt && !originalDoc?.publishedAt)
    data.publishedAt = new Date().toISOString()
  return data
}
