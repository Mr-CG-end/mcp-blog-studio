import { PageShell } from '@/components/yohaku/PageShell'
import { YohakuPostList } from '@/components/yohaku/PostList'
import { ArchiveSidebar } from '@/components/yohaku/ArchiveSidebar'
import { listPublicPosts, pageNumber, listCategories } from '@/services/publicBlog'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const metadata = { title: '全部文章' }
export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; categorySlug?: string }>
}) {
  const params = await searchParams
  const categories = await listCategories()
  const category = params.categorySlug
    ? categories.docs.find((item) => item.slug === params.categorySlug)
    : undefined
  if (params.categorySlug && !category) notFound()
  const posts = await listPublicPosts({ page: pageNumber(params.page), category: category?.id })
  return (
    <PageShell className="yohaku-archive-grid">
      <div className="min-w-0">
        <header className="yohaku-page-heading">
          <p className="yohaku-eyebrow">BLOG</p>
          <h1>文章</h1>
        </header>
        <YohakuPostList posts={posts} basePath="/posts" categorySlug={category?.slug || undefined} />
      </div>
      <ArchiveSidebar categories={categories.docs} />
    </PageShell>
  )
}
