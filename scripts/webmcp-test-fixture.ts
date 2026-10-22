import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadEnv } from 'payload/node'

// Explicit isolated test settings take precedence over developer .env files.
try {
  const environment = JSON.parse(await readFile('.local/webmcp-test-env.json', 'utf8')) as Record<string, unknown>
  for (const [key, value] of Object.entries(environment)) {
    if (typeof value !== 'string') throw new Error('Test environment values must be strings')
    process.env[key] ??= value
  }
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
}
loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Fixture requires the isolated localhost blog_studio database')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { createMarkdownConverter } = await import('../src/services/markdown')
const payload = await getPayload({ config })
const prefix = `webmcp-${Date.now()}-${randomBytes(3).toString('hex')}`
const context = { bootstrap: true, disableRevalidate: true }
try {
  async function account(label: string, role: 'admin' | 'author', active = true) {
    const email = `${prefix}-${label}@example.test`
    const password = randomBytes(24).toString('base64url')
    const user = await payload.create({ collection: 'users', overrideAccess: true, context,
      data: { email, password, name: `${prefix}-${label}`, role, active } })
    return { id: user.id, email, password }
  }
  const admin = await account('admin', 'admin')
  const adminUser = await payload.findByID({ collection: 'users', id: admin.id, overrideAccess: true })
  const authorA = await account('author-a', 'author')
  const authorB = await account('author-b', 'author')
  const disabled = await account('disabled', 'author', false)
  const credential = await payload.create({ collection: 'mcp-keys', user: adminUser, overrideAccess: true,
    data: { label: prefix, owner: admin.id, prefix: '', hash: '' } })
  const mcpKey = (credential as unknown as { key: string }).key
  if (!mcpKey) throw new Error('Fixture MCP credential was not returned')
  const category = await payload.create({ collection: 'categories', overrideAccess: true, context,
    data: { title: `${prefix} category`, slug: `${prefix}-category` } })
  const converter = createMarkdownConverter(await config)
  const content = converter.fromMarkdown('## Acceptance heading\n\nBrowser native WebMCP content.\n\n## Final heading\n\nEnd of article.', [])
  async function post(label: string, owner: number, status: 'draft' | 'published') {
    return payload.create({ collection: 'posts', overrideAccess: true, user: adminUser, context,
      data: { title: `${prefix} ${label}`, slug: `${prefix}-${label}`, summary: `${prefix} acceptance`,
        content, owner, authors: [owner], categories: [category.id], revision: 1, _status: status } })
  }
  const publicPost = await post('public', authorA.id, 'published')
  const ownDraft = await post('own-draft', authorA.id, 'draft')
  const otherDraft = await post('other-draft', authorB.id, 'draft')
  for (let index = 1; index <= 11; index++) await post(`page-${index}`, authorA.id, 'published')
  await mkdir('.local', { recursive: true })
  await writeFile('.local/webmcp-browser-fixture.json', JSON.stringify({ prefix, admin, authorA, authorB, disabled, mcpKey,
    category: { id: category.id, slug: category.slug },
    publicPost: { id: publicPost.id, slug: publicPost.slug, title: publicPost.title },
    ownDraft: { id: ownDraft.id, slug: ownDraft.slug, title: ownDraft.title },
    otherDraft: { id: otherDraft.id, slug: otherDraft.slug } }, null, 2), { mode: 0o600 })
  console.log('Isolated WebMCP fixture created; private manifest saved under .local.')
} finally {
  await payload.destroy()
}
process.exit(0)
