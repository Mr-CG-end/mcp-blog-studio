'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion as m } from 'motion/react'
import { ThemeLinks } from './ThemeLinks'

export type NavItem = { href: string; label: string; newTab?: boolean }

const defaultNavigation: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/posts', label: '文稿' },
  { href: '/categories', label: '分类' },
  { href: '/search', label: '搜索' },
  { href: '/about', label: '关于' },
]

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden fill="none" height="16" viewBox="0 0 24 24" width="16">
      <line
        className="yohaku-menu-line yohaku-menu-line-top"
        data-open={open || undefined}
        x1="4"
        x2="20"
        y1="6"
        y2="6"
      />
      <line
        className="yohaku-menu-line yohaku-menu-line-mid"
        data-open={open || undefined}
        x1="4"
        x2="20"
        y1="12"
        y2="12"
      />
      <line
        className="yohaku-menu-line yohaku-menu-line-bottom"
        data-open={open || undefined}
        x1="4"
        x2="20"
        y1="18"
        y2="18"
      />
    </svg>
  )
}

export function YohakuHeader({
  title,
  avatar,
  navItems,
}: {
  title: string
  avatar?: string | null
  navItems?: NavItem[] | null
}) {
  const items = navItems && navItems.length > 0 ? navItems : defaultNavigation
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const desktop = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const switchLayout = (event: MediaQueryListEvent) => {
      setOpen(false)
      document.body.style.overflow = ''
      if (!event.matches) {
        requestAnimationFrame(() => trigger.current?.focus())
      }
    }
    desktopQuery.addEventListener('change', switchLayout)
    return () => desktopQuery.removeEventListener('change', switchLayout)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => closeButton.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const items = Array.from(
          container.current?.querySelectorAll<HTMLElement>('a:not([tabindex="-1"]), button') || [],
        )
        const first = items[0]
        const last = items.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
        return
      }
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      requestAnimationFrame(() => trigger.current?.focus())
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previous || ''
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus())
  }

  return (
    <>
      <div className="yohaku-desktop-header" ref={desktop} data-hide-print>
        <Link
          href="/"
          className="yohaku-desktop-avatar"
          aria-label={`${title} 首页`}
          title={`${title} 首页`}
        >
          {avatar ? <Image unoptimized alt={title} width={40} height={40} src={avatar} /> : title}
        </Link>
        <nav
          id="desktop-navigation"
          aria-label="桌面导航"
          className="yohaku-desktop-nav"
          data-open="true"
        >
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="yohaku-desktop-nav-link"
                target={item.newTab ? '_blank' : undefined}
                rel={item.newTab ? 'noreferrer' : undefined}
              >
                {active && (
                  <m.span
                    layoutId="yohaku-desktop-active-pill"
                    className="yohaku-active-pill"
                    data-active-pill
                    data-spring="0.45s"
                    transition={{
                      type: 'spring',
                      duration: 0.45,
                      bounce: 0.15,
                    }}
                  />
                )}
                <span className="yohaku-desktop-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
      {open && (
        <button
          aria-label="关闭导航遮罩"
          className="yohaku-header-backdrop"
          data-hide-print
          onClick={close}
          type="button"
        />
      )}
      <div
        ref={container}
        className="yohaku-header"
        data-open={open || undefined}
        data-hide-print
        role="banner"
      >
        <div className="yohaku-header-paper">
          <div className="yohaku-header-content" aria-hidden={!open} inert={!open}>
            <div aria-label="站点导航" aria-modal="true" role="dialog">
              <div className="yohaku-header-scroll">
                <nav aria-label="移动端导航" className="yohaku-menu-nav">
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(`${item.href}/`))
                    return (
                      <Link
                        key={item.href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={item.label}
                        href={item.href}
                        onClick={close}
                        tabIndex={open ? 0 : -1}
                        target={item.newTab ? '_blank' : undefined}
                        rel={item.newTab ? 'noreferrer' : undefined}
                      >
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
                <div className="yohaku-menu-more">
                  <span>MORE</span>
                  <div>
                    <Link href="/categories" onClick={close} tabIndex={open ? 0 : -1}>
                      分类
                    </Link>
                    <Link href="/search" onClick={close} tabIndex={open ? 0 : -1}>
                      搜索
                    </Link>
                    <Link href="/about" onClick={close} tabIndex={open ? 0 : -1}>
                      关于
                    </Link>
                    <Link href="/credits" onClick={close} tabIndex={open ? 0 : -1}>
                      开源说明
                    </Link>
                  </div>
                </div>
                <div className="yohaku-menu-theme">
                  <ThemeLinks />
                </div>
              </div>
            </div>
          </div>
          <div className="yohaku-header-divider" />
          <div className="yohaku-header-bar">
            <Link
              aria-label={title}
              className="yohaku-header-brand"
              href="/"
              onClick={open ? close : undefined}
              tabIndex={open ? -1 : 0}
            >
              {avatar ? <Image unoptimized alt="" height={24} src={avatar} width={24} /> : null}
              <span>{title}</span>
            </Link>
            <button
              ref={open ? closeButton : trigger}
              aria-expanded={open}
              aria-label={open ? '关闭菜单' : '打开菜单'}
              className="yohaku-header-toggle"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
