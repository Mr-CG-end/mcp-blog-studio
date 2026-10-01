'use client'
// Adapted from Innei/Shiro 891bb24cd59aff7c9baaf4d9a3579ca4275da3b7 (AGPL-3.0).
// Adapted transition wrapper: milliseconds delay, reduced-motion support via MotionConfig.
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { softBouncePreset } from './spring'
export function BottomToUpTransitionView({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li'
  transition?: unknown
}) {
  const As = as === 'li' ? motion.li : motion.div
  return (
    <As
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...softBouncePreset, delay: delay / 1000 }}
      className={className}
    >
      {children}
    </As>
  )
}
