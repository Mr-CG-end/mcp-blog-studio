'use client'
import { useSyncExternalStore } from 'react'
import { readPreference, subscribeTheme, useTheme } from '@/providers/Theme'
export function ThemeLinks() {
  const { setTheme } = useTheme()
  const preference = useSyncExternalStore(subscribeTheme, readPreference, () => 'auto')
  return (
    <div className="yohaku-theme-links" role="group" aria-label="主题模式">
      <span>主题</span>
      {(
        [
          ['light', '浅色', '浅色模式'],
          ['auto', '系统', '跟随系统'],
          ['dark', '深色', '切换深色主题'],
        ] as const
      ).map(([value, label, aria]) => (
        <button
          key={value}
          type="button"
          aria-label={aria}
          aria-pressed={preference === value}
          onClick={() => setTheme(value === 'auto' ? null : value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
