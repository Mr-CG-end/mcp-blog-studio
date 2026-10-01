// Category index reuses the converted archive typography; no dedicated source page.
import Link from 'next/link'
import { PageShell } from '@/components/yohaku/PageShell'
import { listCategories } from '@/services/publicBlog'
export const dynamic = 'force-dynamic'
export const metadata = { title: '分类' }
export default async function Categories() {
  const categories = await listCategories()
  return (
    <PageShell>
      <header className="yohaku-page-heading">
        <p className="yohaku-eyebrow">ARCHIVE</p>
        <h1>分类</h1>
      </header>
      {categories.docs.length ? (
        <ul className="yohaku-category-list">
          {categories.docs.map((c) => (
            <li key={c.id}>
              <Link href={`/categories/${encodeURIComponent(c.slug || '')}`}>{c.title}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-12 opacity-60">分类正在整理中。</p>
      )}
    </PageShell>
  )
}
