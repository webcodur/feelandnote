import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import type { createStaticClient } from '@/lib/db/static'
import {
  getFigureBookPurchasePlatform,
  mergeFigureBookEditions,
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
): Promise<Map<string, FigureBookEdition[]>> {
  const byContent = new Map<string, FigureBookEdition[]>()
  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform || contentIds.length === 0) return byContent

  const [rows, options] = await Promise.all([
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
  ])

  const rowsByContent = new Map<string, FigureBookEditionRow[]>()
  for (const row of rows) rowsByContent.set(row.content_id, [...(rowsByContent.get(row.content_id) ?? []), row])
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const option of options) optionsByContent.set(option.content_id, [...(optionsByContent.get(option.content_id) ?? []), option])

  for (const contentId of new Set([...rowsByContent.keys(), ...optionsByContent.keys()])) {
    const editions = mergeFigureBookEditions(rowsByContent.get(contentId) ?? [], optionsByContent.get(contentId) ?? [], locale)
    if (editions.length > 0) byContent.set(contentId, editions)
  }
  return byContent
}
