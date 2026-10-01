'use client'
// Innei/Shiro 891bb24 (AGPL-3.0), modules/shared/SearchFAB.tsx SearchItem.
// Payload result props; bounded subtitles and local selection callbacks.
import Link from 'next/link'
import { cn } from '@/utilities/ui'
export type SearchResult = { id: string; title: string; url: string; subtitle?: string }
export function SearchResults({
  items,
  selected = -1,
  onSelect,
  onNavigate,
}: {
  items: SearchResult[]
  selected?: number
  onSelect?: (index: number) => void
  onNavigate?: () => void
}) {
  return (
    <ul className="px-2 py-4">
      {items.map((item, index) => (
        <li
          key={item.id}
          onMouseOver={() => onSelect?.(index)}
          className={cn(
            'relative flex w-full justify-between px-1 before:absolute before:inset-0 before:rounded-md before:z-0 hover:before:bg-zinc-200/80 dark:hover:before:bg-zinc-800/80',
            selected === index && 'before:bg-zinc-200/80 dark:before:bg-zinc-800/80',
          )}
        >
          <Link
            href={item.url}
            onClick={onNavigate}
            className="relative z-10 flex w-full justify-between gap-4 p-3"
          >
            <span className="block min-w-0 flex-1 truncate">{item.title}</span>
            <span className="block max-w-[35%] truncate text-zinc-800 dark:text-slate-200/80">
              {item.subtitle}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
