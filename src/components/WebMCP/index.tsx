'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createPageTools } from '@/webmcp/tools'
import { registerPageTools } from '@/webmcp/register'
import type { WebMCPContext } from '@/webmcp/types'

/** No UI or credentials: unsupported browsers keep the original website. */
export function WebMCP() {
  const pathname = usePathname()
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_WEBMCP_ENABLED !== 'true') return
    const context = (document as Document & { modelContext?: WebMCPContext }).modelContext
    if (!context) return
    let controller: AbortController
    const start = () => {
      controller = new AbortController()
      const tools = createPageTools({
        document, getURL: () => new URL(window.location.href),
        navigate: (path) => window.location.assign(path), fetch: window.fetch.bind(window),
      }, controller.signal)
      void registerPageTools(context, tools, controller).catch(() => {
        console.warn('[WebMCP] 当前浏览器无法注册页面工具')
      })
    }
    const stop = () => controller?.abort()
    const resume = (event: PageTransitionEvent) => { if (event.persisted) start() }
    start()
    window.addEventListener('pagehide', stop)
    window.addEventListener('pageshow', resume)
    return () => {
      stop()
      window.removeEventListener('pagehide', stop)
      window.removeEventListener('pageshow', resume)
    }
  }, [pathname])
  return null
}

export function WebMCPProvider({ children }: { children: React.ReactNode }) {
  return <><WebMCP />{children}</>
}
