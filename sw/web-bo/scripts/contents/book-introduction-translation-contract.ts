import { forLocale } from '@feelandnote/content-search/book-introduction'
import type { IntroductionChange, IntroductionRow } from './book-description-sources-contract'

export interface ReviewedIntroductionTranslation {
  target: IntroductionRow
  source: IntroductionRow
  sourceUrl: string | null
  sourceText: string
  /** Actual language of sourceText when the stored source row is not in its locale's language (legacy defect). */
  sourceLocale?: string
  translation: string
  identityEvidence: Array<{ url: string; note: string }>
}

/** null sourceUrl is allowed only when the source row itself records no description URL. */
function descriptionSources(target: IntroductionRow, input: ReviewedIntroductionTranslation, sourceLocale: string) {
  const sources: Record<string, unknown> = { ...target.sources, description_method: 'translation', description_source_locale: sourceLocale }
  if (input.sourceUrl) sources.description = input.sourceUrl
  return sources
}

function sourceUrlMatchesRecord(input: ReviewedIntroductionTranslation): boolean {
  const recorded = input.source.sources?.description
  if (input.sourceUrl === null) return recorded == null
  return typeof recorded === 'string' && recorded === input.sourceUrl && /^https:\/\//.test(recorded)
}

export function openLibraryIntroductionUrl(value: string): boolean {
  return /^https:\/\/openlibrary\.org\/(?:books\/OL\d+M|works\/OL\d+W)$/.test(value)
}

/** The ko→en plan's recorded source must be exactly the URL the stored ko row claims as its provenance. */
export function recordedKoreanIntroductionUrl(input: ReviewedIntroductionTranslation): boolean {
  return sourceUrlMatchesRecord(input)
}

/** An English display title needs no English ISBN to hold a reviewed translation of the same work. */
export function planIntroductionTranslationKoEn(input: ReviewedIntroductionTranslation): IntroductionChange | null {
  const { target, source } = input
  if (target.content_id !== source.content_id || target.locale !== 'en' || source.locale !== 'ko') throw new Error('Translation work/locale mismatch')
  if (target.description?.trim()) return null
  if (!source.description?.trim() || !sourceUrlMatchesRecord(input)
    || !forLocale(input.sourceText, 'ko') || !forLocale(input.translation, 'en')) throw new Error('Unverified translation text or source')
  if (!input.identityEvidence?.length || input.identityEvidence.some(e => !e.note?.trim() || !/^https:\/\//.test(e.url))) throw new Error('Missing work identity evidence')
  if (target.sources !== null && (typeof target.sources !== 'object' || Array.isArray(target.sources))) throw new Error('Invalid introduction sources')
  return {
    table: 'content_locales', before: target, description: input.translation.trim(),
    sources: descriptionSources(target, input, 'ko'),
    verifiedDescription: input.sourceText,
  }
}

/** A Korean display title needs no Korean ISBN to hold a reviewed translation of the same work. */
export function planIntroductionTranslation(input: ReviewedIntroductionTranslation): IntroductionChange | null {
  const { target, source } = input
  if (target.content_id !== source.content_id || target.locale !== 'ko' || source.locale !== 'en') throw new Error('Translation work/locale mismatch')
  if (target.description?.trim()) return null
  const sourceLocale = input.sourceLocale ?? 'en'
  if (!/^[a-z]{2,3}$/.test(sourceLocale)) throw new Error('Invalid source locale')
  const sourceTextOk = input.sourceLocale === undefined ? Boolean(forLocale(input.sourceText, 'en')) : Boolean(input.sourceText?.trim())
  if (!source.description?.trim()
    || !(input.sourceUrl === null ? sourceUrlMatchesRecord(input) : openLibraryIntroductionUrl(input.sourceUrl))
    || !sourceTextOk || !forLocale(input.translation, 'ko')) throw new Error('Unverified translation text or source')
  if (!input.identityEvidence?.length || input.identityEvidence.some(e => !e.note?.trim() || !/^https:\/\//.test(e.url))) throw new Error('Missing work identity evidence')
  if (target.sources !== null && (typeof target.sources !== 'object' || Array.isArray(target.sources))) throw new Error('Invalid introduction sources')
  return {
    table: 'content_locales', before: target, description: input.translation.trim(),
    sources: descriptionSources(target, input, sourceLocale),
    verifiedDescription: input.sourceText,
  }
}
