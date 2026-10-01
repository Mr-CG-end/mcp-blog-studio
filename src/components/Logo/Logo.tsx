import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo: React.FC<Props> = ({ className }) => {
  return (
    <div
      className={clsx('flex items-center gap-2.5 select-none no-underline py-1', className)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="7" fill="currentColor" fillOpacity="0.08" />
        <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="currentColor" strokeOpacity="0.18" />
        <path
          d="M8 22V10L13 16L18 10V22M21 16H25M23 14V18"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'currentColor' }}>
          MCP Blog Studio
        </span>
        <span style={{ fontSize: '0.65rem', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Management Console
        </span>
      </div>
    </div>
  )
}

export default Logo
