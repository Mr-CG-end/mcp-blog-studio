import { loadEnv } from 'payload/node'
loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Local database only')
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
try {
  const site = await payload.findGlobal({ slug: 'site-settings', overrideAccess: false, depth: 1 })
  const media = site.about?.root.children
    .filter((n) => n.type === 'block')
    .map((n) => {
      const fields = n.fields as {
        blockType?: string
        media?: { id?: number; url?: string } | number
      }
      return {
        type: fields.blockType,
        populated: typeof fields.media === 'object',
        url: typeof fields.media === 'object' ? fields.media.url : undefined,
      }
    })
  console.log(JSON.stringify(media))
  if (media?.some((m) => !m.populated || !m.url)) process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode || 0)
