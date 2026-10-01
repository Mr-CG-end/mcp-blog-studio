import { PageShell } from '@/components/yohaku/PageShell'
import React from 'react'
import { getSite } from '@/services/publicBlog'
import RichText from '@/components/RichText'
import { ArticleReader } from '@/components/ArticleReader'
export const dynamic = 'force-dynamic'
export const metadata = { title: '关于' }
export default async function About() {
  const site = await getSite()
  return (
    <PageShell className="yohaku-reading-page">
      <header className="yohaku-reading-heading">
        <h1>{site.aboutTitle || '自述'}</h1>
        <p>{site.aboutSubtitle || '这是一份关于站长的报告，请查收'}</p>
      </header>

      {site.about ? (
        <article data-article-content className="yohaku-article-body">
          <RichText data={site.about} enableGutter={false} />
        </article>
      ) : (
        <p className="yohaku-empty-about">
          {site.description}
        </p>
      )}
      <ArticleReader />
      <div className="yohaku-socials yohaku-about-socials">
        {site.socialLinks?.map((link) => (
          <a key={link.id || link.url} href={link.url} target="_blank" rel="noreferrer">
            {link.label} ↗
          </a>
        ))}
      </div>
    </PageShell>
  )
}
