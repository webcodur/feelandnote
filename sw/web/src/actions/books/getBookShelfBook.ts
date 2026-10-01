'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { loadFigureBookEditions } from '@/actions/figure-books/figureBookEditions'
import { resolveBookShelfBook } from '@/lib/books/bookShelf'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { selectBookIntroduction } from '@/lib/utils/book-description'
import { toAffiliateLinks } from '@/constants/affiliatePlatforms'
import type { BookShelfBook } from '@/components/shared/BookShelf/types'

/** 책을 선택할 때 개인·신화·팩션이 같은 판본·소개 자료를 읽는다. */
export async function getBookShelfBook(contentId: string, locale: string): Promise<BookShelfBook | null> {
  return cachedDetail(CACHE_TAGS.CONTENTS, contentId, ['book-shelf-detail-v1', contentId, locale], async () => {
    const db = createStaticClient()
    const [result, editionMap] = await Promise.all([
      db.from('contents').select(`id,type,release_date,content_locales(${CL_SELECT})`)
        .eq('id', contentId).maybeSingle()
        .overrideTypes<{ id: string; type: string; release_date: string | null; content_locales: ContentLocaleRow[] | null }, { merge: false }>(),
      loadFigureBookEditions(db, [contentId], locale),
    ])
    throwOnQueryError('getBookShelfBook', result.error)
    const content = result.data
    if (!content) return null
    const editions = editionMap.get(contentId) ?? []
    const available = resolveBookShelfBook(content, editions, locale)
    if (!available) return null
    const flat = flattenLocales(content.content_locales, locale, 'BOOK')
    const exactLocale = content.content_locales?.find((row) => row.locale === locale)
    return {
      id: content.id, title: available.title, creator: available.creator ?? null,
      thumbnailUrl: available.thumbnail ?? null, titleBadge: null,
      editions, preferredEditionId: available.editionId, isbn: available.isbn, publisher: exactLocale?.publisher,
      releaseDate: content.release_date, affiliateLinks: toAffiliateLinks(flat.affiliate_url),
      ...selectBookIntroduction(locale, null, exactLocale),
      detailsLoaded: true,
    }
  }, { extraTags: [CACHE_TAGS.FIGURE_BOOKS] })
}
