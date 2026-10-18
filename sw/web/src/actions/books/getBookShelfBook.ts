'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { FIGURE_BOOK_DETAIL_CATALOG_SELECT } from '@/actions/figure-books/figureBookEditions'
import { resolveFigureBookCatalog, type FigureBookCatalogContent } from '@/actions/figure-books/figureBookCatalog'
import { resolveBookShelfBook } from '@/lib/books/bookShelf'
import { CL_SELECT, flattenLocales } from '@/lib/utils/content-locale'
import { selectBookIntroduction } from '@/lib/utils/book-description'
import { toAffiliateLinks } from '@/constants/affiliatePlatforms'
import type { BookShelfBook } from '@/components/shared/BookShelf/types'

/** 책을 선택할 때 개인·신화·팩션이 같은 판본·소개 자료를 읽는다. */
export async function getBookShelfBook(contentId: string, locale: string): Promise<BookShelfBook | null> {
  return cachedDetail(CACHE_TAGS.CONTENTS, contentId, ['book-shelf-detail-v6-embedded-editions', contentId, locale], async () => {
    const db = createStaticClient()
    const result = await db.from('contents').select(`id,type,metadata,release_date,content_locales(${CL_SELECT}),${FIGURE_BOOK_DETAIL_CATALOG_SELECT}`)
        .eq('id', contentId).maybeSingle()
        .overrideTypes<FigureBookCatalogContent & { release_date: string | null }, { merge: false }>()
    throwOnQueryError('getBookShelfBook', result.error)
    const content = result.data
    if (!content) return null
    const editionMap = await resolveFigureBookCatalog(db, [content], locale, false, true)
    const editions = editionMap.get(contentId) ?? []
    const available = resolveBookShelfBook(content, editions, locale, undefined, !editionMap.has(contentId))
    if (!available) return null
    const flat = flattenLocales(content.content_locales, locale, 'BOOK')
    const exactLocale = content.content_locales?.find((row) => row.locale === locale)
    const selected = editions.find(edition => edition.id === available.editionId)
    return {
      id: content.id, title: available.title, creator: available.creator ?? null,
      thumbnailUrl: available.thumbnail ?? null, titleBadge: null,
      editions, preferredEditionId: available.editionId, isbn: available.isbn, publisher: available.publisher,
      releaseDate: selected ? selected.releaseDate : content.release_date,
      affiliateLinks: selected ? [
        ...(selected.platform && selected.purchaseUrl ? [{ platform: selected.platform, url: selected.purchaseUrl }] : []),
        ...(selected.affiliateLinks ?? []),
      ] : toAffiliateLinks(flat.affiliate_url),
      metadata: content.metadata, sources: available.sources,
      ...(selected ? { description: selected.description, bookIntroduction: selected.bookIntroduction,
        introductionAttribution: selected.introductionAttribution } : selectBookIntroduction(locale, null, exactLocale)),
      detailsLoaded: true,
    }
  }, { extraTags: [CACHE_TAGS.FIGURE_BOOKS] })
}
