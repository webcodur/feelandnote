import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import type { BookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { BOOK_DESCRIPTION_KEYS } from '@feelandnote/shared/lib/book-metadata'

export interface IntroductionRow {
  id?: number
  content_id: string
  locale: 'ko' | 'en'
  title: string | null
  creator: string | null
  publisher: string | null
  isbn: string | null
  description: string | null
  sources: Record<string, unknown> | null
}

export interface IntroductionSelection {
  source: BookIntroductionSource | null
  sourceUrl: string | null
  description: string | null
}

export interface IntroductionChange {
  table: 'content_locales' | 'figure_book_editions'
  before: IntroductionRow
  description: BookIntroductionSource
  sources: Record<string, unknown>
  /** The fetched body is retained in the local plan so metadata copies can be removed safely. */
  verifiedDescription: string
}

export interface IntroductionMetadataChange {
  before: Record<string, unknown>
  after: Record<string, unknown>
  removed: string[]
  preserved: IntroductionRow[]
}

/** Remove only duplicate text that remains in a locale/edition or has a verified external replacement. */
export function planIntroductionMetadataCleanup(
  metadata: Record<string, unknown> | null,
  rows: IntroductionRow[],
  verifiedDescriptions: string[] = [],
): IntroductionMetadataChange | null {
  if (!metadata) return null
  const copies = new Set(rows.flatMap((row) => row.description?.trim() && !isBookIntroductionSource(row.description)
    ? [normalizeIntroductionCopy(row.description)] : []))
  for (const description of verifiedDescriptions) {
    if (description.trim()) copies.add(normalizeIntroductionCopy(description))
  }
  const after = { ...metadata }
  const removed: string[] = []
  for (const key of BOOK_DESCRIPTION_KEYS) {
    const text = metadata[key]
    if (typeof text === 'string' && text.trim() && copies.has(normalizeIntroductionCopy(text))) {
      delete after[key]
      removed.push(key)
    }
  }
  const removedTexts = new Set(removed.map((key) => normalizeIntroductionCopy(metadata[key] as string)))
  return removed.length ? { before: metadata, after, removed, preserved: rows.filter((row) =>
    row.description && removedTexts.has(normalizeIntroductionCopy(row.description))) } : null
}

/** Formatting differences are ignored; unrelated summaries are never treated as copies. */
export function normalizeIntroductionCopy(value: string): string {
  return value.normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, (entity) => ({
      '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>',
    })[entity.toLowerCase()] ?? entity)
    .replace(/[\p{Z}\s]+/gu, '')
    .replace(/(?:\.{1,3}|…)+$/u, '')
    .trim()
}

export function hasPreparedIntroduction(row: IntroductionRow): boolean {
  const sources = row.sources ?? {}
  if (sources.manual === true) return true
  const descriptionSource = sources.description
  const provenance = [sources.translation, sources.descriptionTranslation, sources.description_translation,
    sources.manual, sources.correction,
    typeof descriptionSource === 'object' ? JSON.stringify(descriptionSource) : descriptionSource]
  if (provenance.some((value) => typeof value === 'string' && /manual|translated|translation|rewrite|generated|research|homonym|직접|번역|수기/i.test(value))) return true
  return [sources.sourceLocale, sources.source_locale].some((value) =>
    (value === 'ko' || value === 'en') && value !== row.locale)
}

/** A source marker is written only for a fetched introduction that can replace this row. */
export function planIntroductionChange(
  table: IntroductionChange['table'],
  row: IntroductionRow,
  selection: IntroductionSelection,
): { change: IntroductionChange | null; reason: string } {
  if (isBookIntroductionSource(row.description)) return { change: null, reason: 'already-selected' }
  if (row.sources !== null && (typeof row.sources !== 'object' || Array.isArray(row.sources))) {
    return { change: null, reason: 'legacy-sources' }
  }
  if (hasPreparedIntroduction(row) && row.description?.trim()) return { change: null, reason: 'prepared-text' }
  if (!selection.source || !selection.sourceUrl || !selection.description?.trim()) return { change: null, reason: 'no-external-introduction' }
  if ((row.locale === 'en') !== (selection.source === 'OPEN')) return { change: null, reason: 'source-language-mismatch' }
  const current = normalizeIntroductionCopy(row.description ?? '')
  const fetched = normalizeIntroductionCopy(selection.description)
  // A sufficiently long exact prefix establishes that a truncated API copy is being extended.
  if (current && current !== fetched && !(current.length >= 80 && fetched.startsWith(current))) {
    return { change: null, reason: 'unverified-stored-text' }
  }
  return {
    reason: current ? 'external-copy' : 'missing-introduction',
    change: {
      table,
      before: row,
      description: selection.source,
      sources: { ...row.sources, description: selection.sourceUrl },
      verifiedDescription: selection.description,
    },
  }
}

function literal(value: string): string { return `'${value.replace(/'/g, "''")}'` }
function json(value: unknown): string { return `${literal(JSON.stringify(value))}::jsonb` }

/** Each book is one transaction. A concurrent edit aborts the whole book instead of overwriting it. */
export function buildIntroductionApplySql(contentId: string, changes: IntroductionChange[], metadata?: IntroductionMetadataChange | null): string {
  if (changes.length === 0 && !metadata) throw new Error('No introduction changes')
  if (changes.some(({ before }) => before.content_id !== contentId)) throw new Error('One book per transaction')
  const updates = changes.map((change) => {
    const row = change.before
    const identity = change.table === 'content_locales'
      ? `content_id = ${literal(contentId)} AND locale = ${literal(row.locale)}`
      : `id = ${Number(row.id)} AND content_id = ${literal(contentId)}`
    if (change.table === 'figure_book_editions' && !Number.isSafeInteger(row.id)) throw new Error('Invalid edition ID')
    const before = { description: row.description, sources: row.sources, isbn: row.isbn,
      title: row.title, creator: row.creator, publisher: row.publisher }
    return `UPDATE public.${change.table}
SET description = ${literal(change.description)}, sources = ${json(change.sources)}, updated_at = now()
WHERE ${identity}
  AND jsonb_build_object('description', description, 'sources', sources, 'isbn', isbn,
    'title', title, 'creator', creator, 'publisher', publisher) = ${json(before)};
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Book introduction changed concurrently'; END IF;`
  })
  if (metadata) updates.push(`UPDATE public.contents SET metadata = ${json(metadata.after)}
WHERE id = ${literal(contentId)} AND type = 'BOOK' AND metadata = ${json(metadata.before)};
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Book metadata changed concurrently'; END IF;`)
  const preserveChecks = (metadata?.preserved ?? []).map((row) => {
    const table = row.id === undefined ? 'content_locales' : 'figure_book_editions'
    if (table === 'figure_book_editions' && !Number.isSafeInteger(row.id)) throw new Error('Invalid edition ID')
    if (row.content_id !== contentId) throw new Error('One book per transaction')
    const identity = row.id === undefined ? `locale = ${literal(row.locale)}` : `id = ${row.id}`
    return `IF NOT EXISTS (SELECT 1 FROM public.${table} WHERE content_id = ${literal(contentId)} AND ${identity}
      AND description IS NOT DISTINCT FROM ${row.description === null ? 'NULL' : literal(row.description)} FOR SHARE) THEN
      RAISE EXCEPTION 'Preserved introduction changed concurrently';
    END IF;`
  })
  const body = `DECLARE changed integer;
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.contents WHERE id = ${literal(contentId)} AND type = 'BOOK' FOR SHARE) THEN
  RAISE EXCEPTION 'BOOK no longer exists';
END IF;
${preserveChecks.join('\n')}
${updates.join('\n')}
END;`
  let delimiter = '$book_introductions$'
  while (body.includes(delimiter)) delimiter = delimiter.replace(/\$$/, '_x$')
  return `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO ${delimiter}
${body}
${delimiter};
COMMIT;`
}
