'use client'

import { createContext, useContext } from 'react'

export interface SheetContextValue {
  dismiss: () => void
}

export const SheetContext = createContext<SheetContextValue>({
  dismiss: () => {},
})

export const useSheetContext = () => useContext(SheetContext)
