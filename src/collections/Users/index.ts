import type { CollectionConfig } from 'payload'
import { activeUser, adminField, adminOnly, isAdmin } from '@/access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '账号', plural: '账号' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'avatar', 'role', 'active'] },
  access: {
    admin: ({ req }) => activeUser(req.user),
    create: adminOnly,
    delete: () => false, // Deactivate accounts to retain content ownership and audit history.
    read: ({ req }) =>
      isAdmin(req.user) ? true : activeUser(req.user) ? { id: { equals: req.user!.id } } : false,
    update: ({ req }) =>
      isAdmin(req.user) ? true : activeUser(req.user) ? { id: { equals: req.user!.id } } : false,
  },
  auth: { tokenExpiration: 7200 },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.active === false) throw new Error('账号已停用')
        return user
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (!originalDoc && !isAdmin(req.user) && !req.context.bootstrap)
          throw new Error('账号必须由管理员创建或通过受控脚本初始化')
        if (
          originalDoc?.role === 'admin' &&
          originalDoc.id === req.user?.id &&
          (data.active === false || data.role === 'author')
        ) {
          throw new Error('不能停用或降级当前管理员账号')
        }
        if (!data.avatar && !originalDoc?.avatar) {
          try {
            const presets = await req.payload.find({
              collection: 'media',
              where: {
                'importSource.batch': { equals: 'preset-avatars' },
              },
              limit: 10,
              depth: 0,
            })
            if (presets.docs.length > 0) {
              const chosen = presets.docs[Math.floor(Math.random() * presets.docs.length)]
              data.avatar = chosen.id
            }
          } catch {
            // fallback gracefully
          }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: '用户头像',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'author',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '作者', value: 'author' },
      ],
      access: { create: adminField, update: adminField },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      access: { create: adminField, update: adminField },
    },
  ],
  timestamps: true,
}
