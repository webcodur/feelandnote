'use server'

import { getCachedYes24BookDetail } from '@/lib/books/yes24DetailCache'
import { normalizePurchaseIsbn, type Yes24BookDetail } from '@/lib/books/yes24Purchase'
import { yes24ChartEnabled } from '@/lib/library/bestsellerFeed'

/** 서재 베스트셀러 차트의 「책 상세 보기」 — YES24 상품 상세를 ISBN으로 받는다. 차트가 꺼져 있거나 ISBN이 틀리면 null */
export async function getYes24BookDetail(isbn: string): Promise<Yes24BookDetail | null> {
  const normalized = normalizePurchaseIsbn(isbn)
  if (!normalized || !yes24ChartEnabled(process.env)) return null
  return getCachedYes24BookDetail(normalized)
}
