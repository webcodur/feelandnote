'use client'

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { getMediaGeometry } from './mediaGeometry'
import type { MediaKind } from './MediaObject'

type Size = { width: number; height: number }
type Listener = (size: Size) => void
const listeners = new WeakMap<Element, Set<Listener>>()
let observer: ResizeObserver | undefined

function observePanel(element: Element, listener: Listener) {
  observer ??= new ResizeObserver(entries => {
    for (const entry of entries) {
      const size = { width: entry.contentRect.width, height: entry.contentRect.height }
      listeners.get(entry.target)?.forEach(callback => callback(size))
    }
  })
  let callbacks = listeners.get(element)
  if (!callbacks) {
    callbacks = new Set()
    listeners.set(element, callbacks)
    observer.observe(element)
  }
  callbacks.add(listener)
  const subscribers = callbacks
  return () => {
    subscribers.delete(listener)
    if (!subscribers.size) {
      observer?.unobserve(element)
      listeners.delete(element)
    }
  }
}

export default function useMediaGeometry(kind: MediaKind, image: string | undefined, compact: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Size>({ width: 0, height: 0 })
  const [cover, setCover] = useState<{ image: string | undefined; ratio: number } | null>(null)
  const loaded = useRef<{ image: string | undefined; ratio: number } | null>(null)
  useEffect(() => {
    const element = ref.current?.closest('.media-context-cover')
    if (!element) return
    return observePanel(element, size => setPanel(previous =>
      previous.width === size.width && previous.height === size.height ? previous : size))
  }, [])
  const onImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget
    if (!width || !height) return
    const ratio = width / height
    // 필름 조각의 같은 이미지가 여러 번 로드되어도 비율은 한 번만 갱신한다.
    if (loaded.current?.image === image && loaded.current?.ratio === ratio) return
    loaded.current = { image, ratio }
    setCover(loaded.current)
  }, [image])
  const ratio = cover?.image === image ? cover?.ratio : undefined
  return { ref, onImageLoad, ...getMediaGeometry(kind, ratio, panel, compact) }
}
