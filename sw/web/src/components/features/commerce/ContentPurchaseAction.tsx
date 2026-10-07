'use client'

import BookPurchaseSummary from './BookPurchaseSummary'
import ContentAccessPanel from './ContentAccessPanel'
import { validate as isUuid } from 'uuid'
import { toAffiliateLinks } from '@/constants/affiliatePlatforms'
import type { ContentPurchaseDetails } from './ContentPurchaseDialog'
import { useContentCardDisplay } from '@/components/ui/cards/ContentCard/ContentCardDisplayContext'
import { useLocale } from 'next-intl'

// 카드·책장·작품 상세·차트의 공통 구매 진입점. 외부 매체는 확인된 원본 링크가 있을 때만 연다.
export default function ContentPurchaseAction({ type, placement, enabled = true, className, ...content }: ContentPurchaseDetails & {
  enabled?: boolean; className?: string;
}) {
  const display = useContentCardDisplay()
  const locale = useLocale()
  const followsCard = type === 'BOOK' && display?.contentId === content.contentId && !!display?.bookLocale && content.editionId === undefined
  if (!enabled || (followsCard && !display.available)) return null
  const target = followsCard ? { ...content, title: display.title, creator: display.creator, thumbnail: display.thumbnail,
    bookLocale: display.bookLocale, isbn: display.bookLocale === (content.bookLocale ?? locale) ? content.isbn : undefined } : content
  return type === 'BOOK'
    ? <BookPurchaseSummary {...target} links={target.links ?? toAffiliateLinks(target.affiliateUrl)} className={className} full />
    : (isUuid(content.contentId) || content.initialAccess) && <div className={`@container/purchase min-w-0 ${className ?? ''}`}>
      <ContentAccessPanel {...content} type={type} placement={placement} compact />
    </div>
}
