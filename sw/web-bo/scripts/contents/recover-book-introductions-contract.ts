import { toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { getOpenLibraryBookUrl } from '@feelandnote/content-search/openlibrary'
import { forLocale } from '@feelandnote/content-search/book-introduction'
import type { IntroductionRow } from './book-description-sources-contract'

export interface RecoveryInput { isbn?: string; locale: 'ko' | 'en'; sourceUrl?: string }

/** An English edition label is not evidence that its linked work description is English. */
export function isRecoveryBody(description: string, locale: 'ko' | 'en'): boolean {
  return forLocale(description, locale) !== null
}

/** Existing row/work references only: never search by a translated display title. */
export function recoveryInputs(row: IntroductionRow, metadata: Record<string, unknown> | null): RecoveryInput[] {
  if (row.description?.trim()) return []
  const isbn = toIsbn13(row.isbn ?? '')
  if (row.locale === 'ko') return isbn ? [{ locale: 'ko', isbn }] : []
  const inputs: RecoveryInput[] = isbn ? [{ locale: 'en', isbn }] : []
  const sources = row.sources ?? {}
  const openlibrary = metadata?.openlibrary
  const nested = openlibrary && typeof openlibrary === 'object' && !Array.isArray(openlibrary)
    ? openlibrary as Record<string, unknown> : {}
  const candidates = [sources.description, sources.work, sources.edition,
    sources.openlibrary, sources.openlibrary_work, sources.openlibrary_edition,
    metadata?.openlibrary_work, metadata?.openlibrary_edition, metadata?.source_url,
    metadata?.openlibrary_url, metadata?.openlibrary_work_url,
    metadata?.openlibrary_edition_url, nested.url, nested.work, nested.edition, nested.workKey, nested.editionKey]
  const seen = new Set<string>()
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue
    const normalized = raw.startsWith('/works/OL') || raw.startsWith('/books/OL')
      ? `https://openlibrary.org${raw}` : raw
    const sourceUrl = getOpenLibraryBookUrl(normalized)
    if (!sourceUrl || seen.has(sourceUrl)) continue
    if (isbn && new URL(sourceUrl).pathname.startsWith('/isbn/')
      && toIsbn13(new URL(sourceUrl).pathname.slice('/isbn/'.length)) !== isbn) continue
    seen.add(sourceUrl)
    inputs.push({ locale: 'en', ...(isbn ? { isbn } : {}), sourceUrl })
  }
  return inputs
}
