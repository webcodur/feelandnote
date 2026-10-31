'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { BOOKSHELF_MOTION, BOOKSHELF_MOTION_STYLE } from './bookShelfMotion'

export function useBookShelfTransition(ref: RefObject<HTMLElement | null>, changeKey: string | number) {
  useEffect(() => {
    const element = ref.current
    if (!element?.animate) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animation = reduced.matches ? null : element.animate([{ opacity: 0.45 }, { opacity: 1 }], BOOKSHELF_MOTION)
    const stop = () => { if (reduced.matches) animation?.cancel() }
    reduced.addEventListener('change', stop)
    return () => { animation?.cancel(); reduced.removeEventListener('change', stop) }
  }, [ref, changeKey])
}

/** 내용은 즉시 갱신하고 밝기만 부드럽게 올린다. 내부 상태와 포커스는 재생성하지 않는다. */
export default function BookShelfTransition({ children, changeKey, inline = false, className = '' }: {
  children: ReactNode
  changeKey: string | number
  inline?: boolean
  className?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  useBookShelfTransition(ref, changeKey)
  const Tag = inline ? 'span' : 'div'
  return <Tag ref={(node) => { ref.current = node }} style={BOOKSHELF_MOTION_STYLE}
    className={`${inline ? 'inline-block' : 'min-w-0 [overflow-anchor:none]'} ${className}`} data-bookshelf-transition={changeKey}>
    {children}
  </Tag>
}
