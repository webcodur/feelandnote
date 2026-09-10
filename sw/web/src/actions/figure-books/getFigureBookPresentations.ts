'use server'

import { getBookIntroduction } from '@/actions/contents/fetchBookMetadata'
import { getFigureBooksForCeleb, type FigureBookContent } from './getFigureBooks'

export async function getFigureBookPresentationsForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FigureBookContent[]> {
  const sources = await getFigureBooksForCeleb(celebId, locale, true)
  // 첫 작품의 첫 판본만 서버에서 준비한다. 나머지는 선택할 때 같은 ISBN 캐시를 읽는다.
  const first = sources.find((source) => source.relationType === 'appearance' && source.editions.length)
  const edition = first?.editions[0]
  if (!first || !edition?.bookIntroduction) return sources
  try {
    const { isbn, source, sourceUrl } = edition.bookIntroduction
    const description = await getBookIntroduction(isbn, locale, source, sourceUrl)
    return sources.map((source) => source.id !== first.id ? source : {
      ...source,
      editions: source.editions.map((item) => item.id !== edition.id ? item : { ...item, description }),
    })
  } catch (error) {
    console.error('[getFigureBookPresentationsForCeleb]', edition.isbn, error)
    return sources
  }
}
