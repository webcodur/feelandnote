'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface MobileSidebarContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  // 데스크톱 사이드바 접기 상태
  desktopCollapsed: boolean
  toggleDesktop: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null)

const DESKTOP_COLLAPSED_KEY = 'feelandnote_sidebar_collapsed'

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  // 로컬스토리지에서 데스크톱 사이드바 상태 복원
  useEffect(() => {
    const stored = localStorage.getItem(DESKTOP_COLLAPSED_KEY)
    if (stored === 'true') {
      setDesktopCollapsed(true)
    }
  }, [])

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen((prev) => !prev)

  const toggleDesktop = () => {
    setDesktopCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem(DESKTOP_COLLAPSED_KEY, String(newValue))
      return newValue
    })
  }

  return (
    <MobileSidebarContext.Provider value={{
      isOpen,
      open,
      close,
      toggle,
      desktopCollapsed,
      toggleDesktop,
    }}>
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
