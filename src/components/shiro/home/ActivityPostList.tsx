'use client'
// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: app/[locale]/(home)/components/ActivityPostList.tsx; posts only, Payload URLs.
import { motion as m } from 'motion/react'
import Link from 'next/link'
import { Spring } from '../ui/spring'
import { postDate, type ShiroPostItem } from '@/services/shiroAdapter'
export function ActivityPostList({ posts }: { posts: ShiroPostItem[] }) {
  return (
    <m.section
      initial={{ opacity: 0.0001, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={Spring.presets.snappy}
      className="mt-8 flex flex-col gap-4 lg:mt-0"
      viewport={{ once: true }}
    >
      <h2 className="text-2xl font-medium leading-loose">最近文章</h2>
      <ul className="shiro-timeline mt-4">
        {posts.map((post) => (
          <li key={post.id} className="flex min-w-0 justify-between">
            <Link prefetch className="min-w-0 shrink truncate" href={post.url}>
              {post.title}
            </Link>

            <span className="ml-2 shrink-0 self-end text-xs opacity-70">
              <time dateTime={post.created}>{postDate(post.created)}</time>
            </span>
          </li>
        ))}
      </ul>

      <Link
        className="flex items-center justify-end opacity-70 duration-200 hover:text-accent"
        href="/posts"
      >
        <i className="i-mingcute-arrow-right-circle-line" />
        <span className="ml-2">更多文章</span>
      </Link>
    </m.section>
  )
}
