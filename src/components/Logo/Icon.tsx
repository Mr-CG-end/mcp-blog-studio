import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Icon: React.FC<Props> = ({ className }) => {
  return (
    <div
      className={clsx('payload-admin-icon-brand select-none', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        height: '100%',
        color: 'currentColor',
      }}
      title="MCP Blog Studio"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0 }}
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
      <span
        className="payload-admin-icon-title"
        style={{
          fontWeight: 700,
          fontSize: '13.5px',
          letterSpacing: '-0.01em',
          color: 'currentColor',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        MCP Blog Studio
      </span>
    </div>
  )
}

export default Icon
