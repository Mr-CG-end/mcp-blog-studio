'use client'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
export function CopyButton({ code }: { code: string }) {
  const [status, setStatus] = useState('复制代码')
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setStatus('已复制')
        } catch {
          setStatus('复制失败，请手动选择')
        }
      }}
    >
      <span aria-live="polite">{status}</span>
      {status === '已复制' ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}
