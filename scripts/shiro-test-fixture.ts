// Local-only browser fixture. Creates new records and deletes only IDs recorded by this run.
import { loadEnv } from 'payload/node'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import type { Post } from '../src/payload-types'
loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Requires local blog_studio database')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const manifest = '/tmp/shiro-browser-fixture.json'
const context = { disableRevalidate: true }
try {
  if (process.argv.includes('--cleanup')) {
    const fixture = JSON.parse(await readFile(manifest, 'utf8')) as {
      ids: number[]
      prefix: string
    }
    for (const id of fixture.ids) {
      const doc = await payload.findByID({ collection: 'posts', id, overrideAccess: true })
      if (!doc.slug?.startsWith(fixture.prefix)) throw new Error('Fixture identity mismatch')
      await payload.delete({ collection: 'posts', id, overrideAccess: true, context })
    }
    await unlink(manifest)
    console.log('Temporary Shiro posts removed')
  } else {
    try {
      await readFile(manifest)
      throw new Error('Existing fixture must be cleaned up first')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { role: { equals: 'admin' } },
      limit: 1,
      overrideAccess: true,
    })
    const user = users[0]
    if (!user) throw new Error('Local admin required')
    const prefix = `shiro-check-${Date.now()}`
    const ids: number[] = []
    const text = (value: string) => ({
      type: 'text',
      version: 1,
      text: value,
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
    })
    const block = (type: string, value: string, tag?: string) => ({
      type,
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      ...(tag ? { tag } : {}),
      children: [text(value)],
    })
    const content = {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          block('heading', '目录验收', 'h2'),
          ...Array.from({ length: 8 }, () =>
            block('paragraph', '这是用于验证阅读排版、目录定位和滚动进度的临时内容。'.repeat(6)),
          ),
          block('heading', '重复标题', 'h3'),
          block('paragraph', '标题与锚点需要稳定。'),
          block('heading', '重复标题', 'h3'),
          {
            type: 'block',
            version: 2,
            format: '',
            fields: { blockType: 'code', language: 'typescript', code: 'const shiro = "Payload";' },
          },
        ],
      },
    } as Post['content']
    await writeFile(manifest, JSON.stringify({ prefix, ids }))
    for (const status of ['published', 'draft'] as const) {
      const doc = await payload.create({
        collection: 'posts',
        user,
        overrideAccess: true,
        context,
        data: {
          title: `Shiro 临时验收 ${status}`,
          slug: `${prefix}-${status}`,
          owner: user.id,
          revision: 1,
          content,
          _status: status,
        },
      })
      ids.push(doc.id)
      await writeFile(
        manifest,
        JSON.stringify({ prefix, ids, slug: `${prefix}-published`, draftSlug: `${prefix}-draft` }),
      )
    }
    console.log('Created temporary Shiro browser fixtures')
  }
} finally {
  await payload.destroy()
}

process.exit(0)
