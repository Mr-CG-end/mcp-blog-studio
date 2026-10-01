import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { getSite } from '@/services/publicBlog'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/blog-og.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    let rawUrl = image.sizes?.og?.url || image.url || '/blog-og.webp'
    if (rawUrl.startsWith('/api/media/file/')) {
      rawUrl = rawUrl.replace('/api/media/file/', '/media/')
    }
    url = new URL(rawUrl, serverUrl).href
  }

  return url
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(
    doc?.meta?.image || (doc && 'heroImage' in doc ? doc.heroImage : undefined),
  )
  const description = doc?.meta?.description || (doc && 'summary' in doc ? doc.summary : undefined)

  const site = await getSite()
  const title = `${doc?.meta?.title || doc?.title || site.title} | ${site.title}`

  return {
    description,
    openGraph: mergeOpenGraph({
      description: description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: doc?.slug ? `${doc && 'content' in doc ? '/posts' : ''}/${doc.slug}` : '/',
    }),
    title,
  }
}
