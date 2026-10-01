// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: layout/footer/Footer.tsx and FooterInfo.tsx; site props, removed locale/subscription/gateway.
import Link from 'next/link'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
export function Footer({ siteTitle }: { siteTitle: string }) {
  return (
    <footer
      data-hide-print
      className="relative z-[1] mt-32 border-t bg-[var(--footer-bg)] py-6 text-base-content/80"
    >
      <div className="px-4 sm:px-8">
        <div className="relative mx-auto max-w-7xl lg:px-8">
          <div className="relative">
            <div className="space-x-0 space-y-3 md:space-x-6 md:space-y-0">
              <div className="flex items-center gap-4 md:inline-flex">
                <b className="inline-flex items-center font-medium">
                  探索
                  <i className="i-mingcute-right-line ml-2" />
                </b>
                <span className="space-x-4">
                  <Link className="link-hover link" href="/posts">
                    文章
                  </Link>
                  <Link className="link-hover link" href="/categories">
                    分类
                  </Link>
                  <Link className="link-hover link" href="/about">
                    关于
                  </Link>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-12 space-y-3 text-center text-sm md:mt-6 md:text-left">
            <div>
              © {new Date().getFullYear()} <Link href="/">{siteTitle}</Link>
              <span className="mx-2 opacity-50">|</span>
              <Link href="/credits">开源说明</Link>
              <span className="mx-2 opacity-50">|</span>
              <a href="/sitemap.xml">站点地图</a>
            </div>
            <div>
              Powered by Payload CMS &{' '}
              <a
                className="link-hover link"
                href="https://github.com/Mr-CG-end/mcp-blog-studio"
                target="_blank"
                rel="noreferrer"
              >
                mcp-blog-studio
              </a>
              .
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-4 md:absolute md:bottom-0 md:right-0 md:mt-0 md:flex-row">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
