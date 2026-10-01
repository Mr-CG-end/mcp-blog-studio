import { loadEnv } from 'payload/node'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { parseHTML } from './dom.mjs'
import { toLexical } from './lexical.mjs'
import type { Post, SiteSetting } from '../../src/payload-types'
loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Local database only')
const root = '.local/yohaku-zh'
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
const batch = `yohaku-${manifest.capturedAt.replace(/[^0-9]/g, '').slice(0, 14)}`
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
const context = { disableRevalidate: true }
const report: { repaired: number[]; skipped: number[]; about: string; missingImages: string[] } = {
  repaired: [],
  skipped: [],
  about: 'unchanged',
  missingImages: [],
}
try {
  const user = (
    await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1 })
  ).docs[0]
  if (!user) throw new Error('Administrator required')
  const posts = (
    await payload.find({
      collection: 'posts',
      pagination: false,
      limit: 10000,
      depth: 0,
      trash: true,
    })
  ).docs
  const mediaDocs = (
    await payload.find({ collection: 'media', pagination: false, limit: 10000, depth: 0 })
  ).docs
  const media = new Map(
    mediaDocs.filter((m) => m.importSource?.url).map((m) => [m.importSource!.url!, m.id]),
  )
  const links = new Map(
    posts.filter((p) => p.importSource?.url).map((p) => [p.importSource!.url!, `/posts/${p.slug}`]),
  )
  const journalPath = `${root}/import-${batch}.json`
  const journal = JSON.parse(await readFile(journalPath, 'utf8'))
  const snapshotDir = `${root}/before-content-repair`
  await mkdir(snapshotDir, { recursive: true })
  async function prepareImages(html: string, url: string, create = false) {
    const document = parseHTML(html, url)
    for (const image of document.querySelectorAll('img')) {
      const src = new URL(image.getAttribute('src') || '', url).href
      if (media.has(src)) continue
      let buffer: Buffer | undefined
      if (src.startsWith('data:image/'))
        buffer = src.slice(0, src.indexOf(',')).endsWith(';base64')
          ? Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')
          : Buffer.from(decodeURIComponent(src.slice(src.indexOf(',') + 1)))
      else {
        const asset = manifest.assets.find((a: any) => a.url === src && a.file)
        if (asset) buffer = await readFile(`${root}/${asset.file}`)
      }
      if (!buffer) {
        report.missingImages.push(src)
        continue
      }
      const hash = createHash('sha256').update(buffer).digest('hex')
      const provenance = src.startsWith('data:') ? `urn:sha256:${hash}` : src
      if (media.has(provenance)) {
        media.set(src, media.get(provenance)!)
        continue
      }
      if (!create) {
        report.missingImages.push(src.slice(0, 200))
        continue
      }
      const filePath = `${root}/prepared/${hash}.webp`
      await writeFile(
        filePath,
        await sharp(buffer)
          .resize({ width: 2560, withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer(),
      )
      const doc = await payload.create({
        collection: 'media',
        user,
        context,
        filePath,
        data: {
          owner: user.id,
          alt: image.alt || '关于页图片',
          importSource: {
            url: provenance,
            batch,
            capturedAt: manifest.capturedAt,
            hash,
            author: 'Innei',
          },
        },
      })
      media.set(src, doc.id)
      media.set(provenance, doc.id)
    }
  }
  for (const source of manifest.articles) {
    const post = posts.find((p) => p.importSource?.url === source.url)
    if (!post) continue
    if (
      post.importSource?.batch !== batch ||
      post.revision !== 1 ||
      post.deletedAt ||
      post.importSource.hash !== source.article.hash
    ) {
      report.skipped.push(post.id)
      continue
    }
    await prepareImages(source.article.html, source.url)
    const content = toLexical(source.article.html, {
      media,
      links,
      baseURL: source.url,
    }) as Post['content']
    await writeFile(`${snapshotDir}/post-${post.id}.json`, JSON.stringify(post, null, 2), {
      flag: 'wx',
    }).catch((error) => {
      if (error.code !== 'EEXIST') throw error
    })
    const updated = await payload.update({
      collection: 'posts',
      id: post.id,
      user,
      context,
      data: { content, revision: post.revision },
    })
    const entry = journal.created.find((r: any) => r.collection === 'posts' && r.id === post.id)
    if (entry) entry.revision = updated.revision
    await writeFile(journalPath, JSON.stringify(journal, null, 2))
    report.repaired.push(post.id)
  }
  const aboutPage = manifest.pages.find((p: any) => p.url === 'https://innei.in/about')
  const document = parseHTML(
    await readFile(`${root}/pages/${aboutPage.file.replace('.html', '.resolved.html')}`, 'utf8'),
    aboutPage.url,
  )
  const html = document.querySelector('.rich-content')?.innerHTML || ''
  const site = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  // The profile importer produced this unmodified source tree. Never replace a locally edited page.
  const marker = `${root}/about-images-repaired.json`
  let already = false
  try {
    await readFile(marker)
    already = true
  } catch {}
  if (!already && html) {
    await writeFile(`${snapshotDir}/site.json`, JSON.stringify(site, null, 2), {
      flag: 'wx',
    }).catch((error) => {
      if (error.code !== 'EEXIST') throw error
    })
    // Compare text to detect user edits, ignoring Payload-generated node identifiers.
    const text = (n: any): string => n?.text || (n?.children || []).map(text).join('')
    const original = toLexical(html, { baseURL: aboutPage.url }) as SiteSetting['about']
    if (text(site.about?.root) === text(original?.root)) {
      await prepareImages(html, aboutPage.url, true)
      await payload.updateGlobal({
        slug: 'site-settings',
        user,
        context,
        data: {
          about: toLexical(html, { media, links, baseURL: aboutPage.url }) as SiteSetting['about'],
        },
      })
      await writeFile(marker, JSON.stringify({ at: new Date().toISOString() }))
      report.about = 'images localized'
    } else report.about = 'local edits preserved; skipped'
  }
  await writeFile(`${root}/content-repair.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
} finally {
  await payload.destroy()
}
process.exit(0)
