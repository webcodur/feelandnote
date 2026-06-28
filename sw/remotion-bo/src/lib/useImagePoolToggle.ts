'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 이미지 풀 표시 토글 공통 훅 — 팩션·북리커맨드 세부 편집 페이지 공용.
 *
 * - 페이지 진입 시 기본 펼침(defaultOpen)
 * - Ctrl+Q(또는 ⌘+Q) 로 펼치기/접기
 * - 펼쳐질 때마다 onOpen 콜백 호출(예: 디스크 이미지 새로고침)
 */
export function useImagePoolToggle({ defaultOpen = true, onOpen }: { defaultOpen?: boolean; onOpen?: () => void } = {}) {
  const [open, setOpen] = useState(defaultOpen)
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      if (next) onOpenRef.current?.()
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return { open, setOpen, toggle }
}
