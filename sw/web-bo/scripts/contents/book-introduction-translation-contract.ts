import { forLocale } from '@feelandnote/content-search/book-introduction'
import type { IntroductionChange, IntroductionRow } from './book-description-sources-contract'

export interface ReviewedIntroductionTranslation {
  target: IntroductionRow
  source: IntroductionRow
  sourceUrl: string
  sourceText: string
  translation: string
  identityEvidence: Array<{ url: string; note: string }>
}

export function openLibraryIntroductionUrl(value: string): boolean {
  return /^https:\/\/openlibrary\.org\/(?:books\/OL\d+M|works\/OL\d+W)$/.test(value)
}

/** A Korean display title needs no Korean ISBN to hold a reviewed translation of the same work. */
export function planIntroductionTranslation(input: ReviewedIntroductionTranslation): IntroductionChange | null {
  const { target, source } = input
  if (target.content_id !== source.content_id || target.locale !== 'ko' || source.locale !== 'en') throw new Error('Translation work/locale mismatch')
  if (target.description?.trim()) return null
  if (!source.description?.trim() || !openLibraryIntroductionUrl(input.sourceUrl)
    || !forLocale(input.sourceText, 'en') || !forLocale(input.translation, 'ko')) throw new Error('Unverified translation text or source')
  if (!input.identityEvidence?.length || input.identityEvidence.some(e => !e.note?.trim() || !/^https:\/\//.test(e.url))) throw new Error('Missing work identity evidence')
  if (target.sources !== null && (typeof target.sources !== 'object' || Array.isArray(target.sources))) throw new Error('Invalid introduction sources')
  return {
    table: 'content_locales', before: target, description: input.translation.trim(),
    sources: { ...target.sources, description: input.sourceUrl, description_method: 'translation', description_source_locale: 'en' },
    verifiedDescription: input.sourceText,
  }
}
