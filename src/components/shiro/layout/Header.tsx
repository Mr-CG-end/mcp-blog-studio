// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: components/layout/header/Header.tsx and HeaderArea.tsx; Payload brand, no owner auth.
import Link from 'next/link'
import Image from 'next/image'
import { HeaderContent } from './HeaderContent'
import { HeaderDrawerButton } from './HeaderDrawerButton'
import './grid.css'
export function Header({ title, avatar }: { title: string; avatar?: string | null }) {
  return (
    <header
      data-shiro-header
      data-hide-print
      className="fixed top-0 z-30 h-[4.5rem] w-0 lg:inset-x-0 lg:w-auto"
    >
      <div className="header--grid relative mx-auto grid h-full min-h-0 w-[calc(100vw-var(--removed-body-scroll-bar-size,0px))] max-w-7xl grid-cols-[4.5rem_auto_4.5rem] lg:px-8">
        <div className="relative flex size-full items-center justify-center lg:hidden">
          <HeaderDrawerButton />
        </div>
        <div className="header--grid__logo relative">
          <div className="relative flex size-full items-center justify-center">
            <Link href="/" aria-label={title} title={title}>
              <Image
                unoptimized
                src={avatar || '/favicon.svg'}
                width={40}
                height={40}
                alt=""
                className="size-10 rounded-full object-cover"
              />
            </Link>
          </div>
        </div>
        <div className="hidden min-w-0 grow lg:flex" data-header-center>
          <div className="relative flex grow items-center justify-center">
            <HeaderContent />
          </div>
        </div>
        <div className="flex size-full items-center justify-center">
          <Link
            href="/search"
            aria-label="搜索页面"
            className="flex size-10 items-center justify-center rounded-full bg-base-100 ring-1 ring-zinc-900/5 dark:ring-white/10"
          >
            <i className="i-mingcute-search-line" />
          </Link>
        </div>
      </div>
    </header>
  )
}
