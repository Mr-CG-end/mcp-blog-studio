'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button, ConfirmationModal, SaveButton, useConfig, useDocumentInfo, useForm, useModal } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

interface CreatedKey { id: number | string; key: string }
const modalSlug = 'mcp-created-key'

function createdDocument(value: unknown): CreatedKey | null {
  if (!value || typeof value !== 'object' || !('doc' in value)) return null
  const doc = value.doc
  if (!doc || typeof doc !== 'object' || !('id' in doc) || !('key' in doc)) return null
  return (typeof doc.id === 'number' || typeof doc.id === 'string') && typeof doc.key === 'string' &&
    /^mcp_[A-Za-z0-9_-]{48}$/.test(doc.key) ? { id: doc.id, key: doc.key } : null
}

/** Preserve Payload's original form and SaveButton; add only the one-time creation modal. */
export function MCPKeySaveButton() {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const form = useForm()
  const { openModal, closeModal } = useModal()
  const router = useRouter()
  const [created, setCreated] = useState<CreatedKey | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const isCreating = id === undefined || id === null

  const create = useCallback(async () => {
    if (pending.current || created || form.disabled) return
    pending.current = true
    form.setSubmitted(true)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      if (!await form.validateForm() || controller.signal.aborted) return
      form.setProcessing(true)
      setError('')
      // Use the original collection route and serialize all existing Payload form fields.
      const body = await form.createFormData(undefined, {})
      const response = await fetch(`${config.routes.api}/mcp-keys`, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', body, signal: controller.signal,
      })
      const result: unknown = await response.json()
      if (controller.signal.aborted) return
      if (!response.ok) { setError('密钥创建失败，请检查表单内容和登录状态。'); return }
      const key = createdDocument(result)
      if (!key) { setError('未收到完整密钥，请检查密钥列表后再操作。'); return }
      form.setModified(false)
      setCreated(key)
      openModal(modalSlug)
    } catch {
      if (!controller.signal.aborted) setError('未收到创建结果，请检查网络和密钥列表后再操作。')
    } finally {
      pending.current = false
      form.setProcessing(false)
    }
  }, [created, form, config.routes.api, openModal])

  useEffect(() => {
    if (!isCreating) return
    const element = form.formRef.current
    const submit = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      void create()
    }
    element?.addEventListener('submit', submit, true)
    return () => element?.removeEventListener('submit', submit, true)
  }, [isCreating, form.formRef, create])

  useEffect(() => {
    const clear = () => {
      controllerRef.current?.abort()
      flushSync(() => { setCreated(null); setCopied(false); setError('') })
      closeModal(modalSlug)
    }
    window.addEventListener('pagehide', clear)
    return () => { window.removeEventListener('pagehide', clear); controllerRef.current?.abort() }
  }, [closeModal])

  const close = useCallback(() => {
    if (!created) return
    const documentID = created.id
    setCreated(null)
    setCopied(false)
    setError('')
    closeModal(modalSlug)
    router.push(`${config.routes.admin}/collections/mcp-keys/${encodeURIComponent(String(documentID))}`)
  }, [created, closeModal, router, config.routes.admin])

  useEffect(() => {
    // Escape closes the native modal directly without invoking its onCancel callback.
    if (!created) return
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      close()
    }
    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [created, close])

  async function copy() {
    if (!created) return
    try { await navigator.clipboard.writeText(created.key); setCopied(true); setError('') }
    catch { setError('复制失败，请选中上方密钥手动复制。') }
  }

  return (
    <>
      <span style={{ display: 'contents' }} onClickCapture={isCreating ? (event) => {
        event.preventDefault(); event.stopPropagation(); void create()
      } : undefined}>
        <SaveButton />
      </span>
      {created && <ConfirmationModal modalSlug={modalSlug} heading="密钥已创建"
        confirmLabel="已保存，关闭" cancelLabel="关闭" onConfirm={close} onCancel={close}
        body={<>
          <p>请立即复制并保存。完整密钥仅此次显示，关闭后无法再次查看。</p>
          <div className="field-type text">
            <label className="field-label" htmlFor="mcp-raw-key">完整 API Key</label>
            <input id="mcp-raw-key" readOnly value={created.key} autoComplete="off" spellCheck={false}
              onFocus={(event) => event.currentTarget.select()} />
          </div>
          <Button type="button" onClick={() => { void copy() }}>复制密钥</Button>
          {copied && <p role="status">已复制</p>}
          {error && <p role="alert">{error}</p>}
        </>} />}
      {!created && error && <p role="alert">{error}</p>}
    </>
  )
}
