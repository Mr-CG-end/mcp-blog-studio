import type { Access, FieldAccess, Where } from 'payload'
import type { User } from '@/payload-types'

type Identity = Pick<User, 'id'> & { role?: string; active?: boolean | null }
export const activeUser = (user?: Identity | null): boolean =>
  Boolean(user && user.active !== false)
export const isAdmin = (user?: Identity | null): boolean =>
  activeUser(user) && user?.role === 'admin'
export const adminOnly: Access = ({ req }) => isAdmin(req.user)
export const adminField: FieldAccess = ({ req }) => isAdmin(req.user)
export const signedIn: Access = ({ req }) => activeUser(req.user)
export const ownContent: Access = ({ req }) => {
  if (!activeUser(req.user)) return false
  return isAdmin(req.user) ? true : { owner: { equals: req.user!.id } }
}
export const publishedWhere: Where = {
  and: [{ _status: { equals: 'published' } }, { deletedAt: { exists: false } }],
}
export const readPosts: Access = ({ req }) => {
  if (isAdmin(req.user)) return true
  if (activeUser(req.user)) return { or: [publishedWhere, { owner: { equals: req.user!.id } }] }
  return publishedWhere
}
export const deletePosts: Access = (args) => {
  if (isAdmin(args.req.user)) return true
  // A hard delete has no deletedAt payload. Restore is checked by update access.
  if (!args.data?.deletedAt) return false
  return ownContent(args)
}

export const ownVersions: Access = ({ req }) => {
  if (!activeUser(req.user)) return false
  return isAdmin(req.user) ? true : { 'version.owner': { equals: req.user!.id } }
}
