'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import {
  getAffiliateBooksForCeleb,
  type AffiliateBookSource,
} from '@/actions/home/getAffiliateBooks'
import AffiliateBookList from '@/components/shared/AffiliateBookList'
import { getBookStorePlatform } from '@/constants/affiliatePlatforms'
import { RetryBlock, useNearViewport } from '@/components/ui/pending'
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

// 구분선에 매다는 구간 이름 — heading* 키를 재쓰되 원전은 앞의 「연관 작품」 구간에 흡수돼 여기엔 안 온다.
const GROUP_LABEL_KEY = {
  origin: 'headingOrigin',
  read: 'headingRead',
  profession: 'headingProfession',
  popular: 'refGroupPopular',
} as const

const GROUP_DESC_KEY = {
  origin: 'refGroupOriginDesc',
  read: 'refGroupReadDesc',
  profession: 'refGroupProfessionDesc',
  popular: 'refGroupPopularDesc',
} as const

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
  const { ref, isNear } = useNearViewport('600px 0px')
  const [attempt, setAttempt] = useState(0)
  const [loadGate] = useState(() => createAffiliateBooksLoadGate(
    (celebId) => getAffiliateBooksForCeleb(celebId, locale === 'en' ? 'en' : 'ko', 6),
  ))
  const [loadState, setLoadState] = useState<LoadState>({ key: '', status: 'idle', data: null })
  const requestKey = `${userId}:${attempt}`

  useEffect(() => loadGate.observe({
    enabled: isNear,
    key: requestKey,
    userId,
    onReady: (data) => setLoadState({ key: requestKey, status: 'ready', data }),
    onError: (error) => {
      console.error('Load celeb affiliate books error:', error)
      setLoadState({ key: requestKey, status: 'failed', data: null })
    },
  }), [isNear, loadGate, locale, requestKey, userId])

  const handleRetry = () => {
    setLoadState({ key: '', status: 'idle', data: null })
    setAttempt((value) => value + 1)
  }

  const isCurrentRequest = loadState.key === requestKey
  const data = isCurrentRequest ? loadState.data : null
  const products = mapRelatedFigureBooksToAffiliateBooks(figureBooks ?? [], locale)
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
      label: group.source === 'works'
        ? tPage('sourceWorks')
        : t(GROUP_LABEL_KEY[group.source as Exclude<AffiliateBookSource, 'mixed'>]),
      desc: group.source === 'works'
        ? tPage('refGroupWorksDesc')
        : t(GROUP_DESC_KEY[group.source as Exclude<AffiliateBookSource, 'mixed'>]),
      count: group.count,
    }))
    : undefined

  return (
    <div ref={ref}>
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
      {isCurrentRequest && loadState.status === 'failed' ? (
        <RetryBlock onRetry={handleRetry} />
      ) : null}
    </div>
  )
}
