'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { HOME_PERSON_ROTATION_STORAGE_PREFIX } from './config'

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

export function useHomePersonRotation(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<number | null>(null)
  const storedIndex = useSyncExternalStore(subscribe, () => {
    try {
      const previous = Number(window.sessionStorage.getItem(HOME_PERSON_ROTATION_STORAGE_PREFIX) ?? 0)
      return Number.isInteger(previous) && previous >= 0 ? previous % count : 0
    } catch { return 0 }
  }, () => 0)
  const index = selection ?? storedIndex

  function remember(index: number) {
    try { window.sessionStorage.setItem(HOME_PERSON_ROTATION_STORAGE_PREFIX, String(index)) } catch { /* Storage can be unavailable. */ }
  }

  function move(direction: number) {
    const next = (index + direction + count) % count
    setSelection(next)
    remember(next)
  }

  function interact() { remember(index) }

  return { ref, index: index % count, move, interact }
}
