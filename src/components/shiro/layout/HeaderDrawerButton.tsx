'use client'
// Innei/Shiro 891bb24: HeaderDrawerButton and HeaderActionButton (AGPL-3.0); native button and existing Vaul integration.

import { useSyncExternalStore } from 'react'
import { PresentSheet } from '@/components/shiro/ui/sheet'
import { HeaderDrawerContent } from './HeaderDrawerContent'

const emptySubscribe = () => () => {}

export const HeaderDrawerButton: React.FC = () => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const triggerButton = (
    <button
      type="button"
      aria-label="打开菜单"
      title="打开菜单"
      className="group flex size-10 items-center justify-center rounded-full bg-base-100 px-3 text-sm ring-1 ring-zinc-900/5 transition dark:ring-white/10 dark:hover:ring-white/20"
    >
      <svg
        className="size-5"
        fill="none"
        height="24"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
      >
        <line x1="3" x2="21" y1="6" y2="6" />
        <line x1="3" x2="21" y1="12" y2="12" />
        <line x1="3" x2="21" y1="18" y2="18" />
      </svg>
      <span className="sr-only">打开菜单</span>
    </button>
  )

  if (!mounted) {
    return triggerButton
  }

  return (
    <PresentSheet title="站点导航" content={<HeaderDrawerContent />}>
      {triggerButton}
    </PresentSheet>
  )
}
