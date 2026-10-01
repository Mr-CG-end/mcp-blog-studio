import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'
export const dynamic = 'force-dynamic'
export async function GET() {
  const payload = await getPayload({ config })
  const base = getServerSideURL()
  const [pages, categories] = await Promise.all([
    payload.find({
      collection: 'pages',
      overrideAccess: false,
      depth: 0,
      pagination: false,
      where: { _status: { equals: 'published' } },
      select: { slug: true, updatedAt: true },
    }),
    payload.find({ collection: 'categories', overrideAccess: false, depth: 0, pagination: false }),
  ])
  return getServerSideSitemap([
    ...['/', '/posts', '/about'].map((path) => ({ loc: `${base}${path}` })),
    ...categories.docs.map((c) => ({ loc: `${base}/categories/${c.slug}`, lastmod: c.updatedAt })),
    ...pages.docs
      .filter((p) => p.slug && !['home', 'posts', 'about', 'search'].includes(p.slug))
      .map((p) => ({ loc: `${base}/${p.slug}`, lastmod: p.updatedAt })),
  ])
}
