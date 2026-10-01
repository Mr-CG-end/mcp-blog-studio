// Footer DOM converted from innei.in/en; unavailable services removed.
import Link from 'next/link'
import { ThemeLinks } from './ThemeLinks'
export function YohakuFooter({
  siteTitle,
  description,
  navItems,
}: {
  siteTitle: string
  description?: string | null
  navItems?: Array<{ href: string; label: string; newTab?: boolean }> | null
}) {
  const items =
    navItems && navItems.length > 0
      ? navItems
      : [
          { href: '/about', label: '关于本站' },
          { href: '/credits', label: '开源说明' },
          { href: '/posts', label: '文章' },
          { href: '/categories', label: '分类' },
          { href: '/sitemap.xml', label: '站点地图' },
        ]

  return (
    <footer className="yohaku-footer" data-hide-print>
      <div className="px-4 sm:px-8">
        <div className="mx-auto min-w-0 max-w-7xl lg:px-8">
          <div className="font-serif text-copy-16 tracking-[0.1em] text-neutral-9">
            <Link href="/">{siteTitle}</Link>
          </div>
          {description && <p className="mt-1 text-copy-13 italic text-neutral-7">{description}</p>}
          <div className="mt-5 flex flex-wrap items-baseline gap-2 font-mono text-label-12 text-neutral-6">
            <span>
              © {new Date().getFullYear()} {siteTitle}
            </span>
            <span aria-hidden>·</span>
            <a href="https://github.com/Mr-CG-end/mcp-blog-studio" target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          </div>
          <div className="yohaku-footer-row">
            {items.map((item, index) => (
              <span key={item.href || index} className="contents">
                {index > 0 && <span aria-hidden>·</span>}
                <Link
                  href={item.href}
                  target={item.newTab ? '_blank' : undefined}
                  rel={item.newTab ? 'noreferrer' : undefined}
                >
                  {item.label}
                </Link>
              </span>
            ))}
            <span className="flex-1" />
            <ThemeLinks />
          </div>
        </div>
      </div>
    </footer>
  )
}
