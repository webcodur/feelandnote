'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  getAffiliateBooksForCeleb,
  type AffiliateBook,
  type AffiliateBookSource,
} from '@/actions/home/getAffiliateBooks'
import { revealShelfItem } from './revealShelfItem'
import CelebSectionSkeleton from './CelebSectionSkeleton'
import AffiliateBookList from '@/components/shared/AffiliateBookList'
import { getBookStorePlatform } from '@/constants/affiliatePlatforms'
import { RetryBlock } from '@/components/ui/pending'

interface CelebAffiliateBooksProps {
  userId: string
  actualOnly?: boolean
  hideHeading?: boolean
  /** 위의 등장·집필·감상 모드가 이미 다루는 작품. 추천 선반에서 뺀다. */
  excludeContentIds?: readonly string[]
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed'

/** 묶음 하나에 채우는 권 수 — 감상 선반의 「더 보기」와 같은 크기 */
const BATCH_SIZE = 6

const HEADING_KEY: Record<AffiliateBookSource, 'headingOrigin' | 'headingRead' | 'headingProfession' | 'title'> = {
  origin: 'headingOrigin',
  read: 'headingRead',
  profession: 'headingProfession',
  popular: 'title',
  // 소스가 둘 이상 섞였으면 어느 한 소스의 제목을 달 수 없어 중립 제목을 쓴다.
  mixed: 'title',
}

// 구분선 설명의 구간 이름 — 인물과 직접 엮인 묶음(원전·읽은 책)은 「해당 인물 관련 작품」으로
// 묶어 부르고, 직군·인기 묶음만 따로 이름을 둔다
const groupLabel = (source: Exclude<AffiliateBookSource, 'mixed'>,
  tPage: ReturnType<typeof useTranslations>, t: ReturnType<typeof useTranslations>) =>
  source === 'profession'
    ? tPage('refGroupProfessionWorks')
    : source === 'popular'
      ? t('refGroupPopular')
      : tPage('refGroupFigureWorks')

type SourceGroup = { source: Exclude<AffiliateBookSource, 'mixed'>; count: number }

/** 이어 받은 묶음의 구간을 기존 구간 뒤에 붙인다 — 같은 종류가 연달아 서면 경계가 두 번 서지 않게 합친다 */
function appendSourceGroups(prev: SourceGroup[], next: readonly SourceGroup[]): SourceGroup[] {
  const merged = [...prev]
  for (const group of next) {
    const last = merged[merged.length - 1]
    if (last && last.source === group.source) last.count += group.count
    else merged.push({ ...group })
  }
  return merged
}

/**
 * 인물 화면 「참고도서」 구획의 「추천」 모드. 등장·집필·감상은 위의 모드들이
 * 직접 보여 주므로 여기는 사용자가 「더 보기」를 눌렀을 때 불러오는 추천 상품만 선반으로 세운다.
 * 「더 보기」를 누를 때마다 이미 선 책을 뺀 다음 묶음을 같은 선반에 이어 붙인다 — 감상 모드와 같은 방식.
 */
export default function CelebAffiliateBooks({
  userId,
  actualOnly = false,
  hideHeading = false,
  excludeContentIds,
}: CelebAffiliateBooksProps) {
  const locale = useLocale()
  const t = useTranslations('popularBooks')
  const tPage = useTranslations('celebPage')
  const platform = getBookStorePlatform(locale)
  const [requested, setRequested] = useState(false)
  const [products, setProducts] = useState<AffiliateBook[]>([])
  const [groupList, setGroupList] = useState<SourceGroup[]>([])
  /** 더 이상 나올 후보가 없는가 — 마지막 묶음이 목표 수를 못 채우면 풀이 다 찬 것이다 */
  const [exhausted, setExhausted] = useState(false)
  const [status, setStatus] = useState<LoadStatus>('idle')
  /** 마지막으로 채운 묶음의 제목 소스 — 선반 제목을 정한다 */
  const [lastSource, setLastSource] = useState<AffiliateBookSource | null>(null)
  /* 이미 선 책은 다음 요청의 제외 목록에 실어야 한다 — state로는 요청 시점에 늦게 갱신될 수 있어
     ref에도 같은 목록을 둔다 */
  const productsRef = useRef<AffiliateBook[]>([])
  const loadingRef = useRef(false)
  // 이어 붙인 첫 카드의 순번 — 붙인 뒤 레일을 그 자리로 옮겨 보여 준다
  const revealRef = useRef<number | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (revealRef.current === null) return
    const index = revealRef.current
    revealRef.current = null
    revealShelfItem(wrapperRef.current, index)
  }, [products])

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setRequested(true)
    setStatus('loading')
    try {
      // 제외 목록은 서버가 묶음을 채우기 전에 걸러진다 — 이미 선 책이 칸을 차지해 빈 선반이 되지 않게
      const data = await getAffiliateBooksForCeleb(
        userId,
        locale === 'en' ? 'en' : 'ko',
        BATCH_SIZE,
        [...(excludeContentIds ?? []), ...productsRef.current.map((book) => book.contentId)],
      )
      const usable = data && (!actualOnly || data.source === 'read') ? data : null
      if (usable && usable.books.length > 0) {
        // 같은 책이 묶음을 건너 다시 나와도 선반에는 한 번만 선다
        const prevCount = productsRef.current.length
        const seen = new Set(productsRef.current.map((book) => book.contentId))
        const fresh = usable.books.filter((book) => !seen.has(book.contentId))
        const next = [...productsRef.current, ...fresh]
        productsRef.current = next
        setProducts(next)
        if (fresh.length > 0) revealRef.current = prevCount
        setGroupList((prev) => appendSourceGroups(prev, usable.groups ?? []))
        setLastSource(usable.source)
      }
      if (!usable || usable.books.length < BATCH_SIZE) setExhausted(true)
      setStatus('ready')
    } catch (error) {
      console.error('Load celeb affiliate books error:', error)
      setStatus('failed')
    } finally {
      loadingRef.current = false
    }
  }, [userId, locale, actualOnly, excludeContentIds])

  // 탭이 열리면(컴포넌트 마운트) 첫 묶음을 바로 불러온다 — 초기 HTML엔 싣지 않아 ISR 수명을 지킨다.
  // requested는 이미 부른 뒤 loadMore 참조가 바뀌어 effect가 다시 돌아도 재호출을 막는다
  useEffect(() => {
    if (!requested) void loadMore()
  }, [requested, loadMore])

  const shelfGroups = groupList.length > 1
    ? groupList.map((group) => ({
      label: groupLabel(group.source, tPage, t),
      count: group.count,
    }))
    : undefined

  return (
    <div ref={wrapperRef}>
      {products.length > 0 ? (
        <AffiliateBookList
          books={products}
          heading={lastSource ? t(HEADING_KEY[lastSource]) : tPage('relatedProducts')}
          buyLabel={platform === 'amazon' ? tPage('sourceWorkBuyAmazon') : t('buy')}
          hideHeading={hideHeading}
          platform={platform}
          groups={shelfGroups}
          dividerTitle={tPage('refGroupDividerTitle')}
          scroll
        />
      ) : null}
      {status === 'loading' ? (
        <CelebSectionSkeleton kind="books" english={platform === 'amazon'} />
      ) : null}
      {/* 첫 요청과 이어 묶는 요청 모두 같은 「더 보기」 단추 — 누를 때마다 다음 묶음을 붙인다 */}
      {status !== 'loading' && status !== 'failed' && (!requested || !exhausted) && (
        <button type="button" onClick={loadMore}
          className="my-4 w-full rounded border border-white/15 px-4 py-4 text-sm text-text-secondary hover:border-accent/50 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {tPage('moreRecommendations')}
        </button>
      )}
      {status === 'ready' && exhausted && products.length === 0 && (
        <p className="py-4 text-center text-sm text-text-secondary">{tPage('noFurtherRecommendations')}</p>
      )}
      {status === 'failed' ? (
        <RetryBlock onRetry={loadMore} />
      ) : null}
    </div>
  )
}
