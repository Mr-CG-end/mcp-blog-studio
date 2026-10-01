'use client'
import React, { useSyncExternalStore } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { readPreference, subscribeTheme, useTheme } from '..'
export function ThemeSelector() {
  const { setTheme } = useTheme()
  const value = useSyncExternalStore(subscribeTheme, readPreference, () => 'auto')
  return (
    <Select value={value} onValueChange={(v) => setTheme(v === 'dark' || v === 'light' ? v : null)}>
      <SelectTrigger aria-label="选择主题" className="w-auto bg-transparent gap-2 border-none">
        <SelectValue placeholder="主题" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">跟随系统</SelectItem>
        <SelectItem value="light">浅色</SelectItem>
        <SelectItem value="dark">深色</SelectItem>
      </SelectContent>
    </Select>
  )
}
