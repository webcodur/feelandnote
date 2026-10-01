'use client'

import { useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { getPublicUserContents } from '@/actions/contents/getUserContents'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { CELEB_READ_BOOKS_PAGE_SIZE } from '@/lib/celeb/authoredBooks'
import { mapReadContentsToAffiliateBooks } from './CelebRelatedAffiliateBooks'

const BATCH_SIZE = 6
const MAX_PAGES_PER_CLICK = 4
interface Props {
  userId: string
  initialBooks: AffiliateBook[]
  initialNextPage: number
  initialHasMore: boolean
}

/** 공통 책장의 감상 목록을 이어 받는다. 조회한 쪽의 나머지는 다음 클릭까지 보관한다. */
export function useCelebReadShelf({ userId, initialBooks, initialNextPage, initialHasMore }: Props) {
  const locale = useLocale() === 'en' ? 'en' : 'ko'
  const [books, setBooks] = useState(initialBooks)
  const [page, setPage] = useState(initialNextPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  const pendingRef = useRef<AffiliateBook[]>([])
  const sourceHasMoreRef = useRef(initialHasMore)
  const loadMore = async () => {
    if (status === 'loading') return
    setStatus('loading')
    try {
      const seen = new Set([...books, ...pendingRef.current].map(book => book.contentId))
      let nextPage = page
      let hasMoreNow = sourceHasMoreRef.current
      let fetched = 0
      while (pendingRef.current.length < BATCH_SIZE && hasMoreNow && fetched < MAX_PAGES_PER_CLICK) {
        const result = await getPublicUserContents({ userId, type: 'BOOK', page: nextPage,
          limit: CELEB_READ_BOOKS_PAGE_SIZE, sortBy: 'recent' }, locale)
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
      setBooks(previous => [...previous, ...take])
      sourceHasMoreRef.current = hasMoreNow
      setPage(nextPage)
      setHasMore(hasMoreNow || pendingRef.current.length > 0)
      setStatus('idle')
    } catch (error) {
      console.error('[useCelebReadShelf]', error)
      setStatus('failed')
    }
  }
  return { books, hasMore, status, loadMore }
}
