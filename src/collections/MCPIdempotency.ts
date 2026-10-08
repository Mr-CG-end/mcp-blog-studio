import type { CollectionConfig } from 'payload'

/**
 * 幂等记录表：防止相同 requestId 重复创建文章
 */
export const MCPIdempotency: CollectionConfig = {
  slug: 'mcp-idempotency',
  admin: { hidden: true }, // 不在后台显示
  access: {
    create: () => true,
    read: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'idemKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: '幂等键（keyID:requestId）',
    },
    {
      name: 'inputHash',
      type: 'text',
      required: true,
      label: '输入哈希',
    },
    {
      name: 'postID',
      type: 'number',
      required: true,
      label: '文章 ID',
    },
  ],
}
