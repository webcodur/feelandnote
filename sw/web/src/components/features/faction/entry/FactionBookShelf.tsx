'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { getFactionFigureBooks, type FactionFigureBook } from '@/actions/home/getFactionFigureBooks'
import { isThemeBook } from '@/lib/figure-books/themeBooks'
import { RetryBlock } from '@/components/ui/pending'
import AtlasBookShelfSkeleton from '@/components/features/user/explore/myth/AtlasBookShelfSkeleton'
import ThemeBookShelf from './ThemeBookShelf'

/** 세력 소개·명단은 책장을 기다리지 않는다. 책장이 가까워지면 가벼운 전체 목록만 받는다. */
export default function FactionBookShelf({ factionId, memberIds, name, onCount }: {
  factionId: string; memberIds: string[]; name: string; onCount: (count: number) => void;
}) {
  const locale = useLocale()
  const root = useRef<HTMLDivElement>(null)
  const [nearby, setNearby] = useState(false)
  const [books, setBooks] = useState<FactionFigureBook[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNearby(true); observer.disconnect() }
    }, { rootMargin: '400px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!nearby) return
    let alive = true
    void getFactionFigureBooks(factionId, locale).then(result => {
      if (alive) { setBooks(result); onCount(result.length) }
    }).catch(error => {
      console.error('[FactionBookShelf]', error)
      if (alive) setFailed(true)
    })
    return () => { alive = false }
  }, [nearby, factionId, locale, attempt, onCount])

  const ids = new Set(memberIds)
  const shown = books?.filter(book => book.memberIds.some(id => ids.has(id)) || isThemeBook(book, name, false))
  return <div ref={root} data-faction-bookshelf>
    {failed ? <RetryBlock onRetry={() => { setFailed(false); setAttempt(value => value + 1) }} />
      : shown ? <ThemeBookShelf key={`${locale}:${memberIds.join(',')}`} books={shown} memberIds={memberIds} name={name} isMyth={false} />
      : <AtlasBookShelfSkeleton />}
  </div>
}
