import type { CollectionConfig } from 'payload'
import { activeUser, ownContent, signedIn } from '@/access/roles'
import crypto from 'crypto'

/**
 * 生成密钥：mcp_ + 48 字符随机字符串
 * 返回 { rawKey, prefix, hash }
 */
function generateKey(): { rawKey: string; prefix: string; hash: string } {
  const bytes = crypto.randomBytes(36)
  const rawKey = 'mcp_' + bytes.toString('base64url')
  const prefix = rawKey.slice(0, 12) // "mcp_xxxxx..."
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex')
  return { rawKey, prefix, hash }
}

export const MCPKeys: CollectionConfig = {
  slug: 'mcp-keys',
  labels: { singular: 'MCP 密钥', plural: 'MCP 密钥' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'prefix', 'owner', 'createdAt', 'revokedAt'],
    description: '个人 API 密钥，用于 MCP 客户端认证。明文仅创建时显示一次。',
    components: {
      edit: { SaveButton: '@/components/MCPKeys/EditView#MCPKeySaveButton' },
    },
  },
  access: {
    create: signedIn,          // 登录用户均可创建自己的密钥
    read: ownContent,          // 仅看自己的，管理员看全部
    update: () => false,       // 不能修改，只能撤销
    delete: () => false,       // 不能删除
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      label: '名称',
      maxLength: 100,
      admin: { description: '给你的密钥起个名字，比如"我的 Codex 密钥"' },
    },
    {
      name: 'prefix',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true, description: '密钥前缀，用于识别' },
      label: '前缀',
    },
    {
      name: 'hash',
      type: 'text',
      required: true,
      admin: { readOnly: true, hidden: true },
      access: { read: () => false },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
      label: '所有者',
    },
    {
      name: 'revokedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: '留空持续有效；填写未来时间将在该时间失效，填写当前或过去时间立即失效。',
      },
      label: '撤销时间',
    },
  ],
  hooks: {
    beforeChange: [
      // 创建时自动生成密钥（仅当自定义端点未提供时）
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        if (data.prefix) return data // 自定义端点已生成，跳过
        const { rawKey, prefix, hash } = generateKey()
        data.prefix = prefix
        data.hash = hash
        data.owner = req.user?.id
        // Request-local only: the plaintext is never part of the stored document.
        req.context.mcpCreatedKey = { rawKey, prefix }
        return data
      },
    ],
    afterChange: [
      // 创建后打印日志
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          console.log(`[MCP] 密钥已创建: ${doc.prefix} (owner: ${doc.owner})`)
          const created = req.context.mcpCreatedKey as { rawKey: string; prefix: string } | undefined
          delete req.context.mcpCreatedKey
          if (created && created.prefix === doc.prefix) {
            req.responseHeaders ??= new Headers()
            req.responseHeaders.set('Cache-Control', 'no-store')
            return { ...doc, key: created.rawKey }
          }
        }
      },
    ],
  },
  endpoints: [
    // 自定义端点：创建密钥时返回明文
    {
      path: '/create-with-key',
      method: 'post',
      handler: async (req) => {
        const payload = req.payload
        const user = req.user
        if (!user || !activeUser(user)) return Response.json({ error: '请先登录有效账号' }, { status: 401 })

        let body: unknown
        try { body = await req.json?.() }
        catch { return Response.json({ error: '请求必须是有效的 JSON' }, { status: 400 }) }
        const label = typeof body === 'object' && body !== null && 'label' in body && typeof body.label === 'string'
          ? body.label.trim() : ''
        if (!label || label.length > 100) return Response.json({ error: '名称须为 1–100 字符' }, { status: 400 })

        const { rawKey, prefix, hash } = generateKey()

        const doc = await payload.create({
          collection: 'mcp-keys',
          data: { label, prefix, hash, owner: user.id, revokedAt: null },
          overrideAccess: false,
          req,
        })

        // 返回完整密钥（仅此一次）
        return Response.json({
          id: doc.id,
          label: doc.label,
          prefix: doc.prefix,
          key: rawKey,
          note: '请立即保存此密钥，它不会再显示。',
        }, { headers: { 'Cache-Control': 'no-store' } })
      },
    },
  ],
}

/** 校验 Bearer token，返回 owner ID 和 key ID（如果有效） */
export async function validateMCPToken(
  payload: ReturnType<typeof import('payload').getPayload> extends Promise<infer T> ? T : never,
  token: string,
): Promise<{ userID: number; keyID: number; role: string } | null> {
  const hash = crypto.createHash('sha256').update(token).digest('hex')

  const result = await payload.find({
    collection: 'mcp-keys',
    where: { hash: { equals: hash } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })

  if (result.docs.length === 0) return null

  const key = result.docs[0] as unknown as { id: number; owner: number | { id: number }; revokedAt?: string | null }
  // Scheduled revocation becomes effective at the stored timestamp, including equality.
  if (key.revokedAt) {
    const revokedAt = Date.parse(key.revokedAt)
    if (!Number.isFinite(revokedAt) || revokedAt <= Date.now()) return null
  }

  const ownerId = typeof key.owner === 'object' ? key.owner.id : key.owner

  // 查用户状态
  const user = await payload.findByID({
    collection: 'users',
    id: ownerId,
    depth: 0,
    overrideAccess: true,
  }) as unknown as { id: number; role: string; active?: boolean | null }

  if (user.active === false) return null

  return { userID: ownerId, keyID: key.id, role: user.role }
}
