'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { COVER_PALETTE_VERSION, type CoverPalette } from '@/lib/books/coverPalette'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'

const requests = new Map<string, Promise<CoverPalette | null>>()
function requestPalette(key: string) {
  const existing = requests.get(key)
  if (existing) return existing
  const request = fetch(key).then(async (response) => {
    if (!response.ok) throw new Error('Cover palette unavailable')
    const result = await response.json() as { palette: CoverPalette | null }
    return result.palette
  }).catch(() => { requests.delete(key); return null })
  requests.set(key, request)
  if (requests.size > 200) requests.delete(requests.keys().next().value!)
  return request
}

/** 가로 선택 줄의 표지 색과 선택 상태를 표시한다. */
const BookShelfBookChip = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { book: BookShelfBook }>(
  function BookShelfBookChip({ book, className = '', style, ...props }, forwardedRef) {
    const locale = useLocale()
    const t = useTranslations('content.reviewModal')
    const ref = useRef<HTMLButtonElement>(null)
    useImperativeHandle(forwardedRef, () => ref.current!, [])
    const source = book.editions.find((edition) => edition.id === book.preferredEditionId)?.thumbnailUrl ?? book.thumbnailUrl
    const key = `/api/book-cover-palette/${book.id}?locale=${locale}&v=${COVER_PALETTE_VERSION}${book.preferredEditionId ? `&edition=${book.preferredEditionId}` : ''}`
    const [result, setResult] = useState<{ key: string; palette: CoverPalette | null } | null>(null)
    useEffect(() => {
      const button = ref.current
      if (!button) return
      let alive = true
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        requestPalette(key).then((palette) => { if (alive) setResult({ key, palette }) })
      }, { rootMargin: '80px' })
      observer.observe(button)
      return () => { alive = false; observer.disconnect() }
    }, [key, source])
    const palette = result?.key === key ? result.palette : null
    const colors = palette ? {
      '--book-cover-shadow': palette[0], '--book-cover-mid': palette[1], '--book-cover-light': palette[2],
    } as CSSProperties : undefined
    return <button {...props} ref={ref} className={`${styles.bookChip} ${className}`} style={{ ...style, ...colors }}
      data-cover-palette={palette ? 'poster' : 'neutral'}>{props.children}{book.readingRecord?.review_approved_at && <span className="ms-2 text-[10px] font-medium text-accent">{t('edited')}</span>}</button>
  },
)
export default BookShelfBookChip
