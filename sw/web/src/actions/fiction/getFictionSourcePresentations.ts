'use server'

import { getContentBrief } from '@/actions/contents/getContentBrief'
import {
  getFictionSourcesForCeleb,
  type FictionSourceContent,
} from './getFictionSources'

export async function getFictionSourcePresentationsForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FictionSourceContent[]> {
  const sources = await getFictionSourcesForCeleb(celebId, locale)
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
