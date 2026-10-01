import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

export async function audit(
  req: PayloadRequest,
  action: string,
  target: string,
  result: 'success' | 'failure' = 'success',
  code?: string,
) {
  if (!req.user) return
  // Internal append-only sink: public create/update/delete are deliberately forbidden.
  await req.payload.create({
    collection: 'audit-logs',
    overrideAccess: true,
    req,
    data: {
      actor: req.user.id,
      action,
      target,
      result,
      code,
      source: req.context.source === 'mcp' ? 'mcp' : 'admin-api',
    },
  })
}
export const auditPost: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const action = req.context.isRestoringVersion
    ? 'restore-version'
    : operation === 'create'
      ? 'create'
      : doc.deletedAt && !previousDoc?.deletedAt
        ? 'trash'
        : previousDoc?.deletedAt && !doc.deletedAt
          ? 'restore'
          : doc._status !== previousDoc?._status
            ? doc._status === 'published'
              ? 'publish'
              : 'unpublish'
            : 'update'
  await audit(req, action, String(doc.id))
  return doc
}
export const auditDeleted: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await audit(req, 'permanent-delete', String(doc.id))
  return doc
}
