import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: '记录想法、分享实践与探索。',
  images: [
    {
      url: `${getServerSideURL()}/blog-og.webp`,
    },
  ],
  siteName: 'MCP Blog Studio',
  title: 'MCP Blog Studio',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
