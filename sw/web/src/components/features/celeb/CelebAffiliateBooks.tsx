'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import {
  getAffiliateBooksForCeleb,
  type AffiliateBookSource,
} from '@/actions/home/getAffiliateBooks'
import CelebSectionSkeleton from './CelebSectionSkeleton'
import AffiliateBookList from '@/components/shared/AffiliateBookList'
import { getBookStorePlatform } from '@/constants/affiliatePlatforms'
import { RetryBlock } from '@/components/ui/pending'
import {
  createAffiliateBooksLoadGate,
  type AffiliateBooksResult,
} from './CelebAffiliateBooksLoadGate'
import { mapRelatedFigureBooksToAffiliateBooks } from './CelebRelatedAffiliateBooks'

interface CelebAffiliateBooksProps {
  userId: string
  actualOnly?: boolean
  hideHeading?: boolean
  /** 「연관 작품」 구획에 뜨는 도서. 상품이 걸린 것을 참고도서 앞에 둔다. */
  figureBooks?: FigureBookContent[]
  /** 상단 「창작」 탭이 이미 다루는 작품. 아래 상품 구획에서 뺀다. */
  excludeContentIds?: readonly string[]
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
  // 소스가 둘 이상 섞였으면 어느 한 소스의 제목을 달 수 없어 중립 제목을 쓴다.
  mixed: 'title',
}

// 구분선 설명의 구간 이름 — 인물과 직접 엮인 묶음(연관 작품·원전·읽은 책)은
// 「해당 인물 관련 작품」으로 묶어 부르고, 직군·인기 묶음만 따로 이름을 둔다
const groupLabel = (source: 'works' | 'origin' | 'read' | 'profession' | 'popular',
  tPage: ReturnType<typeof useTranslations>, t: ReturnType<typeof useTranslations>) =>
  source === 'profession'
    ? tPage('refGroupProfessionWorks')
    : source === 'popular'
      ? t('refGroupPopular')
      : tPage('refGroupFigureWorks')

/**
 * 인물 화면 아래에 붙는 제휴 도서 구획.
 * 연관 도서의 판매 상품을 먼저 놓고 기존 추천 상품을 이어 붙인다.
 * 연관 도서가 섞이면 감상 기록으로 오해하지 않도록 중립 제목을 쓴다.
 */
export default function CelebAffiliateBooks({
  userId,
  actualOnly = false,
  hideHeading = false,
  figureBooks,
  excludeContentIds,
}: CelebAffiliateBooksProps) {
  const locale = useLocale()
  const t = useTranslations('popularBooks')
  const tPage = useTranslations('celebPage')
  const platform = getBookStorePlatform(locale)
  const [requested, setRequested] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [loadGate] = useState(() => createAffiliateBooksLoadGate(
    (celebId) => getAffiliateBooksForCeleb(celebId, locale === 'en' ? 'en' : 'ko', 6),
  ))
  const [loadState, setLoadState] = useState<LoadState>({ key: '', status: 'idle', data: null })
  const requestKey = `${userId}:${attempt}`

  useEffect(() => loadGate.observe({
    enabled: requested,
    key: requestKey,
    userId,
    onReady: (data) => setLoadState({ key: requestKey, status: 'ready', data }),
    onError: (error) => {
      console.error('Load celeb affiliate books error:', error)
      setLoadState({ key: requestKey, status: 'failed', data: null })
    },
  }), [requested, loadGate, locale, requestKey, userId])

  const handleRetry = () => {
    setLoadState({ key: '', status: 'idle', data: null })
    setAttempt((value) => value + 1)
  }

  const isCurrentRequest = loadState.key === requestKey
  const data = isCurrentRequest ? loadState.data : null
  const products = mapRelatedFigureBooksToAffiliateBooks(figureBooks ?? [], locale)
  const initialProductCount = products.length
  const hasFigureBookProducts = products.length > 0
  // groups는 책 배열과 같은 순서의 구간 정보다 — 책의 종류가 갈리는 자리마다 세로 구분선이 선다.
  const groups: { source: Exclude<AffiliateBookSource, 'mixed'> | 'works'; count: number }[] = []
  if (products.length > 0) groups.push({ source: 'works', count: products.length })
  const productIds = new Set([...products.map((book) => book.contentId), ...(excludeContentIds ?? [])])
  if (data && (!actualOnly || data.source === 'read')) {
    let offset = 0
    for (const group of data.groups ?? []) {
      const kept = data.books.slice(offset, offset + group.count)
      offset += group.count
      let keptCount = 0
      for (const book of kept) {
        if (productIds.has(book.contentId)) continue
        productIds.add(book.contentId)
        products.push(book)
        keptCount += 1
      }
      if (keptCount > 0) groups.push({ source: group.source, count: keptCount })
    }
  }
  // 연관 작품 상품과 원전 추천은 같은 종류라 이어 붙인다 — 중복 제거 뒤 경계가 두 번 서지 않게.
  const mergedGroups = groups.reduce<typeof groups>((acc, group) => {
    const prev = acc[acc.length - 1]
    const same = prev?.source === group.source || (prev?.source === 'works' && group.source === 'origin')
    if (prev && same) prev.count += group.count
    else acc.push({ ...group })
    return acc
  }, [])
  const shelfGroups = mergedGroups.length > 1
    ? mergedGroups.map((group) => ({
      label: groupLabel(group.source, tPage, t),
      count: group.count,
    }))
    : undefined

  return (
    <div>
      {products.length > 0 ? (
        <AffiliateBookList
          books={products}
          heading={hasFigureBookProducts || !data ? tPage('relatedProducts') : t(HEADING_KEY[data.source])}
          buyLabel={platform === 'amazon' ? tPage('sourceWorkBuyAmazon') : t('buy')}
          hideHeading={hideHeading}
          platform={platform}
          groups={shelfGroups}
          dividerTitle={tPage('refGroupDividerTitle')}
        />
      ) : null}
      {!requested ? (
        <button type="button" onClick={() => setRequested(true)}
          className="my-4 w-full rounded border border-white/15 px-4 py-4 text-sm text-text-secondary hover:border-accent/50 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {tPage('moreRecommendations')}
        </button>
      ) : !isCurrentRequest || loadState.status === 'idle' ? <CelebSectionSkeleton kind="books" english={platform === 'amazon'} /> : null}
      {requested && isCurrentRequest && loadState.status === 'ready' && products.length === initialProductCount && (
        <p className="py-4 text-center text-sm text-text-secondary">{tPage('noFurtherRecommendations')}</p>
      )}
      {isCurrentRequest && loadState.status === 'failed' ? (
        <RetryBlock onRetry={handleRetry} />
      ) : null}
    </div>
  )
}
