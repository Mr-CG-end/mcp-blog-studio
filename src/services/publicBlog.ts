import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { publishedWhere } from '@/access/roles'

export function pageNumber(value?: string): number {
  const n = Number(value || 1)
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 10000) : 1
}
export async function listPublicPosts({
  page = 1,
  query = '',
  category,
  limit = 10,
}: { page?: number; query?: string; category?: number; limit?: number } = {}) {
  const payload = await getPayload({ config })
  const conditions: Where[] = [publishedWhere]
  if (process.env.YOHAKU_SOURCE_MODE === '1')
    conditions.push({ 'importSource.url': { exists: true } })
  if (category) conditions.push({ categories: { contains: category } })
  if (query.trim())
    conditions.push({
      or: ['title', 'summary', 'searchText'].map((field) => ({
        [field]: { like: query.trim().slice(0, 200) },
      })),
    })
  return payload.find({
    collection: 'posts',
    overrideAccess: false,
    depth: 1,
    sort: ['-pinned', '-publishedAt'],
    limit,
    page,
    where: { and: conditions },
  })
}
export async function listCategories() {
  const payload = await getPayload({ config })
  return payload.find({
    collection: 'categories',
    where:
      process.env.YOHAKU_SOURCE_MODE === '1' ? { 'importSource.url': { exists: true } } : undefined,
    overrideAccess: false,
    depth: 0,
    pagination: false,
    limit: 1000,
    sort: 'title',
  })
}
export async function getSite() {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'site-settings', overrideAccess: false, depth: 1 })
}

export async function getHeader() {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'header', overrideAccess: false, depth: 1 })
}

export async function getFooter() {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'footer', overrideAccess: false, depth: 1 })
}

export async function getSiteStats() {
  const payload = await getPayload({ config })
  const site = await getSite()
  if (site.customStats?.enabled) {
    return {
      posts: site.customStats.postsCount || '0 篇',
      words: site.customStats.wordsCount || '0 字',
      days: site.customStats.siteDays || '0 天',
    }
  }

  const conditions: Where[] = [publishedWhere]
  if (process.env.YOHAKU_SOURCE_MODE === '1') {
    conditions.push({ 'importSource.url': { exists: true } })
  }

  const posts = await payload.find({
    collection: 'posts',
    overrideAccess: false,
    pagination: false,
    limit: 10000,
    depth: 0,
    where: { and: conditions },
    select: {
      id: true,
      publishedAt: true,
      createdAt: true,
      searchText: true,
      summary: true,
    },
  })

  const count = posts.docs.length
  let totalChars = 0
  let earliestTime = Date.now()

  for (const doc of posts.docs) {
    const text = (doc.searchText || '') + ' ' + (doc.summary || '')
    const clean = text.replace(/[\s\r\n\t]+/g, '')
    totalChars += clean.length

    const dateStr = doc.publishedAt || doc.createdAt
    if (dateStr) {
      const t = new Date(dateStr).getTime()
      if (t > 0 && t < earliestTime) earliestTime = t
    }
  }

  const wordsStr =
    totalChars >= 10000
      ? `${(totalChars / 10000).toFixed(totalChars >= 100000 ? 0 : 1)} 万字`
      : `${totalChars} 字`

  const startTime = site.siteStartDate ? new Date(site.siteStartDate).getTime() : earliestTime
  const days = Math.max(1, Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24)))

  return {
    posts: `${count} 篇`,
    words: wordsStr,
    days: `${days} 天`,
  }
}

