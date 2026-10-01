import type { Post } from '@/payload-types'
export type ShiroPostSource = Pick<Post, 'title' | 'slug' | 'categories' | 'meta'> &
  Partial<
    Pick<
      Post,
      | 'id'
      | 'summary'
      | 'heroImage'
      | 'publishedAt'
      | 'createdAt'
      | 'populatedAuthors'
      | 'searchText'
    >
  >
export function toShiroPostItem(post: ShiroPostSource) {
  const image = post.heroImage || post.meta?.image
  return {
    id: String(post.id ?? post.slug),
    title: post.title,
    slug: post.slug || '',
    url: `/posts/${encodeURIComponent(post.slug || '')}`,
    summary: post.summary || post.meta?.description || '',
    text: (post.searchText || '').slice(0, 300),
    created: post.publishedAt || post.createdAt || '',
    cover: image && typeof image === 'object' ? image.url : undefined,
    categories: (post.categories || []).flatMap((c) =>
      c && typeof c === 'object' ? [{ id: String(c.id), name: c.title, slug: c.slug || '' }] : [],
    ),
    authors: (post.populatedAuthors || []).flatMap((a) => (a.name ? [a.name] : [])),
  }
}
export type ShiroPostItem = ReturnType<typeof toShiroPostItem>
export function postDate(value: string) {
  return value
    ? new Date(value).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Shanghai',
      })
    : ''
}
