'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { getFigureBookPurchasePlatform } from '@/actions/figure-books/figureBookLocale'
import {
  getAffiliateBooksForCeleb,
  type AffiliateBookSource,
} from '@/actions/home/getAffiliateBooks'
import AffiliateBookList from '@/components/features/home/AffiliateBookList'
import { RetryBlock, useNearViewport } from '@/components/ui/pending'
import {
  createAffiliateBooksLoadGate,
  type AffiliateBooksResult,
} from './CelebAffiliateBooksLoadGate'
import { mapRelatedFigureBooksToAffiliateBooks } from './CelebRelatedAffiliateBooks'

interface CelebAffiliateBooksProps {
  userId: string
  actualOnly?: boolean
  embedded?: boolean
  initialData?: AffiliateBooksResult | null
  hideHeading?: boolean
  relatedBooks?: FigureBookContent[]
}

type LoadStatus = 'idle' | 'ready' | 'failed'

interface LoadState {
  key: string
  status: LoadStatus
  data: AffiliateBooksResult | null
}

const HEADING_KEY: Record<AffiliateBookSource, 'headingOrigin' | 'headingRead' | 'headingProfession' | 'title'> = {
  origin: 'headingOrigin',
  read: 'headingRead',
  profession: 'headingProfession',
  popular: 'title',
}

/**
 * 인물 화면 아래에 붙는 제휴 도서 구획.
 * 연관 도서의 판매 상품을 먼저 놓고 기존 추천 상품을 이어 붙인다.
 * 연관 도서가 섞이면 감상 기록으로 오해하지 않도록 중립 제목을 쓴다.
 */
export default function CelebAffiliateBooks({
  userId,
  actualOnly = false,
  embedded = false,
  initialData,
  hideHeading = false,
  relatedBooks,
}: CelebAffiliateBooksProps) {
  const locale = useLocale()
  const t = useTranslations('popularBooks')
  const tPage = useTranslations('celebPage')
  const platform = getFigureBookPurchasePlatform(locale)
  const { ref, isNear } = useNearViewport('600px 0px')
  const [attempt, setAttempt] = useState(0)
  const [loadGate] = useState(() => createAffiliateBooksLoadGate(
    (celebId) => getAffiliateBooksForCeleb(celebId, 'coupang', 6),
  ))
  const [loadState, setLoadState] = useState<LoadState>(() => initialData === undefined
    ? { key: '', status: 'idle', data: null }
    : { key: `${userId}:0`, status: 'ready', data: initialData })
  const requestKey = `${userId}:${attempt}`

  useEffect(() => loadGate.observe({
    enabled: locale === 'ko' && isNear && initialData === undefined,
    key: requestKey,
    userId,
    onReady: (data) => setLoadState({ key: requestKey, status: 'ready', data }),
    onError: (error) => {
      console.error('Load celeb affiliate books error:', error)
      setLoadState({ key: requestKey, status: 'failed', data: null })
    },
  }), [initialData, isNear, loadGate, locale, requestKey, userId])

  if (!platform) return null

  const handleRetry = () => {
    setLoadState({ key: '', status: 'idle', data: null })
    setAttempt((value) => value + 1)
  }

  const isCurrentRequest = loadState.key === requestKey
  const data = initialData !== undefined ? initialData : isCurrentRequest ? loadState.data : null
  const products = mapRelatedFigureBooksToAffiliateBooks(relatedBooks ?? [], locale)
  const hasRelatedProducts = products.length > 0
  const productIds = new Set(products.map((book) => book.contentId))
  if (locale === 'ko' && data && (!actualOnly || data.source === 'read')) {
    for (const book of data.books) {
      if (productIds.has(book.contentId)) continue
      productIds.add(book.contentId)
      products.push(book)
    }
  }

  return (
    <div ref={ref}>
      {products.length > 0 ? (
        <AffiliateBookList
          books={products}
          heading={hasRelatedProducts || !data ? tPage('relatedProducts') : t(HEADING_KEY[data.source])}
          buyLabel={platform === 'amazon' ? tPage('sourceWorkBuyAmazon') : t('buyOnCoupang')}
          detailLabel={t('viewBookDetails')}
          compact={embedded}
          hideHeading={hideHeading}
          platform={platform}
        />
      ) : null}
      {initialData === undefined && isCurrentRequest && loadState.status === 'failed' ? (
        <RetryBlock onRetry={handleRetry} />
      ) : null}
    </div>
  )
}
