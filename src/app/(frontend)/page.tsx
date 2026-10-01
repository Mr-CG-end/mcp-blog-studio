// Converted from captured innei.in/en DOM (2026-09-30); see docs/yohaku-conversion.md.
import { CapturedHero } from '@/components/yohaku/CapturedHero'
import Link from 'next/link'
import { getSite, getSiteStats, listPublicPosts } from '@/services/publicBlog'
import { postDate, toYohakuPostItem } from '@/services/yohakuAdapter'
export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  const site = await getSite()
  return { title: site.title, description: site.description }
}
export default async function Home() {
  const [site, posts, stats] = await Promise.all([
    getSite(),
    listPublicPosts({ limit: 5 }),
    getSiteStats(),
  ])
  return (
    <div className="yohaku-home">
      <div className="relative mx-auto min-w-0 max-w-[1400px] px-6 lg:px-12 xl:px-16 2xl:px-24">
        <CapturedHero
          title={site.title}
          description={site.description}
          avatar={typeof site.brandImage === 'object' ? site.brandImage?.url : undefined}
          slogan={site.heroSlogan}
          quoteSettings={site.quoteSettings}
          stats={stats}
          socialLinks={site.socialLinks}
        />
      </div>
      <section id="recent-posts" className="mx-auto mt-10 max-w-[1400px] px-4 font-serif lg:px-12">
        <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="yohaku-section-enter lg:pr-10">
            <div className="mb-5 lg:mb-6">
              <p className="mb-2 text-caption-10 uppercase tracking-[3px] text-neutral-5">
                Recent Writing
              </p>
              <h2 className="font-serif text-title-20 tracking-[2px] text-neutral-7 lg:text-title-24">
                近期笔墨
              </h2>
            </div>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-2 left-[18px] w-0.5 bg-border"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute left-[18px] top-2 h-[58%] w-0.5 bg-gradient-to-b from-accent to-transparent"
              />
              {posts.docs.map((source, index) => {
                const post = toYohakuPostItem(source)
                return (
                  <div
                    key={post.id}
                    className="yohaku-timeline-enter relative py-4 pl-10"
                    style={{ animationDelay: `${index * 55 + 80}ms` }}
                  >
                    <span
                      className={`absolute left-[19px] top-4 -translate-x-1/2 bg-paper px-1 text-label-12 font-medium tabular-nums tracking-[0.5px] ${index === 0 ? 'text-accent' : 'text-neutral-6'}`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Link className="block" href={post.url}>
                      {index === 0 && (
                        <div className="text-label-12 text-neutral-6">
                          文章 · {postDate(post.created)}
                        </div>
                      )}
                      <h3
                        className={
                          index === 0
                            ? 'mt-2 break-words text-title-20 font-medium leading-normal text-neutral-9 transition-colors hover:text-accent'
                            : 'break-words text-copy-14 font-normal text-neutral-8 transition-colors hover:text-accent'
                        }
                      >
                        {post.title}
                      </h3>
                      {index > 0 && (
                        <div className="mt-1 text-label-12 text-neutral-6">
                          文章{post.categories.map((c) => ` · ${c.name}`).join('')}
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}
              {!posts.docs.length && (
                <p className="py-4 pl-10 text-copy-14 text-neutral-6">暂无公开文章。</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
