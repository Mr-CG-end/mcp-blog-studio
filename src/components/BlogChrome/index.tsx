'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowUpRight, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { useTheme } from '@/providers/Theme'
import { CMSLink } from '@/components/Link'
import type { Header } from '@/payload-types'

export function BlogNavigation({ data }: { data: Header }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  return (
    <>
      <nav className="desktop-nav" aria-label="主导航">
        <Link href="/" aria-current={path === '/' ? 'page' : undefined}>
          首页
        </Link>
        {data.navItems?.length ? (
          data.navItems.map(({ link }, i) => <CMSLink key={i} {...link} />)
        ) : (
          <>
            <Link href="/posts" aria-current={path.startsWith('/posts') ? 'page' : undefined}>
              文章
            </Link>
            <Link href="/about" aria-current={path === '/about' ? 'page' : undefined}>
              关于
            </Link>
          </>
        )}
      </nav>
      <div className="header-actions">
        <Link className="icon-button" href="/search" aria-label="搜索">
          <Search size={19} />
        </Link>
        <button
          className="icon-button"
          aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button
          className="icon-button mobile-menu-toggle"
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          className="mobile-nav"
          aria-label="移动端导航"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <Link href="/">
            首页 <ArrowUpRight size={16} />
          </Link>
          {data.navItems?.length ? (
            data.navItems.map(({ link }, i) => <CMSLink key={i} {...link} />)
          ) : (
            <>
              <Link href="/posts">
                文章 <ArrowUpRight size={16} />
              </Link>
              <Link href="/about">
                关于 <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </nav>
      )}
    </>
  )
}
