'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import { ImagePreview, type PreviewImage } from './ImagePreview'

type Heading = { id: string; text: string; depth: number }

function TocTree({
  headings,
  active,
  onNavigate,
}: {
  headings: Heading[]
  active: string
  onNavigate?: (id: string) => void
}) {
  const rootDepth = Math.min(...headings.map((heading) => heading.depth), 6)
  const activeIndex = headings.findIndex((heading) => heading.id === active)
  let activeRoot = activeIndex
  while (activeRoot > 0 && headings[activeRoot]?.depth > rootDepth) activeRoot--
  return (
    <ul className="yohaku-toc-tree">
      {headings.map((heading, index) => {
        const section = headings
          .slice(0, index + 1)
          .reduce((root, item, i) => (item.depth === rootDepth ? i : root), -1)
        const collapsed = heading.depth > rootDepth && section !== activeRoot
        return (
          <li
            key={heading.id}
            data-anchor-id={heading.id}
            data-collapsed={collapsed || undefined}
            inert={collapsed}
            style={{ '--toc-ripple-delay': `${Math.min(index * 50, 450)}ms` } as CSSProperties}
          >
            <a
              aria-current={heading.id === active ? 'location' : undefined}
              data-depth={heading.depth}
              href={`#${encodeURIComponent(heading.id)}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(heading.id)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' })
                  window.history.pushState(null, '', `#${encodeURIComponent(heading.id)}`)
                }
                onNavigate?.(heading.id)
              }}
              style={{ paddingLeft: `${(heading.depth - rootDepth) * 0.6 + 1}rem` }}
              title={heading.text}
            >
              {heading.text}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function TocSheet({
  open,
  headings,
  active,
  onOpenChange,
  triggerRef,
}: {
  open: boolean
  headings: Heading[]
  active: string
  onOpenChange: (open: boolean) => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const overflow = useRef<string | null>(null)
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (!open) {
      if (!element.open) return
      const timer = window.setTimeout(
        () => {
          element.close()
          if (overflow.current !== null) document.body.style.overflow = overflow.current
          else document.body.style.overflow = ''
          overflow.current = null
          triggerRef?.current?.focus()
        },
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
      )
      return () => window.clearTimeout(timer)
    }
    if (!element.open) element.showModal()
    if (overflow.current === null) overflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }, [open, triggerRef])
  useEffect(
    () => () => {
      if (overflow.current !== null) document.body.style.overflow = overflow.current
      else document.body.style.overflow = ''
    },
    [],
  )
  return (
    <dialog
      ref={dialog}
      aria-labelledby="yohaku-toc-title"
      className="yohaku-toc-dialog"
      data-closing={!open || undefined}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
      onClose={() => onOpenChange(false)}
    >
      <div className="yohaku-toc-sheet">
        <div className="yohaku-toc-sheet-card">
          <header>
            <h2 id="yohaku-toc-title">文章目录</h2>
            <button aria-label="关闭目录" onClick={() => onOpenChange(false)} type="button">
              <X aria-hidden size={18} />
            </button>
          </header>
          <nav aria-label="移动文章目录" className="yohaku-toc-sheet-scroll">
            <TocTree
              active={active}
              headings={headings}
              onNavigate={(id) => {
                onOpenChange(false)
                window.setTimeout(() => {
                  try {
                    const el = document.getElementById(id)
                    el?.scrollIntoView({ behavior: 'smooth' })
                  } catch {}
                }, 190)
              }}
            />
          </nav>
        </div>
      </div>
    </dialog>
  )
}

function ListIcon() {
  return (
    <svg aria-hidden fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export function ArticleReader() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')
  const [progress, setProgress] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  const [image, setImage] = useState<PreviewImage | null>(null)
  const tocFabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeMobileToc = () => {
      if (desktop.matches) setTocOpen(false)
    }
    desktop.addEventListener('change', closeMobileToc)
    return () => desktop.removeEventListener('change', closeMobileToc)
  }, [])

  useEffect(() => {
    const body = document.querySelector('[data-article-content]')
    if (!body) return
    const nodes = Array.from(body.querySelectorAll<HTMLHeadingElement>('h1,h2,h3,h4,h5,h6'))
    const used = new Set<string>()
    nodes.forEach((node) => {
      const base =
        node.id ||
        `heading-${
          (node.textContent || 'section')
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '-')
            .replace(/^-|-$/g, '') || 'section'
        }`
      let id = base
      let count = 2
      while (used.has(id)) id = `${base}-${count++}`
      used.add(id)
      node.id = id
    })
    const items = nodes.map((node) => ({
      id: node.id,
      text: node.textContent || '',
      depth: Number(node.tagName.slice(1)),
    }))
    const frame = requestAnimationFrame(() => {
      setHeadings(items)
      setActive(items[0]?.id || '')
    })

    const updateScrollState = () => {
      const rect = body.getBoundingClientRect()
      setProgress(
        Math.max(
          0,
          Math.min(1, (110 - rect.top) / Math.max(1, rect.height - window.innerHeight + 110)),
        ),
      )
      let current = nodes[0]?.id || ''
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= 150) current = node.id
        else break
      }
      setActive(current)
    }

    const images = Array.from(body.querySelectorAll('img'))
    const openImage = (event: Event) => {
      const target = event.currentTarget as HTMLImageElement
      setImage({
        src: target.currentSrc || target.src,
        alt: target.alt,
        origin: target.getBoundingClientRect().toJSON(),
        trigger: target,
      })
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      openImage(event)
    }
    const originals = images.map((img) => ({
      tabindex: img.getAttribute('tabindex'),
      role: img.getAttribute('role'),
    }))
    images.forEach((img) => {
      img.tabIndex = 0
      img.setAttribute('role', 'button')
      img.addEventListener('click', openImage)
      img.addEventListener('keydown', keys)
    })
    window.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    const scrollFrame = requestAnimationFrame(() => {
      updateScrollState()
      if (!window.location.hash) return
      try {
        document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
      } catch {
        /* malformed fragment */
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(scrollFrame)
      window.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
      images.forEach((img, index) => {
        img.removeEventListener('click', openImage)
        img.removeEventListener('keydown', keys)
        const original = originals[index]
        if (original.tabindex === null) img.removeAttribute('tabindex')
        else img.setAttribute('tabindex', original.tabindex)
        if (original.role === null) img.removeAttribute('role')
        else img.setAttribute('role', original.role)
      })
    }
  }, [])

  return (
    <>
      <div className="yohaku-read-indicator" data-hide-print data-reading-indicator>
        <span style={{ height: `${progress * 100}%` }} />
      </div>
      {!!headings.length && (
        <>
          <aside className="yohaku-toc-desktop" data-hide-print>
            <nav aria-label="文章目录">
              <TocTree active={active} headings={headings} />
              <svg
                aria-hidden
                className="yohaku-toc-wave"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 28 10"
              >
                <path
                  d="M2 7.5 C5 4, 8 3, 11 6 C13 8, 16 9, 19 5.5 C21 3, 23 4, 26 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="yohaku-toc-progress">
                <span>{Math.round(progress * 100)}%</span>
                <button
                  data-visible={progress > 0.1 || undefined}
                  onClick={() =>
                    window.scrollTo({
                      top: 0,
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'instant'
                        : 'smooth',
                    })
                  }
                  type="button"
                >
                  返回顶部
                </button>
              </div>
            </nav>
          </aside>
          <div className="yohaku-toc-fab" data-hide-print>
            <button
              ref={tocFabRef}
              aria-label="打开目录"
              onClick={() => setTocOpen(true)}
              type="button"
            >
              <ListIcon />
            </button>
          </div>
          <TocSheet
            active={active}
            headings={headings}
            onOpenChange={setTocOpen}
            open={tocOpen}
            triggerRef={tocFabRef}
          />
        </>
      )}
      <ImagePreview image={image} onClose={() => setImage(null)} />
    </>
  )
}
