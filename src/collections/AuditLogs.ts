import type { CollectionConfig } from 'payload'
import { activeUser, isAdmin } from '@/access/roles'
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: '操作日志', plural: '操作日志' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'actor', 'action', 'target', 'result'],
  },
  access: {
    create: () => false,
    update: () => false,
    delete: () => false,
    read: ({ req }) =>
      isAdmin(req.user) ? true : activeUser(req.user) ? { actor: { equals: req.user!.id } } : false,
  },
  fields: [
    { name: 'actor', type: 'relationship', relationTo: 'users', required: true },
    { name: 'action', type: 'text', required: true },
    { name: 'target', type: 'text', required: true },
    { name: 'source', type: 'select', options: ['mcp', 'admin-api'], required: true },
    { name: 'result', type: 'select', options: ['success', 'failure'], required: true },
    { name: 'code', type: 'text' },
  ],
}
