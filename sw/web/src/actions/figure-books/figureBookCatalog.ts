import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { CL_SELECT_LIST_WITH_AFFILIATE, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type { createStaticClient } from '@/lib/db/static'
import type { ContentType } from '@/types/database'
import { FIGURE_BOOK_EDITION_CATALOG_SELECT, FIGURE_BOOK_OPTION_CATALOG_SELECT, loadFigureBookEditions, type FigureBookEditionCatalog } from './figureBookEditions'
import { getFigureBookPurchasePlatform } from './figureBookLocale'

type Db = ReturnType<typeof createStaticClient>
export interface FigureBookCatalogContent {
  id: string
  type: ContentType
  metadata?: FigureBookEditionCatalog['works'][number]['metadata']
  figureBook?: NonNullable<FigureBookEditionCatalog['works'][number]['metadata']>['figureBook'] | null
  content_locales: ContentLocaleRow[] | null
  catalog: { editions: FigureBookEditionCatalog['editions']; options: FigureBookEditionCatalog['options'] } | null
}

/** Already-read metadata and locale cards are shared by both language edition selections. */
export function resolveFigureBookCatalog(db: Db, contents: FigureBookCatalogContent[], locale: string, includeAll = false, includeIntroductions = false) {
  return loadFigureBookEditions(db, contents.map(content => content.id), locale, includeAll, {
    editions: contents.flatMap(content => content.catalog?.editions ?? []),
    options: contents.flatMap(content => content.catalog?.options ?? []),
    works: contents.map(content => ({ id: content.id, metadata: content.metadata ?? (content.figureBook ? { figureBook: content.figureBook } : null) })),
    cards: contents.flatMap(content => (content.content_locales ?? []).map(card => ({
      content_id: content.id, locale: card.locale, title: card.title, isbn: card.isbn ?? null,
      affiliate_url: card.affiliate_url, sources: card.sources,
    }))),
    includeIntroductions,
  })
}

/** One embedded read per ID batch; lists do not read descriptions or repeat work/locale queries. */
export async function loadFigureBookCatalog(db: Db, ids: string[], locale: string) {
  const contents = await selectInChunks<FigureBookCatalogContent>(ids, chunk => db.from('contents')
    .select(`id,type,figureBook:metadata->figureBook,content_locales(${CL_SELECT_LIST_WITH_AFFILIATE},isbn),catalog:figure_book_contents(editions:figure_book_editions(${FIGURE_BOOK_EDITION_CATALOG_SELECT}),options:figure_book_purchase_options(${FIGURE_BOOK_OPTION_CATALOG_SELECT}))`)
    .in('id', chunk).eq('catalog.editions.locale', locale).eq('catalog.options.locale', locale)
    .eq('catalog.options.platform', getFigureBookPurchasePlatform(locale))
    .overrideTypes<FigureBookCatalogContent[], { merge: false }>())
  const editions = await resolveFigureBookCatalog(db, contents, locale)
  return { contents, editions }
}
