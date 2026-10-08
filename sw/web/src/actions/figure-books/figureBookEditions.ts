import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { selectBookIntroduction } from '@/lib/utils/book-description'
import type { createStaticClient } from '@/lib/db/static'
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

/**
 * 작품별 판본 목록 — 판본 표가 원천이고 구매 상품(한국어 쿠팡·영어 아마존)은 같은 판본에 링크로 붙는다.
 * 상품이 없는 판본도 빠지지 않는다. 한국어 판본은 ISBN으로 YES24에 이어진다.
 */
export async function loadFigureBookEditions(
  db: Db,
  contentIds: string[],
  locale: string,
  includeAll = false,
): Promise<Map<string, FigureBookEdition[]>> {
  const byContent = new Map<string, FigureBookEdition[]>()
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform || contentIds.length === 0) return byContent

  const [rows, options, cards, works] = await Promise.all([
    selectInChunks<FigureBookEditionRow>(contentIds, (ids) => db
      .from('figure_book_editions')
      .select(EDITION_SELECT)
      .in('content_id', ids)
      .eq('locale', locale)
      .overrideTypes<FigureBookEditionRow[], { merge: false }>()),
    selectInChunks<FigureBookPurchaseOptionRow>(contentIds, (ids) => db
      .from('figure_book_purchase_options')
      .select(OPTION_SELECT)
      .in('content_id', ids)
      .eq('locale', locale)
      .eq('platform', platform)
      .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>()),
    selectInChunks<{ content_id: string; locale: string; title: string | null; isbn: string | null; affiliate_url: unknown; sources: unknown }>(contentIds, (ids) => db
      .from('content_locales')
      .select('content_id,locale,title,isbn,affiliate_url,sources')
      .in('content_id', ids)),
    selectInChunks<{ id: string; figureBook: { series?: unknown } | null }>(contentIds, (ids) => db
      .from('contents')
      .select('id,figureBook:metadata->figureBook')
      .in('id', ids)),
  ])

  const rowsByContent = new Map<string, FigureBookEditionRow[]>()
  for (const row of rows) rowsByContent.set(row.content_id, [...(rowsByContent.get(row.content_id) ?? []), row])
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const option of options) optionsByContent.set(option.content_id, [...(optionsByContent.get(option.content_id) ?? []), option])

  for (const contentId of new Set([...rowsByContent.keys(), ...optionsByContent.keys()])) {
    const isOriginalLocaleWork = isFigureBookOriginalLocale(works.find(work => work.id === contentId)?.figureBook, locale)
    const editions = mergeFigureBookEditions(rowsByContent.get(contentId) ?? [], optionsByContent.get(contentId) ?? [], locale, includeAll, isOriginalLocaleWork,
      works.find(work => work.id === contentId)?.figureBook?.series)
    // 빈 배열도 남긴다. 시작권 없는 시리즈를 locale의 중간 권 정보로 되살리지 않는다.
    byContent.set(contentId, editions.map((edition) => ({
      ...attachFigureBookLocaleLinks(edition, cards.find(card => card.content_id === contentId && card.locale === locale)),
      ...selectBookIntroduction(locale, rowsByContent.get(contentId)?.find((row) => row.id === edition.id)
        ?? { locale, isbn: edition.isbn, description: edition.description }, null),
    })))
  }
  return byContent
}
