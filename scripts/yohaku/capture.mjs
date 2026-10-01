import { JSDOM } from 'jsdom'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('.local/yohaku-zh')
const origin = 'https://innei.in'
const digest = (value) => createHash('sha256').update(value).digest('hex')
const failures = []
const assets = new Map()
const pages = new Map()
let capturedAt = new Date().toISOString()
try {
  capturedAt = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8')).capturedAt
} catch {
  /* first snapshot */
}
await mkdir(`${root}/pages`, { recursive: true })
await mkdir(`${root}/assets`, { recursive: true })

async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: { 'User-Agent': 'YohakuLocalArchive/1.0', 'Accept-Language': 'zh-CN,zh;q=0.9' },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

function normalizeStream(document) {
  // Resolve React's streamed Suspense containers without executing remote scripts.
  const scripts = [...document.querySelectorAll('script')].map((el) => el.textContent).join('\n')
  for (const match of scripts.matchAll(/\$RS\("([^"]+)","([^"]+)"\)/g)) {
    const segment = document.getElementById(match[1])
    const target = document.getElementById(match[2])
    if (segment && target) {
      target.replaceWith(...segment.childNodes)
      segment.remove()
    }
  }
  const pairs = new Map(
    [...scripts.matchAll(/\$RC\("([^"]+)","([^"]+)"\)/g)].map((match) => [match[2], match[1]]),
  )
  for (const segment of [...document.querySelectorAll('div[hidden][id^="S:"]')]) {
    const placeholder = document.getElementById(
      pairs.get(segment.id) || segment.id.replace('S:', 'B:'),
    )
    if (!placeholder) continue
    let cursor = placeholder.nextSibling
    let nested = 0
    while (cursor) {
      const next = cursor.nextSibling
      if (cursor.nodeType === 8) {
        if (['$', '$?', '$!'].includes(cursor.data)) nested++
        if (cursor.data === '/$') {
          if (nested === 0) break
          nested--
        }
      }
      cursor.remove()
      cursor = next
    }
    placeholder.replaceWith(...segment.childNodes)
    segment.remove()
  }
}

function registerAsset(value, base) {
  if (!value || /^(data:|blob:|#|%23)/i.test(value)) return
  const url = new URL(value, base).href
  if (!/^https?:/.test(url)) return
  if (!assets.has(url)) assets.set(url, { url })
}

async function capture(route) {
  const url = new URL(route, origin).href
  if (pages.has(url)) return pages.get(url)
  const file = `${digest(url).slice(0, 16)}.html`
  let raw
  try {
    raw = await readFile(`${root}/pages/${file}`, 'utf8')
  } catch {
    raw = await (await request(url)).text()
    await writeFile(`${root}/pages/${file}`, raw)
  }
  const document = new JSDOM(raw, { url }).window.document
  normalizeStream(document)
  for (const el of document.querySelectorAll(
    'link[rel="stylesheet"],script[src],img,video[poster],source[src]',
  )) {
    registerAsset(
      el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('poster'),
      url,
    )
    // Archive the browser's original image as well as its responsive candidates.
    for (const part of (el.getAttribute('srcset') || '').split(/,\s+/))
      registerAsset(part.trim().split(/\s+/)[0], url)
  }
  const data = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(
    (el) => {
      try {
        return [JSON.parse(el.textContent)]
      } catch {
        return []
      }
    },
  )
  const meta = data.find((item) => item['@type'] === 'BlogPosting')
  const body =
    document.querySelector('#main-content-render .rich-content') ||
    document.querySelector('article .rich-content') ||
    document.querySelector('article #main-content-render')
  const category = document.querySelector('a[href^="/categories/"]')
  const record = {
    url,
    file,
    capturedAt,
    title: document.title,
    htmlClass: document.documentElement.className,
    bodyClass: document.body.className,
    styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(
      (el) => new URL(el.getAttribute('href'), url).href,
    ),
  }
  if (meta && body) {
    const headings = [...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => ({
      id: el.id,
      text: el.textContent,
      level: Number(el.tagName[1]),
    }))
    record.article = {
      title: meta.headline,
      summary: meta.description,
      author: meta.author?.name || 'Innei',
      publishedAt: meta.datePublished,
      category: {
        slug: category?.getAttribute('href')?.split('/').pop() || 'uncategorized',
        title: meta.articleSection || category?.textContent || '未分类',
      },
      keywords: meta.keywords || [],
      html: body.innerHTML,
      hash: digest(body.innerHTML),
      headings,
      features: {
        image: !!body.querySelector('img'),
        code: !!body.querySelector('pre'),
        table: !!body.querySelector('table'),
        quote: !!body.querySelector('blockquote'),
        nestedHeadings: headings.some((h) => h.level >= 3),
        duplicateHeadings: new Set(headings.map((h) => h.text)).size < headings.length,
      },
      omittedEmbeds: [...body.querySelectorAll('.rich-block-anchor')]
        .filter((el) => /^(Whiteboard|Interactive component)$/.test(el.textContent.trim()))
        .map((el) => ({ type: el.textContent.trim(), id: el.id })),
    }
  }
  await writeFile(
    `${root}/pages/${file.replace('.html', '.resolved.html')}`,
    document.documentElement.outerHTML,
  )
  pages.set(url, { record, document })
  console.log(`page ${pages.size}: ${record.title}`)
  return { record, document }
}

await capture('/')
await capture('/about')
const articleURLs = new Set()
for (let page = 1; articleURLs.size < 31 && page <= 5; page++) {
  const { document } = await capture(page === 1 ? '/posts' : `/posts?page=${page}`)
  for (const el of document.querySelectorAll('a[href^="/posts/"]'))
    articleURLs.add(new URL(el.getAttribute('href'), origin).href)
}
for (const url of articleURLs) {
  try {
    await capture(url)
  } catch (error) {
    failures.push({ url, error: String(error) })
  }
}
const records = [...pages.values()].map((page) => page.record)
const articles = records
  .filter((page) => page.article)
  .sort((a, b) => b.article.publishedAt.localeCompare(a.article.publishedAt))
const selected = articles.slice(0, 30)
for (const feature of ['image', 'code', 'table', 'quote', 'nestedHeadings', 'duplicateHeadings']) {
  if (!selected.some((page) => page.article.features[feature])) {
    const sample = articles.find((page) => page.article.features[feature])
    if (sample && !selected.includes(sample)) selected.push(sample)
  }
}
for (const slug of new Set(selected.map((page) => page.article.category.slug))) {
  try {
    await capture(`/categories/${slug}`)
  } catch (error) {
    failures.push({ url: `/categories/${slug}`, error: String(error) })
  }
}
// Download assets with a small concurrency ceiling; CSS dependencies are queued recursively.
async function download(asset) {
  try {
    const extension = path.extname(new URL(asset.url).pathname).slice(0, 10) || '.bin'
    const filename = `${digest(asset.url).slice(0, 20)}${extension}`
    let bytes
    try {
      bytes = await readFile(`${root}/assets/${filename}`)
    } catch {
      bytes = Buffer.from(await (await request(asset.url)).arrayBuffer())
      await writeFile(`${root}/assets/${filename}`, bytes)
    }
    Object.assign(asset, { file: `assets/${filename}`, hash: digest(bytes), bytes: bytes.length })
    if (extension === '.css')
      for (const match of bytes.toString().matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g))
        registerAsset(match[1], asset.url)
  } catch (error) {
    asset.error = String(error)
    failures.push({ url: asset.url, error: asset.error })
  }
}
let done = 0
while (done < assets.size) {
  const batch = [...assets.values()].slice(done, done + 4)
  await Promise.all(batch.map(download))
  done += batch.length
  if (done % 20 === 0) console.log(`assets ${done}/${assets.size}`)
}
const manifest = {
  version: 1,
  origin,
  locale: 'zh-CN',
  capturedAt,
  articles: selected,
  pages: [...pages.values()].map(({ record }) => ({ ...record, article: undefined })),
  assets: [...assets.values()],
  failures,
  missingSamples: ['image', 'code', 'table', 'quote', 'nestedHeadings', 'duplicateHeadings'].filter(
    (feature) => !selected.some((page) => page.article.features[feature]),
  ),
}
await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log(
  JSON.stringify({
    articles: selected.length,
    assets: assets.size,
    failures: failures.length,
    missingSamples: manifest.missingSamples,
  }),
)
