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

export type YohakuAuthorDetail = {
  id: string
  name: string
  avatar?: string | null
}

export function toYohakuPostItem(post: YohakuPostSource) {
  const populated = (post.populatedAuthors || []).filter(
    (a): a is { id?: string | null; name: string; avatar?: string | null } =>
      Boolean(a && typeof a === 'object' && a.name),
  )

  const authors: string[] =
    populated.length > 0
      ? populated.map((a) => a.name)
      : post.importSource?.author
        ? [post.importSource.author]
        : []

  const authorDetails: YohakuAuthorDetail[] =
    populated.length > 0
      ? populated.map((a) => ({
          id: String(a.id || ''),
          name: a.name,
          avatar: a.avatar || null,
        }))
      : post.importSource?.author
        ? [{ id: '', name: post.importSource.author, avatar: null }]
        : []

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
    authors,
    authorDetails,
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
