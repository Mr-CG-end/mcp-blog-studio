import type { Access } from 'payload'
import { isAdmin } from './roles'
export const authenticatedOrPublished: Access = ({ req }) =>
  isAdmin(req.user) ? true : { _status: { equals: 'published' } }
