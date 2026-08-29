'use server'

import { getContentBrief } from '@/actions/contents/getContentBrief'
import {
  getFictionSourcesForCeleb,
  type FictionSourceContent,
} from './getFictionSources'

function nonEmpty(value: string | undefined): string | null {
  return value?.trim() || null
}

export async function getFictionSourcePresentationsForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FictionSourceContent[]> {
  const sources = await getFictionSourcesForCeleb(celebId, locale)
  const missingDescriptions = sources.filter((source) => !source.description)
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
      description: brief.description,
      publisher: source.publisher ?? nonEmpty(brief.metadata?.publisher),
      isbn: source.isbn ?? nonEmpty(brief.metadata?.isbn),
      releaseDate: source.releaseDate ?? brief.releaseDate,
    }
  })
}
