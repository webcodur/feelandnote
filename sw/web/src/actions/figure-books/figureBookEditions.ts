import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { selectBookIntroduction } from '@/lib/utils/book-description'
import type { createStaticClient } from '@/lib/db/static'
import { reviewedBookWorkSelectionReason } from '@feelandnote/content-search/book-edition-policy'
import {
  getFigureBookPurchasePlatform,
  attachFigureBookLocaleLinks,
  mergeFigureBookEditions,
  isFigureBookOriginalLocale,
  type FigureBookEdition,
  type FigureBookEditionRow,
  type FigureBookPurchaseOptionRow,
} from './figureBookLocale'

type Db = ReturnType<typeof createStaticClient>

const EDITION_SELECT = 'id,content_id,locale,title,creator,description,sources,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order'
const OPTION_SELECT = 'edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url'
export const FIGURE_BOOK_EDITION_CATALOG_SELECT = EDITION_SELECT.replace(',description', '')
export const FIGURE_BOOK_OPTION_CATALOG_SELECT = OPTION_SELECT.replace(',description', '')
export const FIGURE_BOOK_DETAIL_CATALOG_SELECT = `catalog:figure_book_contents(content_id,editions:figure_book_editions(${EDITION_SELECT}),options:figure_book_purchase_options(${OPTION_SELECT}))`

/** 목록이 이미 받은 작품·언어판을 판본 판정에 재사용한다. 출처는 판정에만 쓰고 목록에 싣지 않는다. */
export interface FigureBookEditionCatalog {
  cards: { content_id: string; locale: string; title: string | null; isbn: string | null; affiliate_url: unknown; sources: unknown }[]
  works: { id: string; metadata: { figureBook?: { series?: unknown; workTitle?: string; originalTitle?: string; [key: string]: unknown } } | null }[]
  editions?: FigureBookEditionRow[]
  options?: FigureBookPurchaseOptionRow[]
  includeIntroductions?: boolean
}

/**
 * 작품별 판본 목록 — 판본 표가 원천이고 구매 상품(한국어 쿠팡·영어 아마존)은 같은 판본에 링크로 붙는다.
 * 상품이 없는 판본도 빠지지 않는다. 한국어 판본은 ISBN으로 YES24에 이어진다.
 */
export async function loadFigureBookEditions(
  db: Db,
  contentIds: string[],
  locale: string,
  includeAll = false,
  catalog?: FigureBookEditionCatalog,
): Promise<Map<string, FigureBookEdition[]>> {
  const byContent = new Map<string, FigureBookEdition[]>()
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform || contentIds.length === 0) return byContent

  const [rows, options, cards, works] = await Promise.all([
    catalog?.editions ? Promise.resolve(catalog.editions.filter(row => row.locale === locale)) : selectInChunks<FigureBookEditionRow>(contentIds, (ids) => db
      .from('figure_book_editions')
      .select(catalog ? FIGURE_BOOK_EDITION_CATALOG_SELECT : EDITION_SELECT)
      .in('content_id', ids)
      .eq('locale', locale)
      .overrideTypes<FigureBookEditionRow[], { merge: false }>()),
    catalog?.options ? Promise.resolve(catalog.options.filter(row => row.locale === locale && row.platform === platform)) : selectInChunks<FigureBookPurchaseOptionRow>(contentIds, (ids) => db
      .from('figure_book_purchase_options')
      .select(catalog ? FIGURE_BOOK_OPTION_CATALOG_SELECT : OPTION_SELECT)
      .in('content_id', ids)
      .eq('locale', locale)
      .eq('platform', platform)
      .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>()),
    catalog ? Promise.resolve(catalog.cards) : selectInChunks<FigureBookEditionCatalog['cards'][number]>(contentIds, (ids) => db
      .from('content_locales')
      .select('content_id,locale,title,isbn,affiliate_url,sources')
      .in('content_id', ids)),
    catalog ? Promise.resolve(catalog.works) : selectInChunks<FigureBookEditionCatalog['works'][number]>(contentIds, (ids) => db
      .from('contents')
      .select('id,metadata')
      .in('id', ids)),
  ])

  const rowsByContent = new Map<string, FigureBookEditionRow[]>()
  for (const row of rows) rowsByContent.set(row.content_id, [...(rowsByContent.get(row.content_id) ?? []), row])
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const option of options) optionsByContent.set(option.content_id, [...(optionsByContent.get(option.content_id) ?? []), option])
  // 작품마다 전체 locale 출처를 다시 검사하면 큰 세력에서 판정 횟수가 제곱으로 늘어난다.
  const cardsByContent = new Map<string, FigureBookEditionCatalog['cards']>()
  for (const card of cards) {
    const list = cardsByContent.get(card.content_id) ?? []
    list.push(card)
    cardsByContent.set(card.content_id, list)
  }
  const worksById = new Map(works.map(work => [work.id, work]))
  // 판본이 없는 작품도 명시적으로 막아 언어 카드 fallback으로 되살아나지 않게 한다.
  for (const work of works) {
    if (reviewedBookWorkSelectionReason({ contentId: work.id, metadata: work.metadata })) byContent.set(work.id, [])
  }

  for (const contentId of new Set([...rowsByContent.keys(), ...optionsByContent.keys()])) {
    if (byContent.has(contentId)) continue
    const figureBook = worksById.get(contentId)?.metadata?.figureBook
    const isOriginalLocaleWork = isFigureBookOriginalLocale(figureBook, locale)
    const localeCards = cardsByContent.get(contentId) ?? []
    const editions = mergeFigureBookEditions(rowsByContent.get(contentId) ?? [], optionsByContent.get(contentId) ?? [], locale, includeAll, isOriginalLocaleWork,
      figureBook?.series,
      [figureBook?.workTitle, figureBook?.originalTitle].filter((value): value is string => typeof value === 'string'),
      localeCards)
    // 빈 배열도 남긴다. 시작권 없는 시리즈를 locale의 중간 권 정보로 되살리지 않는다.
    byContent.set(contentId, editions.map((edition) => ({
      ...attachFigureBookLocaleLinks(edition, localeCards.find(card => card.locale === locale)),
      ...(!catalog || catalog.includeIntroductions ? selectBookIntroduction(locale, rowsByContent.get(contentId)?.find((row) => row.id === edition.id)
        ?? { locale, isbn: edition.isbn, description: edition.description }, null) : {}),
    })))
  }
  return byContent
}
