'use server'

import { getContentBrief } from '@/actions/contents/getContentBrief'
import {
  getFigureBooksForCeleb,
  type FigureBookContent,
} from './getFigureBooks'

export async function getFigureBookPresentationsForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FigureBookContent[]> {
  const sources = await getFigureBooksForCeleb(celebId, locale, true)
  const missingDescriptions = sources.filter((source) => (
    source.editions.some((edition) => !edition.description)
  ))
  if (missingDescriptions.length === 0) return sources

  const briefs = await Promise.all(
    missingDescriptions.map(async (source) => [
      source.id,
      await getContentBrief(source.id, locale),
    ] as const),
  )
  const briefById = new Map(briefs)

  return sources.map((source) => {
    const brief = briefById.get(source.id)
    if (!brief) return source

    return {
      ...source,
      editions: source.editions.map((edition) => (
        edition.description
          ? edition
          : { ...edition, description: brief.description ?? null }
      )),
    }
  })
}
