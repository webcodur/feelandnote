'use client'

import CardBookPurchase from './CardBookPurchase'
import ContentAccessPanel from './ContentAccessPanel'
import { validate as isUuid } from 'uuid'

/** 등록된 작품 카드의 표지 아래에 놓는 공통 구매·감상 진입점. 조회는 열 때만 실행한다. */
export default function ContentPurchaseAction({ type, placement, ...content }: {
  contentId: string; type: string; title: string; creator?: string | null;
  thumbnail?: string | null; affiliateUrl?: unknown; placement: string;
}) {
  if (!isUuid(content.contentId)) return null
  return type === 'BOOK'
    ? <CardBookPurchase {...content} />
    : <ContentAccessPanel {...content} type={type} placement={placement} compact />
}
