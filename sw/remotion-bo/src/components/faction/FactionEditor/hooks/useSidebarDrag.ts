'use client'

import { useState, useCallback } from 'react'

export function useSidebarDrag(initialWidth: number, minWidth: number = 300, maxWidth: number = 1200) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX)
      setSidebarWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth, minWidth, maxWidth])

  return { sidebarWidth, handleDragStart }
}
