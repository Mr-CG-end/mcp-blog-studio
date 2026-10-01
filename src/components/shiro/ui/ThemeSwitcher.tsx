'use client'
// Innei/Shiro 891bb24 ui/theme-switcher (AGPL-3.0); adapted to Payload theme provider and storage.

import { useCallback, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { useTheme } from '@/providers/Theme'
import { themeLocalStorageKey } from '@/providers/Theme/shared'

const iconClassNames = 'h-4 w-4 text-current'

const SunIcon = () => (
  <svg
    className={iconClassNames}
    fill="none"
    height="24"
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="24"
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2" />
    <path d="M12 21v2" />
    <path d="M4.22 4.22l1.42 1.42" />
    <path d="M18.36 18.36l1.42 1.42" />
    <path d="M1 12h2" />
    <path d="M21 12h2" />
    <path d="M4.22 19.78l1.42-1.42" />
    <path d="M18.36 5.64l1.42-1.42" />
  </svg>
)

const SystemIcon = () => (
  <svg
    className={iconClassNames}
    fill="none"
    height="24"
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="24"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
)

const DarkIcon = () => (
  <svg
    fill="none"
    height="24"
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="24"
    className={iconClassNames}
  >
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

export const transitionViewIfSupported = (updateCb: () => void) => {
  if (typeof window === 'undefined') {
    updateCb()
    return
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    updateCb()
    return
  }
  if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
    try {
      document.startViewTransition(updateCb)
    } catch {
      updateCb()
    }
  } else {
    updateCb()
  }
}

export const ThemeSwitcher = () => (
  <div className="relative inline-block select-none" data-theme-switcher>
    <ThemeIndicator />
    <ButtonGroup />
  </div>
)

const emptySubscribe = () => () => {}

function subscribePreference(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  try {
    window.addEventListener('storage', callback)
    window.addEventListener('blog-theme-change', callback)
    return () => {
      window.removeEventListener('storage', callback)
      window.removeEventListener('blog-theme-change', callback)
    }
  } catch {
    return () => {}
  }
}

function getPreferenceSnapshot(): 'light' | 'system' | 'dark' {
  if (typeof window === 'undefined') return 'system'
  try {
    const saved = window.localStorage.getItem(themeLocalStorageKey)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // Fallback for sandboxed iframes or disabled storage
  }
  return 'system'
}

const leftPositionMap: Record<'light' | 'system' | 'dark', number> = {
  light: 4,
  system: 36,
  dark: 68,
}

const ThemeIndicator = () => {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    () => 'system' as const,
  )

  if (!isClient) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-[4px] z-0 size-[32px] rounded-full bg-base-100 shadow-[0_1px_2px_0_rgba(127.5,127.5,127.5,.2),_0_1px_3px_0_rgba(127.5,127.5,127.5,.1)] transition-all duration-200 ease-out dark:bg-zinc-800"
      style={{
        left: `${leftPositionMap[preference]}px`,
      }}
    />
  )
}

const buttonBaseClass =
  'relative z-1 inline-flex h-[32px] w-[32px] items-center justify-center rounded-full border-0 text-current transition-opacity duration-150 hover:opacity-100 opacity-70 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const ButtonGroup = () => {
  const { setTheme } = useTheme()
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    () => 'system' as const,
  )

  const buildThemeTransition = useCallback(
    (target: 'light' | 'dark' | 'system') => {
      let resolvedTheme: 'light' | 'dark' = 'light'
      if (target === 'system') {
        try {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        } catch {
          resolvedTheme = 'light'
        }
      } else {
        resolvedTheme = target
      }

      const applyTheme = () => {
        flushSync(() => {
          if (target === 'system') {
            setTheme(null)
          } else {
            setTheme(target)
          }
          document.documentElement.setAttribute('data-theme', resolvedTheme)
        })
      }

      transitionViewIfSupported(applyTheme)
    },
    [setTheme],
  )

  return (
    <div
      role="group"
      aria-label="主题模式"
      className="inline-flex rounded-full border border-zinc-200 p-[3px] dark:border-zinc-700"
    >
      <button
        aria-label="浅色模式"
        aria-pressed={isClient ? preference === 'light' : false}
        title="浅色模式"
        type="button"
        className={buttonBaseClass}
        onClick={() => buildThemeTransition('light')}
      >
        <SunIcon />
      </button>
      <button
        aria-label="跟随系统"
        aria-pressed={isClient ? preference === 'system' : true}
        title="跟随系统"
        type="button"
        className={buttonBaseClass}
        onClick={() => buildThemeTransition('system')}
      >
        <SystemIcon />
      </button>
      <button
        aria-label="切换深色主题"
        aria-pressed={isClient ? preference === 'dark' : false}
        title="深色模式"
        type="button"
        className={buttonBaseClass}
        onClick={() => buildThemeTransition('dark')}
      >
        <DarkIcon />
      </button>
    </div>
  )
}
