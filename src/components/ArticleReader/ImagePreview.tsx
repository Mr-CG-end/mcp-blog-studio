'use client'
/* eslint-disable @next/next/no-img-element -- preview preserves the original image dimensions */

import { useCallback, useEffect, useRef, useState } from 'react'

export type PreviewImage = {
  src: string
  alt: string
  origin: { x: number; y: number; width: number; height: number }
  trigger: HTMLImageElement
}

export function ImagePreview({
  image,
  onClose,
}: {
  image: PreviewImage | null
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const picture = useRef<HTMLImageElement>(null)
  const [closing, setClosing] = useState(false)
  const animation = useRef<Animation | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transform = useRef('none')
  const runEntrance = useCallback(() => {
    if (!picture.current || !image) return
    const box = picture.current.getBoundingClientRect()
    const origin = image.origin
    if (box.width === 0 || box.height === 0) return
    transform.current = `translate(${origin.x + origin.width / 2 - box.x - box.width / 2}px, ${origin.y + origin.height / 2 - box.y - box.height / 2}px) scale(${origin.width / box.width}, ${origin.height / box.height})`
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      animation.current = picture.current.animate(
        [{ transform: transform.current }, { transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.32,.72,0,1)' },
      )
  }, [image])

  useEffect(() => {
    if (!image) return
    const element = dialog.current
    element?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (picture.current?.complete) {
      runEntrance()
    }

    return () => {
      if (timer.current) clearTimeout(timer.current)
      animation.current?.cancel()
      element?.close()
      document.body.style.overflow = overflow
      image.trigger.focus({ preventScroll: true })
    }
  }, [image, runEntrance])
  function close() {
    if (closing) return
    setClosing(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    animation.current?.cancel()
    if (!reduced)
      animation.current =
        picture.current?.animate([{ transform: 'none' }, { transform: transform.current }], {
          duration: 380,
          easing: 'cubic-bezier(.32,.72,0,1)',
          fill: 'forwards',
        }) || null
    timer.current = setTimeout(
      () => {
        onClose()
        setClosing(false)
      },
      reduced ? 0 : 380,
    )
  }
  return (
    <dialog
      ref={dialog}
      aria-label="图片预览"
      className="yohaku-image-preview"
      data-closing={closing || undefined}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <button type="button" aria-label="关闭图片预览" onClick={close}>
        ×
      </button>
      {image && (
        <img
          ref={picture}
          src={image.src}
          alt={image.alt}
          onClick={close}
          onLoad={runEntrance}
        />
      )}
    </dialog>
  )
}
