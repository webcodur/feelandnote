'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
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

interface CelebAffiliateBooksProps {
  userId: string
  actualOnly?: boolean
  embedded?: boolean
  initialData?: AffiliateBooksResult | null
  hideHeading?: boolean
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
 * 그 인물이 읽은 책을 먼저 내고, 없으면 같은 직군 인물들이 읽은 책, 그것도 없으면 많이 읽힌 책 순으로 물러난다.
 * 무엇을 기준으로 골랐는지에 따라 머리글이 달라진다 — 읽지도 않은 책을 "이 인물의 책"처럼 보이면 안 된다.
 */
export default function CelebAffiliateBooks({
  userId,
  actualOnly = false,
  embedded = false,
  initialData,
  hideHeading = false,
}: CelebAffiliateBooksProps) {
  const locale = useLocale()
  const t = useTranslations('popularBooks')
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

  if (locale !== 'ko') return null

  const handleRetry = () => {
    setLoadState({ key: '', status: 'idle', data: null })
    setAttempt((value) => value + 1)
  }

  const isCurrentRequest = loadState.key === requestKey
  const data = isCurrentRequest ? loadState.data : null

  return (
    <div ref={ref}>
      {isCurrentRequest && loadState.status === 'failed' ? (
        <RetryBlock onRetry={handleRetry} />
      ) : data && (!actualOnly || data.source === 'read') ? (
        <AffiliateBookList
          books={data.books}
          heading={t(HEADING_KEY[data.source])}
          buyLabel={t('buyOnCoupang')}
          detailLabel={t('viewBookDetails')}
          compact={embedded}
          hideHeading={hideHeading}
        />
      ) : null}
    </div>
  )
}
