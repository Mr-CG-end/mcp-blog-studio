'use client'

/* Converted from the captured Chinese home DOM with full Payload CMS data decoupling. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'

export type QuoteSettings = {
  mode?: 'hitokoto' | 'custom_api' | 'manual' | 'disabled' | null
  manualQuote?: string | null
  manualAuthor?: string | null
  customApiUrl?: string | null
  quoteJsonPath?: string | null
}

export type HeroStats = {
  posts: string
  words: string
  days: string
}

export type SocialLinkItem = {
  label: string
  url: string
  platform?: string | null
}

function QuoteDisplay({ settings }: { settings?: QuoteSettings | null }) {
  const mode = settings?.mode || 'hitokoto'
  const [quote, setQuote] = useState<string>(
    settings?.manualQuote || '博学而笃志，切问而近思。',
  )
  const [author, setAuthor] = useState<string>(settings?.manualAuthor || '')

  useEffect(() => {
    if (mode === 'disabled') return
    if (mode === 'manual') {
      if (settings?.manualQuote) setQuote(settings.manualQuote)
      if (settings?.manualAuthor) setAuthor(settings.manualAuthor)
      return
    }

    const apiUrl =
      mode === 'custom_api' && settings?.customApiUrl?.trim()
        ? settings.customApiUrl.trim()
        : 'https://v1.hitokoto.cn/'

    const controller = new AbortController()

    fetch(apiUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!data) return
        let text = ''
        let from = ''

        if (mode === 'hitokoto') {
          text = data.hitokoto || data.text || ''
          from = [data.from_who, data.from].filter(Boolean).join(' · ')
        } else {
          const path = settings?.quoteJsonPath?.trim()
          if (path && data[path]) {
            text = String(data[path])
          } else {
            text = data.hitokoto || data.content || data.quote || data.text || data.data || ''
          }
          from = data.from || data.author || data.source || ''
        }

        if (text) {
          setQuote(text)
          setAuthor(from)
        }
      })
      .catch(() => {
        // Fallback gracefully on network error
      })

    return () => controller.abort()
  }, [
    mode,
    settings?.customApiUrl,
    settings?.manualQuote,
    settings?.manualAuthor,
    settings?.quoteJsonPath,
  ])

  if (mode === 'disabled') return null

  return (
    <div
      className={
        'min-h-[1.5em] max-w-[65ch] font-serif text-label-12 italic text-neutral-5 transition-opacity duration-300'
      }
      title={author ? `—— ${author}` : undefined}
    >
      {'「'}
      {quote}
      {'」'}
    </div>
  )
}

function renderSocialIcon(platform?: string | null, url?: string) {
  const p =
    platform ||
    (url?.includes('github')
      ? 'github'
      : url?.includes('x.com') || url?.includes('twitter')
        ? 'x'
        : url?.includes('t.me')
          ? 'telegram'
          : url?.includes('bilibili')
            ? 'bilibili'
            : url?.includes('music.163')
              ? 'netease'
              : url?.includes('mailto')
                ? 'email'
                : url?.includes('feed')
                  ? 'rss'
                  : 'custom')

  switch (p) {
    case 'x':
      return <i className={'i-mingcute-social-x-line'} />
    case 'rss':
      return <i className={'i-mingcute-rss-line'} />
    case 'email':
      return <i className={'i-mingcute-mail-line'} />
    case 'github':
      return <i className={'i-mingcute-github-line'} />
    case 'telegram':
      return <i className={'i-mingcute-telegram-line'} />
    case 'netease':
      return (
        <svg height={'1em'} viewBox={'0 0 24 24'} width={'1em'} xmlns={'http://www.w3.org/2000/svg'}>
          <path
            d={
              'M10.422 11.375c-.294 1.028.012 2.065.784 2.653c1.061.81 2.565.3 2.874-.995c.08-.337.103-.722.027-1.056c-.23-1.001-.521-1.988-.792-2.996c-1.33.154-2.543 1.172-2.893 2.394Zm5.548-.287c.273 1.012.285 2.017-.127 3c-1.128 2.69-4.722 3.14-6.573.826c-1.302-1.627-1.28-3.961.06-5.734c.78-1.032 1.804-1.707 3.048-2.054l.379-.104c-.084-.415-.188-.816-.243-1.224c-.176-1.317.512-2.503 1.744-3.04c1.226-.535 2.708-.216 3.53.76c.406.479.395 1.08-.025 1.464c-.412.377-.997.346-1.435-.09c-.247-.246-.51-.44-.877-.436c-.525.006-.987.418-.945.937c.037.468.172.93.3 1.386c.022.078.216.135.338.153c1.333.197 2.504.731 3.472 1.676c2.558 2.493 2.861 6.531.672 9.44c-1.529 2.032-3.61 3.169-6.127 3.409c-4.621.44-8.664-2.53-9.7-7.058C2.516 10.255 4.84 5.831 8.796 4.25c.586-.234 1.143-.031 1.371.498c.232.537-.019 1.086-.61 1.35c-2.368 1.06-3.817 2.855-4.215 5.423c-.533 3.434 1.656 6.777 5 7.722c2.723.769 5.658-.167 7.308-2.33c1.586-2.08 1.4-5.1-.427-6.874A3.978 3.978 0 0 0 15.4 9.026c.198.716.389 1.388.57 2.062Z'
            }
            fill={'currentColor'}
          />
        </svg>
      )
    case 'bilibili':
      return (
        <svg height={'1em'} viewBox={'0 0 24 24'} width={'1em'} xmlns={'http://www.w3.org/2000/svg'}>
          <path
            d={
              'M7.172 2.757L10.414 6h3.171l3.243-3.242a1 1 0 1 1 1.415 1.414L16.414 6H18.5A3.5 3.5 0 0 1 22 9.5v8a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 2 17.5v-8A3.5 3.5 0 0 1 5.5 6h2.085L5.757 4.171a1 1 0 0 1 1.415-1.414ZM18.5 8h-13a1.5 1.5 0 0 0-1.493 1.355L4 9.5v8a1.5 1.5 0 0 0 1.356 1.493L5.5 19h13a1.5 1.5 0 0 0 1.493-1.356L20 17.5v-8A1.5 1.5 0 0 0 18.5 8ZM8 11a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm8 0a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Z'
            }
            fill={'currentColor'}
          />
        </svg>
      )
    default:
      return <i className={'i-mingcute-link-line'} />
  }
}

export function CapturedHero({
  title,
  description,
  avatar,
  slogan,
  quoteSettings,
  stats,
  socialLinks,
}: {
  title: string
  description?: string | null
  avatar?: string | null
  slogan?: string | null
  quoteSettings?: QuoteSettings | null
  stats?: HeroStats | null
  socialLinks?: SocialLinkItem[] | null
}) {
  return (
    <div className={'flex min-h-[80vh] flex-col items-center justify-center py-16'}>
      <div className={'flex-1'}></div>
      <div className={'mb-8 capture-rise'} style={{ animationDelay: '100ms' }}>
        <img
          alt={'站点所有者头像'}
          loading={'lazy'}
          width={'112'}
          height={'112'}
          decoding={'async'}
          className={
            'rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] size-20 lg:size-28'
          }
          style={{ color: 'transparent' }}
          src={avatar || '/avatar.jpg'}
        />
      </div>
      <h1
        className={
          'text-center text-title-24 font-normal leading-relaxed text-neutral-9 lg:text-[2.5rem] lg:leading-snug capture-fade'
        }
        style={{ animationDelay: '200ms' }}
      >
        <span style={{ fontWeight: '300', opacity: '0.82' }}>{"Hi, I'm "}</span>
        <span
          style={{
            fontWeight: '560',
            color: 'var(--color-accent)',
            letterSpacing: '-0.035em',
            textShadow: '0 0 28px color-mix(in srgb, var(--color-accent) 22%, transparent)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontWeight: '300',
            display: 'inline-block',
            transform: 'rotate(-8deg) translateY(-0.03em)',
            marginLeft: '0.14em',
          }}
        >
          {' 👋'}
        </span>
        {slogan && (
          <>
            <br />
            <span style={{ fontWeight: '300', opacity: '0.78' }}>{slogan}</span>
            <span
              style={{
                display: 'inline-block',
                marginLeft: '0.28em',
                marginRight: '0.18em',
                color: 'var(--color-accent)',
                fontSize: '0.72em',
                verticalAlign: 'middle',
                animation: 'aiTwinkle 2.4s ease-in-out infinite',
                transformOrigin: 'center',
              }}
            >
              {'✦'}
            </span>
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '0.86em',
                backgroundColor: 'var(--color-accent)',
                marginLeft: '4px',
                verticalAlign: 'middle',
                animation: 'blink 1.2s linear infinite',
                borderRadius: '999px',
                opacity: '0.78',
                boxShadow: '0 0 14px var(--color-accent)',
              }}
            />
          </>
        )}
      </h1>
      {description && (
        <div
          className={
            'mt-4 text-center text-caption-10 uppercase tracking-[1.2px] text-neutral-5 lg:text-label-12 lg:tracking-[1.5px] capture-rise'
          }
          style={{ animationDelay: '400ms' }}
        >
          {description}
        </div>
      )}
      <div className={'flex-[1.5]'}></div>
      <div className={'text-center capture-rise'} style={{ animationDelay: '600ms' }}>
        <QuoteDisplay settings={quoteSettings} />
        {stats && (
          <div className={'mt-2.5'}>
            <div
              className={'flex gap-3 justify-center text-caption-10 tracking-wide text-neutral-4'}
            >
              <span>{stats.posts}</span>
              <span>{'·'}</span>
              <span>{stats.words}</span>
              <span>{'·'}</span>
              <span>{stats.days}</span>
            </div>
          </div>
        )}
      </div>
      {socialLinks && socialLinks.length > 0 && (
        <div className={'mb-8 mt-7 capture-rise'} style={{ animationDelay: '800ms' }}>
          <div className={'flex justify-center gap-3'}>
            {socialLinks.map((link) => (
              <div key={link.url} className={'inline-block'} role={'note'}>
                <a
                  aria-label={link.label}
                  className={
                    'center flex size-10 rounded-full text-neutral-6 transition-colors duration-200 hover:bg-neutral-3 hover:text-neutral-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35'
                  }
                  href={link.url}
                  rel={'noreferrer'}
                  target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                  title={link.label}
                >
                  <span
                    className={
                      'flex items-center justify-center [&_svg]:size-[18px] [&_i]:text-icon-lg'
                    }
                  >
                    {renderSocialIcon(link.platform, link.url)}
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
