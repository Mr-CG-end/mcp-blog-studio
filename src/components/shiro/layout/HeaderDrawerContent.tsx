'use client'
// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: header/internal/HeaderDrawerContent.tsx; local menu, sheet and theme provider.
import Link from 'next/link'
import { motion as m } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useSheetContext } from '../ui/sheet'
import { reboundPreset } from '../ui/spring'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'
import { defaultNavItems } from './HeaderContent'
export function HeaderDrawerContent() {
  const { dismiss } = useSheetContext()
  const pathname = usePathname()
  return (
    <nav
      aria-label="移动端导航"
      className="scrollbar-none mt-12 max-h-[80dvh] w-full space-y-4 overflow-auto pb-24"
    >
      {defaultNavItems.map((section, index) => (
        <m.section
          key={section.path}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...reboundPreset, delay: index * 0.08 }}
        >
          <Link
            className="block"
            href={section.path}
            onClick={dismiss}
            aria-current={pathname === section.path ? 'page' : undefined}
          >
            <span className="flex items-center space-x-2 py-2 text-lg">
              <i className={section.icon} />
              <span>{section.title}</span>
            </span>
          </Link>
        </m.section>
      ))}
      <ThemeSwitcher />
    </nav>
  )
}
