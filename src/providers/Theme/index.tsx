'use client'
import React, { createContext, useCallback, use, useEffect, useSyncExternalStore } from 'react'
import type { Theme, ThemeContextType } from './types'
import { themeIsValid } from './types'
import { themeLocalStorageKey } from './shared'

export function subscribeTheme(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  window.addEventListener('storage', callback)
  window.addEventListener('blog-theme-change', callback)
  media.addEventListener('change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('blog-theme-change', callback)
    media.removeEventListener('change', callback)
  }
}
export function readPreference() {
  const saved = window.localStorage.getItem(themeLocalStorageKey)
  return themeIsValid(saved) ? saved : 'auto'
}
function readTheme(): Theme {
  const saved = readPreference()
  return saved === 'auto'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : saved
}
const ThemeContext = createContext<ThemeContextType>({ setTheme: () => {}, theme: undefined })
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => undefined)
  const setTheme = useCallback((value: Theme | null) => {
    if (value) window.localStorage.setItem(themeLocalStorageKey, value)
    else window.localStorage.removeItem(themeLocalStorageKey)
    window.dispatchEvent(new Event('blog-theme-change'))
  }, [])
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}
export const useTheme = (): ThemeContextType => use(ThemeContext)
