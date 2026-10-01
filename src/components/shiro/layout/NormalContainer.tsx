// Adapted from Innei/Shiro, commit 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Source: components/layout/container/Normal.tsx; removed header atom coupling.
import type { HTMLAttributes } from 'react'
import { cn } from '@/utilities/ui'
export function NormalContainer({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'mx-auto mt-14 max-w-3xl px-4 lg:mt-[80px] lg:px-0 2xl:max-w-4xl [&_header.prose]:mb-[80px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
