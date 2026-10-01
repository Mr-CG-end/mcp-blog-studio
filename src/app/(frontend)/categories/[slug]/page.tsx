import { PageShell } from '@/components/yohaku/PageShell'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listCategories, listPublicPosts } from '@/services/publicBlog'
import { toYohakuPostItem } from '@/services/yohakuAdapter'
export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const categories = await listCategories()
  return { title: categories.docs.find((c) => c.slug === slug)?.title || '分类不存在' }
}
export default async function Category({ params }: Props) {
  const { slug } = await params
  const categories = await listCategories()
  const category = categories.docs.find((c) => c.slug === slug)
  if (!category) notFound()
  const posts = await listPublicPosts({ category: category.id, limit: 1000 })
  const groups = new Map<string, ReturnType<typeof toYohakuPostItem>[]>()
  for (const doc of posts.docs) {
    const post = toYohakuPostItem(doc)
    const year = post.created.slice(0, 4)
    groups.set(year, [...(groups.get(year) || []), post])
  }
  return (
    <PageShell className="yohaku-category-page">
      <header className="yohaku-category-heading">
        <p className="yohaku-eyebrow">分类</p>
        <p className="yohaku-category-total">
          <strong>{posts.totalDocs}</strong>
          <span>篇{groups.size ? ` · 始于 ${[...groups.keys()].at(-1)} 年` : ''}</span>
        </p>
        <h1>{category.title}</h1>
        <div className="yohaku-category-rule" />
      </header>
      {[...groups].map(([year, items]) => (
        <section key={year} className="yohaku-category-year">
          <h2>
            {year}
            <small>{items.length} 篇</small>
          </h2>
          <ul>
            {items.map((post) => (
              <li key={post.id}>
                <Link href={post.url}>
                  <span>{post.title}</span>
                  <time dateTime={post.created}>
                    {new Date(post.created).toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'Asia/Shanghai',
                    })}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!posts.totalDocs && <p className="yohaku-empty">暂无相关文章。</p>}
    </PageShell>
  )
}
