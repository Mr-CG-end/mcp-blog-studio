'use client'
// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: header/internal/HeaderContent.tsx; retained ForDesktop spotlight/menu, local routes.
import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion as m, useMotionTemplate, useMotionValue } from 'motion/react'
import { cn as clsxm } from '@/utilities/ui'
export const defaultNavItems = [
  { title: '首页', path: '/', icon: 'i-mingcute-home-4-line' },
  { title: '文章', path: '/posts', icon: 'i-mingcute-document-line' },
  { title: '分类', path: '/categories', icon: 'i-mingcute-folder-line' },
  { title: '搜索', path: '/search', icon: 'i-mingcute-search-line' },
  { title: '关于', path: '/about', icon: 'i-mingcute-user-3-line' },
]
export function HeaderContent() {
  const pathname = usePathname()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const radius = useMotionValue(0)
  const handleMouseMove = React.useCallback(
    ({ clientX, clientY, currentTarget }: React.MouseEvent) => {
      const bounds = currentTarget.getBoundingClientRect()
      mouseX.set(clientX - bounds.left)
      mouseY.set(clientY - bounds.top)
      radius.set(Math.hypot(bounds.width, bounds.height) / 2.5)
    },
    [mouseX, mouseY, radius],
  )

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, var(--spotlight-color) 0%, transparent 65%)`

  return (
    <m.nav
      aria-label="主要导航"
      layout="size"
      onMouseMove={handleMouseMove}
      className={clsxm(
        'relative',
        'rounded-full bg-gradient-to-b from-zinc-50/70 to-white/90',
        'shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur-md',
        'dark:from-zinc-900/70 dark:to-zinc-800/90 dark:ring-zinc-100/10',
        'group [--spotlight-color:oklch(from_var(--color-accent)_l_c_h_/_0.12)]',
        'pointer-events-auto duration-200',
      )}
    >
      {/* Spotlight overlay */}
      <m.div
        className="pointer-events-none absolute -inset-px rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background }}
        aria-hidden="true"
      />
      <div className="flex px-4 font-medium text-zinc-800 dark:text-zinc-200">
        {defaultNavItems.map((section) => {
          const active =
            pathname === section.path ||
            (section.path !== '/' && pathname.startsWith(`${section.path}/`))
          return (
            <div key={section.path}>
              <Link
                href={section.path}
                aria-current={active ? 'page' : undefined}
                className={clsxm(
                  'relative block whitespace-nowrap px-4 py-2 transition duration-200',
                  active ? 'text-accent' : 'hover:text-accent/80',
                )}
              >
                <span className="relative flex items-center">
                  {active && (
                    <m.span layoutId="header-menu-icon" className="mr-2 flex items-center">
                      <i className={section.icon} />
                    </m.span>
                  )}
                  <m.span layout>{section.title}</m.span>
                </span>
                {active && (
                  <m.span
                    className="absolute inset-x-1 -bottom-px h-px bg-gradient-to-r from-accent/0 via-accent/70 to-accent/0"
                    layoutId="active-nav-item"
                  />
                )}
              </Link>
            </div>
          )
        })}
      </div>
    </m.nav>
  )
}
