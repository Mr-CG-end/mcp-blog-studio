import { PageShell } from '@/components/yohaku/PageShell'
import React from 'react'
import { YohakuPostList } from '@/components/yohaku/PostList'
import { listPublicPosts, pageNumber } from '@/services/publicBlog'
export const dynamic = 'force-dynamic'
export const metadata = { title: '搜索文章', robots: { index: false, follow: true } }
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const query = (params.q || '').slice(0, 200)
  const posts = await listPublicPosts({ query, page: pageNumber(params.page) })
  return (
    <PageShell>
      <header className="yohaku-page-heading">
        <p className="yohaku-eyebrow">SEARCH</p>
        <h1>搜索文章</h1>
        <form action="/search" className="yohaku-search-form">
          <label className="sr-only" htmlFor="q">
            关键词
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="搜索标题、摘要或正文"
            maxLength={200}
            className="yohaku-search-input"
          />
          <button
            type="submit"
            className="yohaku-search-submit"
          >
            搜索
          </button>
        </form>
      </header>
      <YohakuPostList posts={posts} basePath="/search" query={query} />
    </PageShell>
  )
}
