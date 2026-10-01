import { loadEnv } from 'payload/node'
import { readFile, writeFile, access } from 'node:fs/promises'
import { parseHTML } from './dom.mjs'
loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Local database only')
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
const manifest = JSON.parse(await readFile('.local/yohaku-zh/manifest.json', 'utf8'))
function nodes(node: any): any[] {
  return [node, ...(node.children || []).flatMap(nodes)]
}
try {
  const posts = await payload.find({
    collection: 'posts',
    pagination: false,
    limit: 10000,
    depth: 1,
    trash: true,
  })
  const results = []
  for (const source of manifest.articles) {
    const post = posts.docs.find((p) => p.importSource?.url === source.url)
    const document = parseHTML(source.article.html, source.url)
    const content = post ? nodes(post.content.root) : []
    const media = content
      .filter((n) => n.type === 'block' && n.fields.blockType === 'mediaBlock')
      .map((n) => n.fields.media)
    const missingFiles = []
    for (const item of media) {
      try {
        await access(`public/media/${item.filename}`)
      } catch {
        missingFiles.push(item.id)
      }
    }
    results.push({
      url: source.url,
      id: post?.id,
      revision: post?.revision,
      status: post?._status,
      headings: {
        source: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
        local: content.filter((n) => n.type === 'heading').length,
      },
      tables: {
        source: document.querySelectorAll('table').length,
        local: content.filter((n) => n.type === 'table').length,
      },
      code: {
        source: document.querySelectorAll('pre').length,
        local: content.filter((n) => n.fields?.blockType === 'code').length,
      },
      images: {
        source: document.querySelectorAll('img').length,
        local: media.length,
        missingFiles,
      },
    })
  }
  const publicPosts = await payload.find({
    collection: 'posts',
    overrideAccess: false,
    pagination: false,
    limit: 10000,
    depth: 0,
  })
  const report = {
    sourceCount: results.length,
    originalPosts: posts.docs.filter((p) => !p.importSource?.url).length,
    publicDrafts: publicPosts.docs.filter((p) => p._status !== 'published' || p.deletedAt).length,
    results,
  }
  await writeFile('.local/yohaku-zh/audit.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await payload.destroy()
}
process.exit(0)
