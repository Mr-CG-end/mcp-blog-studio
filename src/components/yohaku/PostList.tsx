// Chinese Yohaku archive rows; snapshot pin precedes the ordinary list.
import Link from 'next/link'
import { Fragment } from 'react'
import type { Post } from '@/payload-types'
import type { PaginatedDocs } from 'payload'
import { postDate, toYohakuPostItem } from '@/services/yohakuAdapter'
export function YohakuPostList({
  posts,
  basePath,
  query,
  showCount = true,
}: {
  posts: PaginatedDocs<Post>
  basePath: string
  query?: string
  showCount?: boolean
}) {
  const url = (page: number) =>
    `${basePath}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page) })}`
  const isPinned = (source: Post) => basePath === '/posts' && Boolean(source.pinned)
  const controls = showCount && (
    <div className="yohaku-archive-controls">
      <p className="yohaku-post-count">共 {posts.totalDocs} 篇</p>
      {basePath === '/posts' && (
        <div className="yohaku-archive-mobile-tools">
          <Link href="/search">⌕ 搜索</Link>
          <Link href="/categories">分类</Link>
        </div>
      )}
    </div>
  )
  return (
    <>
      {!posts.docs.some(isPinned) && controls}
      <div className="yohaku-post-list">
        {posts.docs.map((source, index) => {
          const post = toYohakuPostItem(source)
          const pinned = isPinned(source)
          return (
            <Fragment key={post.id}>
              <article
                key={post.id}
                className="yohaku-post-item"
                data-pinned={pinned || undefined}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                {pinned && <span className="yohaku-pin-label">置顶</span>}
                <Link href={post.url} className="block">
                  <h2 className="text-copy-16 font-medium text-neutral-9">{post.title}</h2>
                  {(post.summary || post.text) && (
                    <p className="mt-1 line-clamp-1 text-copy-13 leading-normal text-neutral-6">
                      {post.summary || post.text}
                    </p>
                  )}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-12 text-neutral-6">
                  <time dateTime={post.created}>{postDate(post.created)}</time>
                  {post.categories.map((c) => (
                    <Link
                      className="text-accent hover:underline"
                      key={c.id}
                      href={`/categories/${encodeURIComponent(c.slug)}`}
                    >
                      · {c.name}
                    </Link>
                  ))}
                  {!!post.authors.length && <span>· {post.authors.join('、')}</span>}
                </div>
              </article>
              {pinned && controls}
            </Fragment>
          )
        })}
      </div>
      {!posts.docs.length && <p className="yohaku-empty">暂无相关文章。</p>}
      {posts.totalPages > 1 && (
        <nav className="yohaku-pagination" aria-label="文章分页">
          {posts.hasPrevPage ? <Link href={url(posts.prevPage!)}>← 上一页</Link> : <span />}
          <span>
            第 {posts.page} / {posts.totalPages} 页
          </span>
          {posts.hasNextPage ? <Link href={url(posts.nextPage!)}>下一页 →</Link> : <span />}
        </nav>
      )}
    </>
  )
}
