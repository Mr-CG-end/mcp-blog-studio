import type { Post } from '@/payload-types'

export type YohakuPostSource = Pick<Post, 'title' | 'slug' | 'categories' | 'meta'> &
  Partial<
    Pick<
      Post,
      | 'id'
      | 'summary'
      | 'publishedAt'
      | 'createdAt'
      | 'populatedAuthors'
      | 'searchText'
      | 'importSource'
    >
  >

function plainSummary(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(?:^|\n)#{1,6}\s*/g, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function toYohakuPostItem(post: YohakuPostSource) {
  return {
    id: String(post.id ?? post.slug),
    title: post.title,
    slug: post.slug || '',
    url: `/posts/${encodeURIComponent(post.slug || '')}`,
    summary: plainSummary(post.summary || post.meta?.description || ''),
    text: (post.searchText || '').slice(0, 180),
    created: post.publishedAt || post.createdAt || '',
    categories: (post.categories || []).flatMap((category) =>
      category && typeof category === 'object'
        ? [{ id: String(category.id), name: category.title, slug: category.slug || '' }]
        : [],
    ),
    authors: post.importSource?.author
      ? [post.importSource.author]
      : (post.populatedAuthors || []).flatMap((author) => (author.name ? [author.name] : [])),
  }
}

export type YohakuPostItem = ReturnType<typeof toYohakuPostItem>

export function postDate(value: string) {
  return value
    ? new Date(value).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Shanghai',
      })
    : ''
}
