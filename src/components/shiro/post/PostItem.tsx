'use client'
// Adapted from Innei/Shiro, commit 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: components/modules/post/PostItem.tsx (PostLooseItem); Payload props, no owner/pin actions.
import type { ShiroPostItem as PostListItem } from '@/services/shiroAdapter'
import { postDate } from '@/services/shiroAdapter'
import clsx from 'clsx'
import { memo } from 'react'

import { MagneticHoverEffect } from '@/components/shiro/ui/MagneticHoverEffect'
import Link from 'next/link'

export const PostLooseItem = memo<{ data: PostListItem }>(function PostLooseItem({ data }) {
  const text = data.text ?? ''
  const displayText = text.length > 300 ? `${text.slice(0, 300)}...` : text
  const hasImage = data.cover
  const postLink = data.url

  return (
    <MagneticHoverEffect
      as={Link}
      href={postLink}
      className="relative flex cursor-pointer! flex-col py-8 before:-inset-x-6 focus-visible:shadow-none!"
    >
      <h2 className="relative break-words text-2xl font-medium">
        <div className={clsx('flex items-baseline gap-2', 'w-full')}>
          <span>{data.title}</span>
        </div>
      </h2>
      <div className="relative mt-8 space-y-2">
        {!!data.summary && (
          <p className="mb-4 break-all rounded-md px-4 py-2 text-sm leading-relaxed text-zinc-900 ring-1 ring-accent/10 dark:text-zinc-50">
            摘要： {data.summary}
          </p>
        )}
        <div className="relative overflow-hidden text-justify">
          {hasImage && (
            <div
              className={clsx(
                'float-right mb-2 ml-3 size-[5.5rem] overflow-hidden rounded-md',
                'bg-cover bg-center bg-no-repeat',
              )}
              style={{ backgroundImage: `url(${hasImage})` }}
            />
          )}
          <p className="break-all leading-loose text-zinc-800/90 dark:text-zinc-200/90">
            {displayText}
          </p>
        </div>
      </div>

      <div className="mt-2 flex select-none flex-wrap items-center justify-end gap-4 text-base-content/60">
        <span className="flex flex-wrap items-center gap-3 text-sm">
          <time dateTime={data.created}>{postDate(data.created)}</time>
          {data.categories.map((c) => (
            <span key={c.id}>{c.name}</span>
          ))}
          {!!data.authors.length && <span>{data.authors.join('、')}</span>}
        </span>
        <span className="flex shrink-0 select-none items-center space-x-1 text-right text-accent hover:text-accent [&>svg]:hover:ml-2">
          <span>阅读全文</span>
          <i className="i-mingcute-arrow-right-line text-lg transition-[margin]" />
        </span>
      </div>
    </MagneticHoverEffect>
  )
})
