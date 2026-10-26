'use client'

import { useEffect, useRef, useState } from 'react'
import { HOME_PERSON_ROTATION_STORAGE_PREFIX } from './config'
import type { HomeGraphMode } from './types'

export function useHomePersonRotation(count: number, mode: HomeGraphMode) {
  const ref = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const [index, setIndex] = useState(0)
  const storageKey = `${HOME_PERSON_ROTATION_STORAGE_PREFIX}:${mode}`

  function remember(index: number) {
    try { window.sessionStorage.setItem(storageKey, String(index)) } catch { /* Storage can be unavailable. */ }
  }

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      const shown = entry.isIntersecting && entry.intersectionRatio >= .35
      if (!shown || initialized.current) return
      initialized.current = true
      try {
        const stored = window.sessionStorage.getItem(storageKey)
        const previous = stored === null ? -1 : Number(stored)
        const first = Number.isInteger(previous) && previous >= -1 ? (previous + 1) % count : 0
        setIndex(first)
        window.sessionStorage.setItem(storageKey, String(first))
      } catch { /* The first person remains usable without storage. */ }
    }, { threshold: .35 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [count, storageKey])

  function move(direction: number) {
    initialized.current = true
    const next = (index + direction + count) % count
    setIndex(next)
    remember(next)
  }

  function interact() { initialized.current = true; remember(index) }

  return { ref, index: index % count, move, interact }
}
