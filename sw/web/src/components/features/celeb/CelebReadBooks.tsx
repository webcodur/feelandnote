/*
  파일명: CelebReadBooks.tsx
  기능: 인물 화면 「참고도서」의 「감상」 모드 — 감상 기록의 책을 파는 카드 선반
  책임: 서버가 그린 첫 묶음 뒤의 기록은 「더 보기」가 다음 쪽을 읽어 같은 선반에 이어 붙인다.
*/
'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getPublicUserContents } from '@/actions/contents/getUserContents'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { mapReadContentsToAffiliateBooks } from './CelebRelatedAffiliateBooks'
import { revealShelfItem } from './revealShelfItem'
import CelebSectionSkeleton from './CelebSectionSkeleton'
import AffiliateBookList from '@/components/shared/AffiliateBookList'
import { getBookStorePlatform } from '@/constants/affiliatePlatforms'
import { RetryBlock } from '@/components/ui/pending'

const PAGE_SIZE = 24
/** 클릭 한 번에 선반에 올리는 권 수 — 추천 모드의 묶음 크기와 같게 맞춘다 */
const BATCH_SIZE = 6
/** 클릭 한 번에 읽는 쪽 수 상한 — 판매 불가 책만 이어져도 무한정 물지 않는다 */
const MAX_PAGES_PER_CLICK = 4

interface CelebReadBooksProps {
  userId: string
  /** 서버가 미리 그린 첫 묶음 — 판매 가능한 책만 골라진 상태 */
  initialBooks: AffiliateBook[]
  /** 서버가 마지막으로 읽은 쪽 다음 — 이어 받아 묻는다 */
  initialNextPage: number
  /** 아직 읽지 않은 감상 기록이 있는가 */
  initialHasMore: boolean
}

/**
 * 「감상」 모드 본체. 선반은 가로 한 줄 레일이고, 기록이 남았으면
 * 「더 보기」가 묶음(6권)씩 이어 붙인다. 한 번 읽은 쪽의 나머지는 버퍼에 두어
 * 다음 클릭이 조회 없이 바로 붙게 한다 — 빌 게이츠처럼 기록이 많은 인물도 선반이 끊기지 않게.
 */
export default function CelebReadBooks({ userId, initialBooks, initialNextPage, initialHasMore }: CelebReadBooksProps) {
  const tPage = useTranslations('celebPage')
  const locale = useLocale() === 'en' ? 'en' as const : 'ko' as const
  const platform = getBookStorePlatform(locale)
  const [books, setBooks] = useState<AffiliateBook[]>(initialBooks)
  const [page, setPage] = useState(initialNextPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  // 가져 왔지만 선반에 아직 안 올린 책 — 한 번 읽은 쪽을 여러 클릭에 나눠 보여 준다
  const pendingRef = useRef<AffiliateBook[]>([])
  // 이어 붙인 첫 카드의 순번 — 붙인 뒤 레일을 그 자리로 옮겨 보여 준다
  const revealRef = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (revealRef.current === null) return
    const index = revealRef.current
    revealRef.current = null
    revealShelfItem(wrapperRef.current, index)
  }, [books])

  const loadMore = async () => {
    setStatus('loading')
    try {
      const seen = new Set([...books, ...pendingRef.current].map((book) => book.contentId))
      let nextPage = page
      let hasMoreNow = true
      let fetched = 0
      // 버퍼가 한 묶음보다 적으면 쪽을 더 읽는다 — 한 쪽이 전부 판매 불가여도 다음 쪽으로 채운다
      while (pendingRef.current.length < BATCH_SIZE && hasMoreNow && fetched < MAX_PAGES_PER_CLICK) {
        const result = await getPublicUserContents(
          { userId, type: 'BOOK', page: nextPage, limit: PAGE_SIZE, sortBy: 'recent' },
          locale,
        )
        // 같은 책이 기록 여러 건에 걸쳐 다시 나와도 선반에는 한 번만 선다
        for (const book of mapReadContentsToAffiliateBooks(result.items, locale)) {
          if (seen.has(book.contentId)) continue
          seen.add(book.contentId)
          pendingRef.current.push(book)
        }
        hasMoreNow = result.hasMore
        nextPage += 1
        fetched += 1
      }
      const take = pendingRef.current.splice(0, BATCH_SIZE)
      setBooks((prev) => [...prev, ...take])
      if (take.length > 0) revealRef.current = books.length
      setPage(nextPage)
      // 버퍼에 남은 책은 아직 보여 줄 것이 있으므로 단추를 지키지 않는다
      setHasMore(hasMoreNow || pendingRef.current.length > 0)
      setStatus('idle')
    } catch (error) {
      console.error('Load celeb read books error:', error)
      setStatus('failed')
    }
  }

  return (
    <div ref={wrapperRef}>
      <AffiliateBookList
        books={books}
        heading={tPage('groupRead')}
        hideHeading
        platform={platform}
        scroll
      />
      {status === 'loading' ? <CelebSectionSkeleton kind="books" english={platform === 'amazon'} /> : null}
      {status === 'failed' ? <RetryBlock onRetry={loadMore} /> : null}
      {hasMore && status === 'idle' ? (
        <button type="button" onClick={loadMore}
          className="my-4 w-full rounded border border-white/15 px-4 py-4 text-sm text-text-secondary hover:border-accent/50 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {tPage('moreReadBooks')}
        </button>
      ) : null}
    </div>
  )
}
