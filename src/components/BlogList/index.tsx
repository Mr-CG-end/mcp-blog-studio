// Adapted from Innei/Shiro, commit 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: PostPagination.tsx and posts/page.tsx; Payload pagination and local routes.
import Link from 'next/link'
import type { Post } from '@/payload-types'
import type { PaginatedDocs } from 'payload'
import { CollectionArchive } from '@/components/CollectionArchive'
export function BlogList({
  posts,
  basePath,
  query,
}: {
  posts: PaginatedDocs<Post>
  basePath: string
  query?: string
}) {
  const url = (page: number) =>
    `${basePath}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page) })}`
  const button =
    'rounded-md border-2 border-accent/50 px-4 py-2 hover:border-accent text-accent transition-colors'
  return (
    <>
      <p className="mb-4 text-sm opacity-60">共 {posts.totalDocs} 篇文章</p>
      {posts.docs.length ? (
        <CollectionArchive posts={posts.docs} />
      ) : (
        <div className="center flex h-[300px] flex-col space-y-4">
          <i aria-hidden className="i-mingcute-inbox-line text-5xl" />
          <p>这里空空如也</p>
          <p>试试其他关键词或分类。</p>
        </div>
      )}
      {posts.totalPages > 1 && (
        <nav aria-label="文章分页" className="mt-4 flex items-center justify-between gap-2">
          {posts.hasPrevPage ? (
            <Link className={button} href={url(posts.prevPage!)}>
              上一页
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm opacity-60">
            第 {posts.page} / {posts.totalPages} 页
          </span>
          {posts.hasNextPage ? (
            <Link className={button} href={url(posts.nextPage!)}>
              下一页
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  )
}
