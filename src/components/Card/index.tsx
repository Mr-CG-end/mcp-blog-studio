import Link from 'next/link'
import { postDate, toYohakuPostItem, type YohakuPostSource } from '@/services/yohakuAdapter'
export type CardPostData = YohakuPostSource
export function Card({
  doc,
  title,
  className,
}: {
  doc?: CardPostData
  title?: string
  className?: string
  showCategories?: boolean
  relationTo?: string
  alignItems?: 'center'
}) {
  if (!doc) return null
  const post = toYohakuPostItem({ ...doc, title: title || doc.title })
  return (
    <article className={['yohaku-post-item', className].filter(Boolean).join(' ')}>
      <Link href={post.url}>
        <h3>{post.title}</h3>
        {post.summary && <p>{post.summary}</p>}
        <div className="yohaku-post-meta">
          <time dateTime={post.created}>{postDate(post.created)}</time>
          {post.categories.map((category) => <span key={category.id}>{category.name}</span>)}
        </div>
      </Link>
    </article>
  )
}
