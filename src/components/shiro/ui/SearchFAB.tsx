'use client'
// Yohaku captured search geometry with local Payload results.
// Native modal focus management and keyboard navigation.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SearchResults, type SearchResult } from './SearchResults'
export function SearchFAB() {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const composing = useRef(false)
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const router = useRouter()
  function show() {
    dialog.current?.showModal()
    setOpen(true)
    input.current?.focus()
  }
  function close() {
    dialog.current?.close()
    setOpen(false)
    setKeyword('')
    setItems([])
    setStatus('idle')
    requestAnimationFrame(() => trigger.current?.focus())
  }
  useEffect(() => {
    const hotkey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (dialog.current?.open) dialog.current.close()
        else {
          dialog.current?.showModal()
          setOpen(true)
          input.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', hotkey)
    return () => document.removeEventListener('keydown', hotkey)
  }, [])
  useEffect(() => {
    if (!open) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = old
    }
  }, [open])
  useEffect(() => {
    if (!open || !keyword.trim()) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(keyword.trim())}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        if (!controller.signal.aborted) {
          setItems(data.results)
          setSelected(0)
          setStatus('ready')
        }
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }, 360)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [keyword, open])
  return (
    <>
      <button
        ref={trigger}
        data-hide-print
        type="button"
        onClick={show}
        aria-label="快速搜索"
        title="快速搜索 (Cmd/Ctrl+K)"
        className="yohaku-search-fab"
      >
        <i className="i-mingcute-search-line text-xl" />
      </button>
      <dialog
        ref={dialog}
        aria-label="快速搜索"
        className="search-dialog"
        onClose={close}
        onCancel={(e) => {
          if (composing.current) {
            e.preventDefault()
            return
          }
          close()
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        <div
          className="yohaku-search-panel"
          onKeyDown={(e) => {
            if (
              e.nativeEvent.isComposing ||
              composing.current ||
              e.keyCode === 229 ||
              e.target !== input.current
            )
              return
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              if (items.length)
                setSelected(
                  (i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length,
                )
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (items[selected]) {
                router.push(items[selected].url)
                close()
              }
            }
          }}
        >
          <div className="yohaku-search-input-row">
            <input
              ref={input}
              name="q"
              aria-label="关键词"
              autoComplete="off"
              maxLength={200}
              placeholder="搜索..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setItems([])
                setStatus(e.target.value.trim() ? 'loading' : 'idle')
              }}
              onCompositionStart={() => {
                composing.current = true
              }}
              onCompositionEnd={() => {
                composing.current = false
              }}
              className="yohaku-search-input"
            />
            <button
              type="button"
              aria-label="关闭搜索"
              onClick={close}
              className="yohaku-search-close"
            >
              Esc
            </button>
          </div>
          <div className="relative min-h-0 grow overflow-auto" aria-busy={status === 'loading'}>
            {items.length ? (
              <SearchResults
                items={items}
                selected={selected}
                onSelect={setSelected}
                onNavigate={close}
              />
            ) : (
              <div role="status" className="yohaku-search-empty">
                <p>
                  {status === 'loading'
                    ? '搜索中…'
                    : status === 'error'
                      ? '搜索暂时不可用，请稍后重试。'
                      : keyword
                        ? '没有找到相关文章'
                        : '搜索...'}
                </p>
              </div>
            )}
          </div>
          <div className="yohaku-search-help">
            <span className="opacity-60">↑ ↓ 选择 · Enter 打开</span>
            <Link onClick={close} href={`/search?q=${encodeURIComponent(keyword.trim())}`}>
              查看全部结果 →
            </Link>
          </div>
        </div>
      </dialog>
    </>
  )
}
