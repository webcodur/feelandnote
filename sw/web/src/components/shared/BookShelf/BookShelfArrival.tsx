'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import styles from './BookShelf.module.css'

/** 실제 내용의 높이를 따라가며 비동기 자료가 들어올 때만 짧게 펼친다. */
export default function BookShelfArrival({ children, ready, className = '', name }: {
  children?: ReactNode; ready: boolean; className?: string; name: 'introduction' | 'metadata' | 'relations'
}) {
  const frame = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const outer = frame.current
    const inner = content.current
    if (!outer || !inner) return
    const measure = () => { outer.style.height = `${inner.getBoundingClientRect().height}px` }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={frame} className={`${styles.arrival} ${className}`} data-bookshelf-arrival={name}
      data-ready={ready} aria-busy={!ready}>
      <div ref={content} className={styles.arrivalContent}>{children}</div>
    </div>
  )
}
