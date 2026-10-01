import Link from 'next/link'
import { Feather, ArrowUpRight } from 'lucide-react'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { CMSLink } from '@/components/Link'
import { getSite } from '@/services/publicBlog'
export async function Footer() {
  const [data, site] = await Promise.all([getCachedGlobal('footer', 1)(), getSite()])
  return (
    <footer className="site-footer shell">
      <div className="footer-top">
        <div>
          <Link className="brand" href="/">
            <Feather size={18} />
            {site.title}
          </Link>
          <p className="footer-note">让想法留下痕迹，让分享产生连接。</p>
        </div>
        <div className="footer-links">
          {data.navItems?.map(({ link }, i) => (
            <CMSLink key={i} {...link} />
          ))}
          <Link href="/about">关于本站</Link>
          <Link href="/admin">
            管理后台 <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.title}
        </span>
        <span>
          基于{' '}
          <a href="https://github.com/Mr-CG-end/mcp-blog-studio" target="_blank" rel="noreferrer">
            mcp-blog-studio
          </a>{' '}
          适配 · <Link href="/credits">开源说明与源码</Link>
        </span>
      </div>
    </footer>
  )
}
