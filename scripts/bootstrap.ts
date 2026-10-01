import { loadEnv } from 'payload/node'
loadEnv()
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password || password.length < 12)
    throw new Error('请设置 ADMIN_EMAIL 和至少 12 位的 ADMIN_PASSWORD')
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs) throw new Error('已有用户，初始化已拒绝；请由现有管理员创建账号')
  await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { bootstrap: true },
    data: { email, password, name: '管理员', role: 'admin', active: true },
  })
  console.log('管理员创建成功，请前往 /admin 登录。')
} finally {
  await payload.destroy()
}

process.exit(0)
