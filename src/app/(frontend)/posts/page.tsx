import { PageShell } from '@/components/yohaku/PageShell'
import { YohakuPostList } from '@/components/yohaku/PostList'
import { ArchiveSidebar } from '@/components/yohaku/ArchiveSidebar'
import { listPublicPosts, pageNumber, listCategories } from '@/services/publicBlog'
export const dynamic = 'force-dynamic'
export const metadata = { title: '全部文章' }
export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const [posts, categories] = await Promise.all([
    listPublicPosts({ page: pageNumber(params.page) }),
    listCategories(),
  ])
  return (
    <PageShell className="yohaku-archive-grid">
      <div className="min-w-0">
        <header className="yohaku-page-heading">
          <p className="yohaku-eyebrow">BLOG</p>
          <h1>文章</h1>
        </header>
        <YohakuPostList posts={posts} basePath="/posts" />
      </div>
      <ArchiveSidebar categories={categories.docs} />
    </PageShell>
  )
}
