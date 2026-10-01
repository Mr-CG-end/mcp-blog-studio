'use client'

import * as React from 'react'
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { Drawer } from 'vaul'
import { SheetContext } from './context'

export interface PresentSheetProps {
  content: ReactNode | React.FC
  open?: boolean
  onOpenChange?: (value: boolean) => void
  title?: ReactNode
  zIndex?: number
  dismissible?: boolean
  defaultOpen?: boolean
  triggerAsChild?: boolean
}

export type SheetRef = {
  dismiss: () => void
}

export const PresentSheet = ({
  ref,
  ...props
}: PropsWithChildren<PresentSheetProps> & {
  ref?: React.RefObject<SheetRef | null>
}) => {
  const {
    content,
    children,
    zIndex = 1000,
    title,
    dismissible = true,
    defaultOpen = false,
    triggerAsChild = true,
    open: controlledOpen,
    onOpenChange,
  } = props

  const isControlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = useCallback(
    (openState: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(openState)
      }
      onOpenChange?.(openState)
    },
    [isControlled, onOpenChange],
  )

  useImperativeHandle(ref, () => ({
    dismiss: () => {
      handleOpenChange(false)
    },
  }))

  const overlayZIndex = zIndex - 1
  const contentZIndex = zIndex

  const contextValue = useMemo(
    () => ({
      dismiss() {
        handleOpenChange(false)
      },
    }),
    [handleOpenChange],
  )

  return (
    <Drawer.Root dismissible={dismissible} open={isOpen} onOpenChange={handleOpenChange}>
      {!!children && <Drawer.Trigger asChild={triggerAsChild}>{children}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300"
          style={{
            zIndex: overlayZIndex,
          }}
        />
        <Drawer.Content
          style={{
            zIndex: contentZIndex,
          }}
          className="fixed inset-x-0 bottom-0 flex max-h-[calc(100svh-4rem)] flex-col rounded-t-[16px] bg-base-100 p-6 shadow-2xl border-t border-zinc-200/50 dark:border-zinc-800/80 dark:bg-zinc-900"
        >
          {dismissible && (
            <div className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300 dark:bg-neutral-700" />
          )}

          {title && (
            <Drawer.Title className="-mt-2 mb-4 flex justify-center text-lg font-medium text-base-content">
              {title}
            </Drawer.Title>
          )}

          <SheetContext.Provider value={contextValue}>
            {typeof content === 'function' ? React.createElement(content) : content}
          </SheetContext.Provider>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
