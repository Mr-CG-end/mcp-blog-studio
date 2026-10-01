// Detail layout adapted from Shiro 891bb24 posts/(post-detail)/[category]/[slug]/page.tsx (AGPL-3.0).
import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode, headers } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'
import { ArticleReader } from '@/components/ArticleReader'

import type { Post } from '@/payload-types'

import Link from 'next/link'
import { postDate, toYohakuPostItem } from '@/services/yohakuAdapter'
import { generateMeta } from '@/utilities/generateMeta'
import { LivePreviewListener } from '@/components/LivePreviewListener'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const item = toYohakuPostItem(post)
  return (
    <div className="yohaku-article-page">
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <div className="yohaku-article-grid">
        <div className="yohaku-article-main">
          <header className="yohaku-article-heading">
            {item.categories[0] ? (
              <Link
                href={`/categories/${encodeURIComponent(item.categories[0].slug)}`}
                className="yohaku-article-kicker"
              >
                ← {item.categories[0].name}
              </Link>
            ) : null}
            <h1>{post.title}</h1>
            <div className="yohaku-article-meta">
              <time dateTime={item.created}>{postDate(item.created)}</time>
              {item.categories.map((c) => (
                <Link key={c.id} href={`/categories/${encodeURIComponent(c.slug)}`}>
                  {c.name}
                </Link>
              ))}
              <span>{item.authors.join('、')}</span>
            </div>
          </header>
          <article data-article-content className="yohaku-article-body">
            <RichText
              className="w-full max-w-none"
              data={post.content}
              enableGutter={false}
              sourceHeadings={
                Array.isArray(post.importSource?.headings)
                  ? (post.importSource.headings as { id: string; text: string }[])
                  : undefined
              }
            />
          </article>
          {post.showSourceCredit !== false && post.importSource?.url && (
            <p className="yohaku-source-credit">
              {post.importSource.author ? `原文作者：${post.importSource.author} · ` : ''}
              <a href={post.importSource.url} target="_blank" rel="noreferrer">
                原文链接
              </a>
            </p>
          )}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <section className="yohaku-related-posts">
              <p className="yohaku-eyebrow">CONTINUE READING</p>
              <h2>继续阅读</h2>
              <RelatedPosts docs={post.relatedPosts.filter((post) => typeof post === 'object')} />
            </section>
          )}
        </div>
        <ArticleReader key={post.updatedAt} />
      </div>
    </div>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  const meta = await generateMeta({ doc: post })
  return {
    ...meta,
    ...((await draftMode()).isEnabled ? { robots: { index: false, follow: false } } : {}),
  }
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: false,
    user: draft ? (await payload.auth({ headers: await headers() })).user : undefined,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
