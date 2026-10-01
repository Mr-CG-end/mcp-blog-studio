// /en/posts right column: local categories replace source category/tag taxonomy.
import Link from 'next/link'
import type { Category } from '@/payload-types'
export function ArchiveSidebar({
  categories,
  active,
}: {
  categories: Category[]
  active?: string
}) {
  return (
    <aside className="yohaku-archive-sidebar">
      <form action="/search" className="yohaku-search-form">
        <label className="sr-only" htmlFor="archive-search">
          关键词
        </label>
        <input id="archive-search" name="q" placeholder="搜索文章" maxLength={200} />
        <button type="submit">搜索</button>
      </form>
      <nav aria-label="文章分类">
        <h2>分类</h2>
        <Link href="/posts" aria-current={active ? undefined : 'page'}>
          全部文章
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/categories/${encodeURIComponent(c.slug || '')}`}
            aria-current={active === c.slug ? 'page' : undefined}
          >
            {c.title}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
