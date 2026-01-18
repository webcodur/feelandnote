'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface MobileSidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null)

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen((prev) => !prev)

  return (
    <MobileSidebarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MobileSidebarContext.Provider>
  )
}

export function useMobileSidebar() {
  const context = useContext(MobileSidebarContext)
  if (!context) {
    throw new Error('useMobileSidebar must be used within MobileSidebarProvider')
  }
  return context
}
