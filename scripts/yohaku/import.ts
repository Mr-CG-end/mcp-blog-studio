import { loadEnv } from 'payload/node'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { toLexical } from './lexical.mjs'
import { parseHTML } from './dom.mjs'
import type { Post, Media } from '../../src/payload-types'

loadEnv()
const database = new URL(process.env.DATABASE_URL || '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/blog_studio')
  throw new Error('Import is restricted to local blog_studio')
const root = path.resolve('.local/yohaku-zh')
type Source = {
  url: string
  capturedAt: string
  article: {
    title: string
    summary: string
    author: string
    publishedAt: string
    category: { title: string; slug: string }
    html: string
    hash: string
    headings: { id: string; text: string; level: number }[]
  }
}
type Asset = { url: string; file?: string; hash?: string; error?: string }
const manifest = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')) as {
  capturedAt: string
  articles: Source[]
  assets: Asset[]
}
const batch = `yohaku-${manifest.capturedAt.replace(/[^0-9]/g, '').slice(0, 14)}`
const dry = process.argv.includes('--dry-run')
const undo = process.argv.includes('--undo')
const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })
const report = {
  batch,
  dry,
  created: [] as { collection: string; id: number; url: string; revision?: number }[],
  skipped: [] as string[],
  failures: [] as { url: string; error: string }[],
  omissions: [] as unknown[],
}
const journal = `${root}/import-${batch}.json`
await mkdir(`${root}/prepared`, { recursive: true })
const save = () =>
  writeFile(dry ? `${root}/dry-run.json` : `${root}/last-run.json`, JSON.stringify(report, null, 2))
const context = { disableRevalidate: true }
try {
  const user = (
    await payload.find({
      collection: 'users',
      where: { role: { equals: 'admin' } },
      limit: 1,
      depth: 0,
    })
  ).docs[0]
  if (!user) throw new Error('A local administrator is required')
  if (undo) {
    if (dry) throw new Error('--undo and --dry-run cannot be combined')
    const previous = JSON.parse(await readFile(journal, 'utf8')) as typeof report
    // Posts are recoverably trashed, rather than destroying edited content or referenced media.
    for (const record of previous.created.filter((row) => row.collection === 'posts')) {
      const doc = await payload.findByID({
        collection: 'posts',
        id: record.id,
        trash: true,
        depth: 0,
        user,
      })
      if (doc.importSource?.batch !== batch || doc.revision !== (record.revision || 1) || doc.deletedAt) continue
      await payload.update({
        collection: 'posts',
        id: doc.id,
        data: { deletedAt: new Date().toISOString(), revision: doc.revision },
        user,
        context,
      })
    }
    console.log('Batch articles moved to trash; edited articles and shared media retained.')
  } else {
    const existingPosts = await payload.find({
      collection: 'posts',
      pagination: false,
      limit: 10000,
      depth: 0,
      trash: true,
    })
    const known = new Set(existingPosts.docs.map((doc) => doc.importSource?.url).filter(Boolean))
    const slugSet = new Set(existingPosts.docs.map((doc) => doc.slug))
    const links = new Map<string, string>()
    for (const source of manifest.articles) {
      const previous = existingPosts.docs.find((doc) => doc.importSource?.url === source.url)
      const base = new URL(source.url).pathname.split('/').pop()!
      const slug =
        previous?.slug ||
        (slugSet.has(base)
          ? `${base}-source-${createHash('sha256').update(source.url).digest('hex').slice(0, 8)}`
          : base)
      links.set(source.url, `/posts/${slug}`)
      slugSet.add(slug)
    }
    const mediaByURL = new Map<string, number>()
    const mediaDocs = await payload.find({
      collection: 'media',
      pagination: false,
      limit: 10000,
      depth: 0,
    })
    for (const doc of mediaDocs.docs)
      if (doc.importSource?.url) mediaByURL.set(doc.importSource.url, doc.id)
    let accumulated: typeof report
    try {
      accumulated = JSON.parse(await readFile(journal, 'utf8'))
    } catch {
      accumulated = { ...report, created: [] }
    }
    const recordCreated = async (collection: string, id: number, url: string) => {
      const entry = { collection, id, url }
      report.created.push(entry)
      accumulated.created.push(entry)
      await writeFile(journal, JSON.stringify(accumulated, null, 2))
    }
    for (const source of manifest.articles) {
      if (known.has(source.url)) {
        report.skipped.push(source.url)
        continue
      }
      try {
        const document = parseHTML(source.article.html, source.url)
        for (const image of document.querySelectorAll('img')) {
          const url = new URL(image.getAttribute('src') || '', source.url).href
          if (mediaByURL.has(url)) continue
          const asset = manifest.assets.find((item) => item.url === url && item.file)
          const embedded = url.startsWith('data:image/')
          if (!asset?.file && !embedded) {
            report.omissions.push({ type: 'unavailable-image', article: source.url, url })
            continue
          }
          if (dry) {
            mediaByURL.set(url, -1)
            continue
          }
          const buffer = embedded
            ? url.slice(0, url.indexOf(',')).endsWith(';base64')
              ? Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
              : Buffer.from(decodeURIComponent(url.slice(url.indexOf(',') + 1)))
            : await readFile(path.join(root, asset!.file!))
          const hash = createHash('sha256').update(buffer).digest('hex')
          const provenanceURL = embedded ? `urn:sha256:${hash}` : url
          if (mediaByURL.has(provenanceURL)) {
            mediaByURL.set(url, mediaByURL.get(provenanceURL)!)
            continue
          }
          const prepared = await sharp(buffer, { animated: false })
            .rotate()
            .resize({ width: 2560, withoutEnlargement: true })
            .webp({ quality: 90 })
            .toBuffer()
          if (prepared.length > 5 * 1024 * 1024)
            throw new Error(`Image exceeds media limit: ${url}`)
          const filePath = `${root}/prepared/${hash}.webp`
          await writeFile(filePath, prepared)
          const caption = image.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
          const doc = await payload.create({
            collection: 'media',
            filePath,
            user,
            context,
            data: {
              owner: user.id,
              alt: image.alt || source.article.title,
              ...(caption
                ? {
                    caption: toLexical(
                      `<p>${caption.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p>`,
                    ) as Media['caption'],
                  }
                : {}),
              importSource: {
                url: provenanceURL,
                capturedAt: source.capturedAt,
                hash,
                batch,
                author: source.article.author,
              },
            },
          })
          mediaByURL.set(url, doc.id)
          mediaByURL.set(provenanceURL, doc.id)
          await recordCreated('media', doc.id, provenanceURL)
        }
        const category = source.article.category
        let categoryDoc = (
          await payload.find({
            collection: 'categories',
            where: { slug: { equals: category.slug } },
            limit: 1,
            depth: 0,
          })
        ).docs[0]
        if (!categoryDoc && !dry) {
          categoryDoc = await payload.create({
            collection: 'categories',
            user,
            context,
            data: {
              title: category.title,
              slug: category.slug,
              importSource: {
                url: `https://innei.in/categories/${category.slug}`,
                batch,
                capturedAt: source.capturedAt,
              },
            },
          })
          await recordCreated(
            'categories',
            categoryDoc.id,
            `https://innei.in/categories/${category.slug}`,
          )
        }
        const omissions: unknown[] = []
        const content = toLexical(source.article.html, {
          media: mediaByURL,
          links,
          baseURL: source.url,
          omissions,
        }) as Post['content']
        report.omissions.push({ url: source.url, items: omissions })
        if (!dry) {
          const doc = await payload.create({
            collection: 'posts',
            user,
            context,
            data: {
              title: source.article.title,
              summary: source.article.summary?.slice(0, 500),
              slug: links.get(source.url)!.split('/').pop()!,
              content,
              owner: user.id,
              authors: [],
              categories: categoryDoc ? [categoryDoc.id] : [],
              publishedAt: source.article.publishedAt,
              _status: 'published',
              revision: 1,
              importSource: {
                url: source.url,
                capturedAt: source.capturedAt,
                hash: source.article.hash,
                batch,
                author: source.article.author,
                headings: source.article.headings,
              },
            },
          })
          await recordCreated('posts', doc.id, source.url)
        }
        console.log(`${dry ? 'validated' : 'imported'}: ${source.article.title}`)
      } catch (error) {
        report.failures.push({ url: source.url, error: String(error) })
        console.error(`${source.url}: ${String(error)}`)
      }
      await save()
    }
    await save()
    console.log(
      JSON.stringify({
        batch,
        dry,
        created: report.created.length,
        skipped: report.skipped.length,
        failures: report.failures.length,
      }),
    )
    if (report.failures.length) process.exitCode = 1
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode || 0)
