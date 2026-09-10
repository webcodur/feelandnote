'use server'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { isBookIntroductionSource, type BookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { normalizeBookIsbn } from '@/lib/utils/book-description'
import { pickIntroForLocale } from '@/lib/utils/content-locale-text'

// 선택된 출처만 조회한다. 인자 전체가 캐시 키이므로 같은 ISBN의 다른 출처와 섞이지 않는다.
const readIntroduction = cache(unstable_cache(
  async (isbn: string | null, locale: 'ko' | 'en', source: BookIntroductionSource, sourceUrl: string | null) => {
    const result = await fetchBookIntroduction({ isbn, locale, source, sourceUrl })
    return pickIntroForLocale(locale, [result.description])
  },
  ['book-introduction-selected-source-v2'],
  { revalidate: STATIC_REVALIDATE },
))

export async function getBookIntroduction(
  isbn: string | null | undefined,
  locale: string,
  source: BookIntroductionSource,
  sourceUrl?: string | null,
): Promise<string | null> {
  if (!isBookIntroductionSource(source)) return null
  const language = locale === 'en' ? 'en' : 'ko'
  if ((language === 'en') !== (source === 'OPEN')) return null
  return readIntroduction(normalizeBookIsbn(isbn), language, source, sourceUrl ?? null)
}
