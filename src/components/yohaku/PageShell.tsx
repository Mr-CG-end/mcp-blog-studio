import type { HTMLAttributes } from 'react'
import { cn } from '@/utilities/ui'

export function PageShell({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('yohaku-page', className)}>
      {children}
    </div>
  )
}
