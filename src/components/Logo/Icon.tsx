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
      className={clsx('flex items-center justify-center select-none', className)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      title="MCP Blog Studio"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
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
    </div>
  )
}

export default Icon
