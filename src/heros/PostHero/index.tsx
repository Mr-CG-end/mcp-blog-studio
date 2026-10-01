import React from 'react'
import Link from 'next/link'
import type { Post } from '@/payload-types'
import { Media } from '@/components/Media'
export function PostHero({ post }: { post: Post }) {
  return (
    <header className="container article-header mb-12">
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
        {post.categories?.map(
          (c) =>
            typeof c === 'object' &&
            c && (
              <Link href={`/categories/${c.slug}`} key={c.id}>
                {c.title}
              </Link>
            ),
        )}
      </div>
      <h1 className="text-3xl md:text-5xl font-semibold leading-tight mb-6">{post.title}</h1>
      {post.summary && <p className="article-summary">{post.summary}</p>}
      <div className="text-sm text-muted-foreground flex flex-wrap gap-4 mb-8">
        <span>
          {post.populatedAuthors
            ?.map((a) => a.name)
            .filter(Boolean)
            .join('、')}
        </span>
        {post.publishedAt && (
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </time>
        )}
      </div>
      {post.heroImage && typeof post.heroImage === 'object' && (
        <Media resource={post.heroImage} priority imgClassName="rounded-lg w-full" />
      )}
    </header>
  )
}
