import { getFooter, getHeader, getSite } from '@/services/publicBlog'
import type { Metadata } from 'next'

import profile from '@/components/yohaku/captured-profile.json'
import React from 'react'

import { YohakuFooter } from '@/components/yohaku/Footer'
import { YohakuHeader } from '@/components/yohaku/Header'
import { SearchFAB } from '@/components/shiro/ui/SearchFAB'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'

import './globals.css'
import './yohaku.css'
import { getServerSideURL } from '@/utilities/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, header, footer] = await Promise.all([
    getSite(),
    getHeader(),
    getFooter(),
  ])

  const headerNavItems = header.navItems?.map((item) => {
    const href =
      item.link?.url ||
      (typeof item.link?.reference?.value === 'object' && item.link?.reference?.value?.slug
        ? `/${item.link.reference.value.slug}`
        : '/')
    return {
      href,
      label: item.link?.label || '链接',
      newTab: Boolean(item.link?.newTab),
    }
  })

  const footerNavItems = footer.navItems?.map((item) => {
    const href =
      item.link?.url ||
      (typeof item.link?.reference?.value === 'object' && item.link?.reference?.value?.slug
        ? `/${item.link.reference.value.slug}`
        : '/')
    return {
      href,
      label: item.link?.label || '链接',
      newTab: Boolean(item.link?.newTab),
    }
  })

  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <InitTheme />
        {/* Captured font subsets retain their original URLs; served locally without remote scripts. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/yohaku/captured.css" precedence="yohaku" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body
        className={`${profile.bodyClass} min-h-screen antialiased flex flex-col justify-between`}
      >
        <Providers>
          <a
            className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-content"
            href="#main-content"
          >
            跳转到主要内容
          </a>
          <YohakuHeader
            title={site.title}
            avatar={
              site.brandImage && typeof site.brandImage === 'object'
                ? site.brandImage.url
                : profile.avatar
            }
            navItems={headerNavItems}
          />
          <main id="main-content" className="yohaku-main flex-1">
            {children}
          </main>
          <YohakuFooter
            siteTitle={site.title}
            description={site.description}
            navItems={footerNavItems}
          />
          <SearchFAB />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
  },
}
