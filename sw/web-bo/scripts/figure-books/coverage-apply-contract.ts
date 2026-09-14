import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import {
  buildFigureBookPlan, buildResolvedSourceBookRegistration, normalizeIdentityText,
  parseFigureBookManifest, type BookCatalogSnapshot, type ExternalBookEdition,
  type FigureBookManifest,
} from './source-book-batch-contract'

export type CoverageCandidate = {
  candidateId: string
  celebId: string
  slug: string
  relationType: 'appearance' | 'related'
  evidenceUrls: string[]
  rationale: string
  manifest: FigureBookManifest
  editions: { ko: ExternalBookEdition; en?: ExternalBookEdition }
  originalWork: { kind: 'domestic' | 'translated'; title?: string; creator?: string; evidenceUrls: string[] }
  /** Set only from the hash-bound review, never trusted from prepared input. */
  reviewedReuseContentId?: string
}
export type Row = Record<string, unknown>
export type CoverageCatalog = BookCatalogSnapshot & { editions: Row[]; celebs: Row[] }
export const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')

function text(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
}
function urls(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.length || value.some(url => {
    try { return typeof url !== 'string' || !['http:', 'https:'].includes(new URL(url).protocol) } catch { return true }
  })) throw new Error(`${field} must contain evidence URLs`)
}

export function approvedCandidates(bytes: Buffer, review: unknown): CoverageCandidate[] {
  const input = JSON.parse(bytes.toString('utf8'))
  const approval = review as { inputSha256?: string; reviewedBy?: string; approvedCandidateIds?: string[]; reuseContentIds?: Record<string, string> }
  if (approval.inputSha256 !== sha256(bytes)) throw new Error('Review inputSha256 does not match prepared file')
  text(approval.reviewedBy, 'reviewedBy')
  if (!Array.isArray(approval.approvedCandidateIds)) throw new Error('approvedCandidateIds is required')
  if (input.version !== 1 || !Array.isArray(input.items)) throw new Error('Expected version 1 items')
  const ids = new Set<string>()
  for (const item of input.items) {
    text(item.candidateId, 'candidateId')
    if (ids.has(item.candidateId)) throw new Error(`Duplicate candidateId ${item.candidateId}`)
    ids.add(item.candidateId)
  }
  if (approval.approvedCandidateIds.some(id => !ids.has(id))) throw new Error('Review contains unknown candidateId')
  const approved = new Set(approval.approvedCandidateIds)
  return input.items.filter((item: CoverageCandidate) => approved.has(item.candidateId)).map((item: CoverageCandidate) => {
    for (const key of ['celebId', 'slug', 'rationale'] as const) text(item[key], key)
    if (!/^[0-9a-f-]{36}$/i.test(item.celebId)) throw new Error('Invalid celebId')
    if (!['appearance', 'related'].includes(item.relationType)) throw new Error('Only appearance/related may be added')
    urls(item.evidenceUrls, 'evidenceUrls')
    const manifest = parseFigureBookManifest(item.manifest)
    if (manifest.ko.translationStatus !== 'published') throw new Error('A verified Korean edition is required')
    if (!/^(97889|97911)/.test(manifest.ko.isbn)) throw new Error('Not a Korean ISBN')
    if (item.editions.ko.source !== 'kakao_book') throw new Error('Kakao verification is required')
    if (Boolean(manifest.en) !== Boolean(item.editions.en)) throw new Error('English edition/manifest mismatch')
    if (item.editions.en && item.editions.en.sourceMetadata.languageVerified !== 'eng') throw new Error('English edition language needs independent verification')
    const original = item.originalWork
    if (!original || !['domestic', 'translated'].includes(original.kind)) throw new Error('originalWork.kind is required')
    urls(original.evidenceUrls, 'originalWork.evidenceUrls')
    if (original.kind === 'translated') {
      text(original.title, 'originalWork.title'); text(original.creator, 'originalWork.creator')
      const reviewedLegacyReuse = approval.reuseContentIds?.[item.candidateId]
        && approval.reuseContentIds[item.candidateId] === manifest.reuseContentId
      if (manifest.work.identity.startsWith('book/') && !reviewedLegacyReuse) throw new Error('A translation cannot use domestic book/ISBN identity')
    } else if (manifest.work.identity.startsWith('book/') && manifest.work.identity !== `book/${manifest.ko.isbn}`) {
      throw new Error('Domestic identity ISBN mismatch')
    }
    buildResolvedSourceBookRegistration(manifest, item.editions)
    const reviewedReuseContentId = approval.reuseContentIds?.[item.candidateId]
    if (reviewedReuseContentId !== undefined) text(reviewedReuseContentId, 'review.reuseContentIds')
    return { ...item, manifest, reviewedReuseContentId }
  })
}

/** Same-lane completion: consume trusted prepare output, with no separate approval artifact. */
export function verifiedCandidates(
  bytes: Buffer,
  verification: unknown,
  convertPreparedRow: (row: Row) => object | null,
): { candidates: CoverageCandidate[]; held: { candidateId: string; reason: string }[] } {
  const input = JSON.parse(bytes.toString('utf8'))
  const prepared = verification as { rows?: Row[] }
  if (input.version !== 1 || !Array.isArray(input.items) || !Array.isArray(prepared.rows)) throw new Error('Verified mode requires prepared items and verification rows')
  const eligible = new Map<string, CoverageCandidate>()
  for (const row of prepared.rows) {
    const evidence = row.evidence as Row | undefined
    if (!Array.isArray(row.held) || row.held.some(reason => reason !== 'new_work_identity_requires_review')) continue
    if (row.reuseOverride || !Array.isArray(row.matches) || row.matches.length > 1) continue
    if (evidence?.quoteMatched !== true || evidence.error || !Number.isFinite(Number(evidence.status)) || Number(evidence.status) < 200 || Number(evidence.status) >= 300) continue
    const quote = normalizeIdentityText(String(evidence.quote ?? ''))
    if (quote.length < 12 || !normalizeIdentityText(String(evidence.excerpt ?? '')).includes(quote)) continue
    const converted = convertPreparedRow(row)
    if (!converted) continue
    const candidate = JSON.parse(JSON.stringify(converted)) as CoverageCandidate
    if (eligible.has(candidate.candidateId) && !isDeepStrictEqual(eligible.get(candidate.candidateId), candidate)) throw new Error(`Conflicting prepared rows: ${candidate.candidateId}`)
    eligible.set(candidate.candidateId, candidate)
  }
  const held: { candidateId: string; reason: string }[] = []
  const approvedCandidateIds: string[] = []
  for (const item of input.items as CoverageCandidate[]) {
    const verified = eligible.get(item.candidateId)
    if (!verified) held.push({ candidateId: item.candidateId, reason: 'not_passed_by_trusted_prepare' })
    else if (!isDeepStrictEqual(item, verified)) held.push({ candidateId: item.candidateId, reason: 'prepared_candidate_material_changed' })
    else approvedCandidateIds.push(item.candidateId)
  }
  return {
    candidates: approvedCandidates(bytes, { inputSha256: sha256(bytes), reviewedBy: 'same-lane-trusted-prepare', approvedCandidateIds }),
    held,
  }
}

export function resolveCoverageWork(item: CoverageCandidate, catalog: CoverageCatalog) {
  const manifest = item.manifest
  const resolved = buildResolvedSourceBookRegistration(manifest, item.editions)
  const isbnSet = new Set(Object.values(item.editions).map(edition => edition.isbn))
  const titles = new Set([manifest.work.title, ...manifest.work.titleAliases].map(normalizeIdentityText))
  const creators = new Set([manifest.work.creator, ...manifest.work.creatorAliases].map(normalizeIdentityText))
  const found = new Set<string>()
  const strong = new Set<string>()
  for (const row of catalog.contents) {
    const figure = row.metadata?.figureBook as Row | undefined
    if (figure?.workIdentity === manifest.work.identity
      || (item.originalWork.kind === 'translated'
        && normalizeIdentityText(String(figure?.originalTitle ?? '')) === normalizeIdentityText(item.originalWork.title!)
        && normalizeIdentityText(String(figure?.originalCreator ?? '')) === normalizeIdentityText(item.originalWork.creator!))
      || isbnSet.has((row.external_id ?? '').replace(/[^0-9]/g, ''))) {
      found.add(row.id); strong.add(row.id)
    }
  }
  for (const row of [...catalog.locales, ...catalog.editions]) {
    const id = String(row.content_id)
    if (isbnSet.has(String(row.isbn ?? '').replace(/[^0-9]/g, ''))) { found.add(id); strong.add(id) }
    if (titles.has(normalizeIdentityText(String(row.title ?? ''))) && creators.has(normalizeIdentityText(String(row.creator ?? '')))) found.add(id)
  }
  if (manifest.reuseContentId) found.add(manifest.reuseContentId)
  if (item.reviewedReuseContentId) {
    const selectedId = item.reviewedReuseContentId
    if (manifest.reuseContentId && manifest.reuseContentId !== selectedId) throw new Error('Prepared and reviewed reuse IDs differ')
    if (!found.has(selectedId) || !catalog.contents.some(row => row.id === selectedId && row.type === 'BOOK')) throw new Error('Reviewed reuse ID is not an existing match')
    if (Object.entries(item.editions).some(([locale, edition]) => !catalog.editions.some(row => row.content_id === selectedId && row.locale === locale && row.isbn === edition.isbn))) {
      throw new Error('Reviewed ambiguous reuse requires every exact ISBN edition already under selected work')
    }
    return { contentId: selectedId, contentInsert: null, resolved }
  }
  if (found.size > 1) throw new Error(`Ambiguous existing works: ${[...found].join(', ')}`)
  const existingId = [...found][0]
  if (existingId && !strong.has(existingId) && manifest.reuseContentId !== existingId) {
    throw new Error(`Title/author match needs reviewed reuseContentId: ${existingId}`)
  }
  if (existingId) {
    const existing = catalog.contents.find(row => row.id === existingId)
    if (!existing || existing.type !== 'BOOK') throw new Error('Existing content is not BOOK')
    return { contentId: existingId, contentInsert: null, resolved }
  }
  const plan = buildFigureBookPlan(manifest, resolved, catalog)
  if (plan.action === 'conflict') throw new Error(plan.conflicts.join('; '))
  const contentInsert = plan.contentInsert!
  const figure = contentInsert.metadata!.figureBook as Row
  if (item.originalWork.kind === 'translated') Object.assign(figure, {
    originalTitle: item.originalWork.title, originalCreator: item.originalWork.creator,
  })
  if (/^wikidata:q\d+$/i.test(manifest.work.identity)) figure.wikidataQid = manifest.work.identity.slice(9).toUpperCase()
  return { contentId: plan.contentId, contentInsert, resolved }
}

export const SNAPSHOT_TABLES = ['contents', 'content_locales', 'figure_book_contents', 'figure_book_editions', 'figure_book_characters', 'figure_book_products'] as const
export type CoverageSnapshot = Record<typeof SNAPSHOT_TABLES[number], Row[]>
export function sqlJson(value: unknown): string {
  return `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('hex')}', 'hex'), 'UTF8')::jsonb`
}
export function snapshotSql(contentId: string): string {
  const id = `${sqlJson(contentId)} #>> '{}'`
  return `jsonb_build_object(${SNAPSHOT_TABLES.map(table => {
    const where = table === 'figure_book_products'
      ? `edition_id IN (SELECT id FROM public.figure_book_editions WHERE content_id = (${id}))`
      : `${table === 'contents' ? 'id' : 'content_id'} = (${id})`
    return `'${table}', (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.${table} t WHERE ${where})`
  }).join(',')})`
}

export function buildCoverageWrites(items: CoverageCandidate[], catalog: CoverageCatalog, before: CoverageSnapshot) {
  const work = resolveCoverageWork(items[0], catalog)
  const contentId = work.contentId
  const rows: Record<string, Row[]> = Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
  if (work.contentInsert) rows.contents.push(work.contentInsert)
  if (!before.figure_book_contents.length) rows.figure_book_contents.push({ content_id: contentId })
  for (const item of items) {
    if (resolveCoverageWork(item, catalog).contentId !== contentId) throw new Error('Group contains different works')
    const person = catalog.celebs.find(row => row.id === item.celebId && row.slug === item.slug)
    if (!person) throw new Error(`Person ID/slug not in public catalog: ${item.slug}`)
    const resolved = buildResolvedSourceBookRegistration(item.manifest, item.editions)
    if (item.reviewedReuseContentId && !before.figure_book_contents.length) throw new Error('Reviewed reuse must already be a figure book')
    for (const locale of item.reviewedReuseContentId ? [] : resolved.locales) {
      const edition = item.editions[locale.locale]!
      if (!before.content_locales.some(row => row.locale === locale.locale) && !rows.content_locales.some(row => row.locale === locale.locale)) rows.content_locales.push({ content_id: contentId, ...locale })
      const allEditions = [...before.figure_book_editions, ...rows.figure_book_editions]
      const seededFromLocale = !before.figure_book_contents.length && before.content_locales.some(row => row.locale === locale.locale && row.isbn === locale.isbn)
      if (!seededFromLocale && !allEditions.some(row => row.locale === locale.locale && row.isbn === locale.isbn)) {
        const { affiliate_url: _affiliate, ...material } = locale
        void _affiliate
        rows.figure_book_editions.push({ content_id: contentId, ...material, release_date: edition.releaseDate,
          edition_kind: item.manifest.edition.kind, text_scope: item.manifest.edition.scope,
          sort_order: Math.max(-1, ...allEditions.map(row => Number(row.sort_order))) + 1 })
      }
    }
    const relation = before.figure_book_characters.find(row => row.celeb_id === item.celebId)
    if (relation?.relation_type === 'authored') throw new Error(`Authored relation must be preserved: ${item.slug}`)
    if (!relation && !rows.figure_book_characters.some(row => row.celeb_id === item.celebId)) rows.figure_book_characters.push({
      content_id: contentId, celeb_id: item.celebId, relation_type: item.relationType,
      description: null, description_en: null,
      sort_order: Math.max(-1, ...before.figure_book_characters.map(row => Number(row.sort_order))) + rows.figure_book_characters.length + 1,
    })
  }
  return { contentId, rows }
}

/** No UPDATE/DELETE: existing locales, editions, authored relations and products remain byte-for-byte intact. */
export function buildCoverageApplySql(contentId: string, before: CoverageSnapshot, rows: Record<string, Row[]>): string {
  const inserts = ['contents', 'figure_book_contents', 'content_locales', 'figure_book_editions', 'figure_book_characters'].map(table => {
    if (!rows[table].length) return ''
    const keys = Object.keys(rows[table][0])
    // Names originate only in buildCoverageWrites, but reject arbitrary identifiers defensively.
    if (keys.some(key => !/^[a-z_]+$/.test(key))) throw new Error('Invalid write column')
    return `INSERT INTO public.${table} (${keys.join(',')}) SELECT ${keys.map(key => `x.${key}`).join(',')} FROM jsonb_populate_recordset(NULL::public.${table}, ${sqlJson(rows[table])}) x;`
  }).join('\n')
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
SET LOCAL idle_in_transaction_session_timeout='45s'; SET LOCAL ROLE service_role;
LOCK TABLE ${SNAPSHOT_TABLES.map(table => `public.${table}`).join(',')} IN SHARE ROW EXCLUSIVE MODE;
DO $guard$ BEGIN IF ${snapshotSql(contentId)} IS DISTINCT FROM ${sqlJson(before)} THEN RAISE EXCEPTION 'Coverage target changed after backup'; END IF; END; $guard$;
DO $duplicates$ DECLARE proposed jsonb := ${sqlJson(rows)}; item jsonb;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(proposed -> 'contents') LOOP
    IF EXISTS (SELECT 1 FROM public.contents c WHERE c.type='BOOK' AND (
      c.metadata #>> '{figureBook,workIdentity}' = item #>> '{metadata,figureBook,workIdentity}'
      OR c.external_id = item ->> 'external_id'
      OR (nullif(item #>> '{metadata,figureBook,originalTitle}', '') IS NOT NULL
        AND lower(regexp_replace(c.metadata #>> '{figureBook,originalTitle}', '[^[:alnum:]]', '', 'g')) = lower(regexp_replace(item #>> '{metadata,figureBook,originalTitle}', '[^[:alnum:]]', '', 'g'))
        AND lower(regexp_replace(c.metadata #>> '{figureBook,originalCreator}', '[^[:alnum:]]', '', 'g')) = lower(regexp_replace(item #>> '{metadata,figureBook,originalCreator}', '[^[:alnum:]]', '', 'g')))
    )) THEN RAISE EXCEPTION 'New work duplicate appeared after preflight'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(proposed -> 'content_locales') LOOP
    IF EXISTS (SELECT 1 FROM public.content_locales l WHERE l.content_id <> item->>'content_id'
      AND lower(regexp_replace(l.title, '[^[:alnum:]]', '', 'g')) = lower(regexp_replace(item->>'title', '[^[:alnum:]]', '', 'g'))
      AND lower(regexp_replace(l.creator, '[^[:alnum:]]', '', 'g')) = lower(regexp_replace(item->>'creator', '[^[:alnum:]]', '', 'g')))
      THEN RAISE EXCEPTION 'Matching book title and author appeared after preflight'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(proposed -> 'figure_book_editions') LOOP
    IF EXISTS (SELECT 1 FROM public.figure_book_editions e WHERE e.isbn=item->>'isbn' AND e.content_id <> item->>'content_id')
      OR EXISTS (SELECT 1 FROM public.content_locales l WHERE l.isbn=item->>'isbn' AND l.content_id <> item->>'content_id')
      THEN RAISE EXCEPTION 'Edition ISBN belongs to another work'; END IF;
  END LOOP;
END; $duplicates$;
${inserts}
DO $check$ DECLARE after_state jsonb := ${snapshotSql(contentId)}; old_state jsonb := ${sqlJson(before)}; expected jsonb := ${sqlJson(rows)}; tab text; row jsonb;
BEGIN
  FOREACH tab IN ARRAY ARRAY[${SNAPSHOT_TABLES.map(table => `'${table}'`).join(',')}] LOOP
    FOR row IN SELECT value FROM jsonb_array_elements(old_state -> tab) LOOP
      IF NOT (after_state -> tab) @> jsonb_build_array(row) THEN RAISE EXCEPTION 'Existing row changed in %', tab; END IF;
    END LOOP;
    FOR row IN SELECT value FROM jsonb_array_elements(expected -> tab) LOOP
      IF NOT (after_state -> tab) @> jsonb_build_array(row) THEN RAISE EXCEPTION 'Inserted material mismatch in %', tab; END IF;
    END LOOP;
  END LOOP;
END; $check$;
SELECT jsonb_build_object('status','applied','after',${snapshotSql(contentId)})::text;
COMMIT;
`
}
