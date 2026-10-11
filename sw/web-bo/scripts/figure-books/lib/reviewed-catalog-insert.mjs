/** 기존 BOOK의 누락 카탈로그·판본만 보완한다. ISBN·원작·본문 언어의 최종 판단은 호출한 LLM이 한다. */
import { createHash, randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { executeTemporaryMergeSql } from '../merge-works.mjs'
import { captureCatalogRepairSnapshot } from './guarded-catalog-repairs.mjs'
import { SNAPSHOT_TABLES, REFERENCE_TABLES, referenceWhere, sqlLiteral } from './merge-work-sql.mjs'
import { CONTENT_ARRAY_REFERENCES } from './content-array-references.mjs'
import { toIsbn13 } from '../../../../../packages/content-search/src/book-isbn.ts'
import { SERVICE_BOOK_EDITION_KINDS, bookTranslatorKey, excludedBookEditionReason, reviewedBookEditionSelectionReason } from '../../../../../packages/content-search/src/book-edition-policy.ts'

const prefix = 'CATALOG_INSERT_EXPECTED:'
const json = value => sqlLiteral(JSON.stringify(value)) + '::jsonb'
const nullable = value => value === null ? 'NULL' : sqlLiteral(value)
const nonempty = value => typeof value === 'string' && !!value.trim() && !value.includes('\0')
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const rowsCanonical = rows => rows.map(row => JSON.stringify(canonical(row))).sort()
function snapshotValid(snapshot) {
  for (const table of SNAPSHOT_TABLES) if (!Array.isArray(snapshot?.[table])) throw Error('CATALOG_INSERT: missing full snapshot ' + table)
}
function assignedValid(workIds) {
  if (!Array.isArray(workIds) || !workIds.length || workIds.length > 100 || workIds.some(id => !nonempty(id))
    || new Set(workIds).size !== workIds.length) throw Error('CATALOG_INSERT: 1..100 distinct assigned IDs required')
  return [...workIds]
}
function publicSource(value, independent = false) {
  try {
    const source = new URL(value)
    return typeof value === 'string' && source.protocol === 'https:' && !source.username && !source.password
      && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(source.hostname)
      && (!independent || !/(?:^|\.)openlibrary\.org$/iu.test(source.hostname.replace(/\.$/u, '')))
      && ![...source.searchParams.keys()].some(key => /(?:api.?key|token|secret|password|authorization)/iu.test(key))
  } catch { return false }
}
function officialBinding(locale, isbn) {
  const values = [locale.sources?.isbn, locale.sources?.title, locale.sources?.url, locale.sources?.edition,
    locale.sources?.provider_edition_url, locale.sources?.description]
  return values.some(value => {
    if (!publicSource(value)) return false
    const url = new URL(value)
    if (locale.locale === 'en') return url.hostname === 'openlibrary.org' && /^\/books\/OL\d+M(?:\/|$)/u.test(url.pathname)
    return /^(?:m\.)?search\.daum\.net$/u.test(url.hostname) && /^\d+$/u.test(url.searchParams.get('bookId') ?? '')
      || url.hostname === 'dapi.kakao.com' && url.pathname === '/v3/search/book'
        && url.searchParams.get('target') === 'isbn' && toIsbn13(url.searchParams.get('query') ?? '') === isbn
  })
}
const where = (table, workIds, alias = 't') => workIds.map(id => '(' + referenceWhere(table, sqlLiteral(id), sqlLiteral(id), alias) + ')').join(' OR ')
function aggregateCheck(table, workIds, expression) {
  return `IF (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM (SELECT to_jsonb(t) v FROM public.${table} t WHERE ${where(table, workIds)}) a)
IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM jsonb_array_elements(${expression}) v)
THEN RAISE EXCEPTION 'CATALOG_INSERT: rowset mismatch in ${table}';END IF;`
}

function reviewedSnapshotIdentity(review, snapshot) {
  if (review?.useReviewedSnapshotIdentity !== true) return review
  if (['title', 'creator', 'workTitle', 'workCreator', 'translators'].some(key => Object.hasOwn(review, key)))
    throw Error('CATALOG_INSERT: compact snapshot identity cannot be mixed with explicit identity fields')
  const work = snapshot.contents.find(row => row.id === review.contentId)
  const locales = snapshot.content_locales.filter(row => row.content_id === review.contentId && row.locale === review.locale)
  const locale = locales.length === 1 && locales[0]
  const figure = work?.metadata?.figureBook
  if (!locale || !nonempty(figure?.workTitle) || !nonempty(figure?.workCreator))
    throw Error('CATALOG_INSERT: compact snapshot identity requires one live locale and a reviewed original anchor')
  return { ...review, title: locale.sources?.edition_title?.trim() || locale.title?.trim(), creator: locale.creator?.trim(),
    workTitle: figure.workTitle, workCreator: figure.workCreator,
    ...(locale.sources?.translators !== undefined ? { translators: locale.sources.translators } : {}) }
}

const reviewedIdentityHash = review => createHash('sha256').update(JSON.stringify(canonical({ title: review.title, creator: review.creator,
  workTitle: review.workTitle, workCreator: review.workCreator, translators: review.translators ?? [] }))).digest('hex')

/** LLM이 검토한 RAM snapshot에 compact 입력을 묶는다. 읽은 뒤 서지·원작이 바뀌면 실행을 거부한다. */
export function bindReviewedCatalogInsertIdentity(snapshot, reviews) {
  snapshotValid(snapshot)
  if (!Array.isArray(reviews) || !reviews.length || reviews.length > 200) throw Error('CATALOG_INSERT: explicit source-reviewed editions required')
  return reviews.map(input => {
    const review = { ...input, useReviewedSnapshotIdentity: true }
    return { ...review, reviewedIdentityHash: reviewedIdentityHash(reviewedSnapshotIdentity(review, snapshot)) }
  })
}

/**
 * reviews: {contentId,locale,isbn,title,creator,textLanguage,workTitle,workCreator,
 *   sourceUrl,reason,translators?:string[],editionKind:null|serviceKind,textScope:null|string}.
 * title is the effective seed title (sources.edition_title, otherwise the trimmed locale title).
 * Each real card needs either an explicit edition review or an exact source-reviewed exclusion.
 * Display cards must have no ISBN. The live seed trigger excludes reviewed rejected cards.
 * sourceUrl is independent of OpenLibrary; sources in the live card must already bind the official ISBN.
 * A missing parent uses its automatic seed; an existing parent with zero editions receives only reviewed cards.
 * It never creates another BOOK, changes an existing parent or patches a card.
 * useReviewedSnapshotIdentity:true explicitly confirms the caller reviewed the current card/original identity;
 * omit title/creator/workTitle/workCreator/translators to copy those exact fields from the guarded snapshot.
 * bindReviewedCatalogInsertIdentity binds them to the snapshot actually reviewed; stale identities are refused.
 * ISBN, actual language, independent source, reason and kind/scope remain explicit LLM decisions.
 */
export function planReviewedCatalogInsert(workIds, snapshot, reviews) {
  const assigned = assignedValid(workIds); snapshotValid(snapshot)
  if (!Array.isArray(reviews) || !reviews.length || reviews.length > 200) throw Error('CATALOG_INSERT: explicit source-reviewed editions required')
  if (assigned.some(id => snapshot.contents.filter(row => row.id === id && row.type === 'BOOK').length !== 1)) throw Error('CATALOG_INSERT: existing assigned BOOK missing')
  const keys = new Set(), isbns = new Set(), parentIds = [...new Set(reviews.map(review => review?.contentId))]
  const editions = reviews.map(input => {
    const review = reviewedSnapshotIdentity(input, snapshot)
    if (input?.useReviewedSnapshotIdentity === true && input.reviewedIdentityHash !== reviewedIdentityHash(review))
      throw Error('CATALOG_INSERT: reviewed snapshot identity changed or binding missing')
    if (!review || !assigned.includes(review.contentId) || !['ko', 'en'].includes(review.locale)
      || review.textLanguage !== review.locale || !nonempty(review.title) || !nonempty(review.creator)
      || !nonempty(review.workTitle) || !nonempty(review.workCreator) || !nonempty(review.reason)
      || !publicSource(review.sourceUrl, true)) throw Error('CATALOG_INSERT: assigned owner, exact text language and independent work review required')
    const isbn = typeof review.isbn === 'string' && toIsbn13(review.isbn)
    if (!isbn || isbn !== review.isbn) throw Error('CATALOG_INSERT: exact normalized real ISBN13 required')
    const key = JSON.stringify([review.contentId, review.locale])
    if (keys.has(key) || isbns.has(isbn)) throw Error('CATALOG_INSERT: duplicate locale or ISBN in reviews')
    keys.add(key); isbns.add(isbn)
    const work = snapshot.contents.find(row => row.id === review.contentId)
    if (snapshot.figure_book_contents.filter(row => row.content_id === review.contentId).length > 1)
      throw Error('CATALOG_INSERT: duplicate existing catalog parents')
    if (snapshot.figure_book_editions.some(row => row.content_id === review.contentId || toIsbn13(row.isbn ?? '') === isbn))
      throw Error('CATALOG_INSERT: existing edition/ISBN; zero-edition path only')
    if (snapshot.content_locales.some(row => row.content_id !== review.contentId && toIsbn13(row.isbn ?? '') === isbn)) throw Error('CATALOG_INSERT: ISBN already belongs to another assigned work')
    const locales = snapshot.content_locales.filter(row => row.content_id === review.contentId && row.locale === review.locale)
    const locale = locales.length === 1 && locales[0]
    const title = (locale?.sources?.edition_title?.trim() || locale?.title?.trim())
    if (!locale || locale.isbn?.trim() !== isbn || title !== review.title || locale.creator?.trim() !== review.creator)
      throw Error('CATALOG_INSERT: exact live locale ISBN/title/creator mismatch')
    if (locale.sources?.primary !== (review.locale === 'ko' ? 'kakao_book' : 'openlibrary') || !officialBinding(locale, isbn))
      throw Error('CATALOG_INSERT: wrong primary or missing official ISBN binding; correct the card first')
    const figure = work.metadata?.figureBook ?? {}
    if (figure.workTitle && figure.workTitle !== review.workTitle || figure.workCreator && figure.workCreator !== review.workCreator)
      throw Error('CATALOG_INSERT: reviewed original differs from live work anchor')
    if (review.translators !== undefined && (!Array.isArray(review.translators) || review.translators.some(name => !nonempty(name))))
      throw Error('CATALOG_INSERT: explicit translator names must be an array')
    const beforeTranslators = bookTranslatorKey(locale.sources?.translators)
    if ((beforeTranslators || review.translators !== undefined) && bookTranslatorKey(review.translators) !== beforeTranslators)
      throw Error('CATALOG_INSERT: exact verified translators must be preserved; correct the card first')
    if (review.editionKind !== null && !SERVICE_BOOK_EDITION_KINDS.includes(review.editionKind)
      || review.textScope !== null && !nonempty(review.textScope)) throw Error('CATALOG_INSERT: explicit reviewed kind/scope required; unknown must be null')
    const policy = scope => excludedBookEditionReason({ ...locale, title, editionKind: scope.editionKind, textScope: scope.textScope,
      workTitles: [figure.workTitle, figure.originalTitle].filter(Boolean) })
    if (policy(review) || policy({ editionKind: work.metadata?.fictionSource?.editionKind, textScope: work.metadata?.fictionSource?.textScope })
      || figure.editionKind === 'abridged') throw Error('CATALOG_INSERT: excluded or non-start edition must be resolved separately')
    const release = work.release_date ?? ''
    if (/^\d{4}-\d{2}-\d{2}/u.test(release) && !Number.isFinite(Date.parse(release.slice(0, 10)))) throw Error('CATALOG_INSERT: invalid live release date')
    return {
      content_id: review.contentId, locale: review.locale, isbn, title, creator: review.creator,
      publisher: locale.publisher?.trim() || null, description: locale.description ?? null,
      thumbnail_url: locale.thumbnail_url ?? null, release_date: /^\d{4}-\d{2}-\d{2}/u.test(release) ? release.slice(0, 10) : null,
      edition_kind: review.editionKind, text_scope: review.textScope, sort_order: 0, verified: true,
      sources: { ...locale.sources, edition_text_scope_evidence: { isbn, source_url: review.sourceUrl, reason: review.reason } },
    }
  })
  const newParentIds = parentIds.filter(id => !snapshot.figure_book_contents.some(row => row.content_id === id))
  const existingParentIds = parentIds.filter(id => !newParentIds.includes(id))
  for (const id of newParentIds) for (const locale of snapshot.content_locales.filter(row => row.content_id === id)) {
    if (keys.has(JSON.stringify([id, locale.locale]))) continue
    const display = !locale.isbn && locale.sources?.primary === 'none'
      && ['translated', 'romanized', 'original', 'display_only'].includes(locale.sources?.title)
    const excluded = reviewedBookEditionSelectionReason({...locale,title:locale.sources?.edition_title?.trim()||locale.title?.trim()})
    if (!display && !excluded) throw Error('CATALOG_INSERT: unreviewed locale would be automatically seeded; review every real card first')
  }
  return { assigned, parentIds, newParentIds, existingParentIds, editions }
}

export function buildReviewedCatalogInsertSql(workIds, snapshot, reviews) {
  const plan = planReviewedCatalogInsert(workIds, snapshot, reviews)
  const parentStatements = plan.newParentIds.map(id => `INSERT INTO public.figure_book_contents(content_id,created_at,updated_at) VALUES(${sqlLiteral(id)},ts,ts);
expected_parents:=expected_parents||jsonb_build_array(jsonb_build_object('content_id',${sqlLiteral(id)},'created_at',ts,'updated_at',ts));`).join('\n')
  const editionStatements = plan.editions.map(row => `${plan.newParentIds.includes(row.content_id)
    ? `SELECT id INTO STRICT seeded_id FROM public.figure_book_editions
WHERE content_id=${sqlLiteral(row.content_id)} AND locale=${sqlLiteral(row.locale)} AND isbn=${sqlLiteral(row.isbn)};
UPDATE public.figure_book_editions SET title=${sqlLiteral(row.title)},creator=${sqlLiteral(row.creator)},publisher=${nullable(row.publisher)},verified=TRUE,edition_kind=${nullable(row.edition_kind)},text_scope=${nullable(row.text_scope)},sources=${json(row.sources)} WHERE id=seeded_id;`
    : `INSERT INTO public.figure_book_editions(${Object.keys(row).join(',')},created_at,updated_at)
VALUES(${Object.entries(row).map(([key, value]) => key === 'sources' ? json(value) : value === null ? 'NULL' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : sqlLiteral(value)).join(',')},ts,ts) RETURNING id INTO seeded_id;`}
expected_editions:=expected_editions||jsonb_build_array(${json(row)}||jsonb_build_object('id',seeded_id,'created_at',ts,'updated_at',ts));`).join('\n')
  const arrayLocks = [...new Set(['figure_book_editions', 'activity_logs', ...CONTENT_ARRAY_REFERENCES.map(ref => ref.table)])]
  const contentsChildren = REFERENCE_TABLES.map(sqlLiteral).join(',')
  let delimiter = '$reviewed_catalog_insert$'
  for (let n = 1; JSON.stringify({ snapshot, reviews }).includes(delimiter); n++) delimiter = `$reviewed_catalog_insert_${n}$`
  const selection = `SELECT ${sqlLiteral(prefix)}||jsonb_build_object(${SNAPSHOT_TABLES.map(table => `${sqlLiteral(table)},(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.${table} t WHERE ${where(table, plan.assigned)})`).join(',')})::text;`
  return `\\set ON_ERROR_STOP on
\\pset format unaligned
\\pset tuples_only on
BEGIN ISOLATION LEVEL READ COMMITTED;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';
DO ${delimiter} DECLARE ts timestamptz:=now();seeded_id bigint;expected_parents jsonb:=${json(snapshot.figure_book_contents)};expected_editions jsonb:=${json(snapshot.figure_book_editions)};
BEGIN
LOCK TABLE ${arrayLocks.map(table => 'public.' + table).join(',')} IN SHARE ROW EXCLUSIVE MODE;
${SNAPSHOT_TABLES.map(table => `PERFORM 1 FROM public.${table} t WHERE ${where(table, plan.assigned)} ORDER BY to_jsonb(t)::text FOR UPDATE;`).join('\n')}
${SNAPSHOT_TABLES.map(table => aggregateCheck(table, plan.assigned, json(snapshot[table]))).join('\n')}
${plan.newParentIds.length ? "IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.figure_book_contents'::regclass AND tgfoid='public.seed_figure_book_editions()'::regprocedure AND tgtype=5 AND tgenabled IN ('O','A')) THEN RAISE EXCEPTION 'CATALOG_INSERT: active automatic edition seed required';END IF;" : ''}
IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
LEFT JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=c.confkey[1]
WHERE c.contype='f' AND c.confrelid IN ('public.contents'::regclass,'public.figure_book_contents'::regclass,'public.figure_book_editions'::regclass) AND (
n.nspname<>'public' OR cardinality(c.conkey)<>1 OR cardinality(c.confkey)<>1 OR NOT (
c.confrelid='public.contents'::regclass AND r.relname IN (${contentsChildren}) AND a.attname='content_id' AND b.attname='id'
OR c.confrelid='public.figure_book_contents'::regclass AND r.relname IN ('figure_book_characters','figure_book_editions') AND a.attname='content_id' AND b.attname='content_id'
OR c.confrelid='public.figure_book_editions'::regclass AND r.relname='figure_book_products' AND a.attname='edition_id' AND b.attname='id'
))) THEN RAISE EXCEPTION 'CATALOG_INSERT: unhandled foreign reference';END IF;
IF EXISTS(SELECT 1 FROM public.figure_book_editions WHERE isbn IN (${plan.editions.map(row => sqlLiteral(row.isbn)).join(',')}))
OR EXISTS(SELECT 1 FROM public.content_locales WHERE isbn IN (${plan.editions.map(row => sqlLiteral(row.isbn)).join(',')}) AND content_id NOT IN (${plan.parentIds.map(sqlLiteral).join(',')}))
THEN RAISE EXCEPTION 'CATALOG_INSERT: ISBN already registered';END IF;
${parentStatements}
${editionStatements}
${SNAPSHOT_TABLES.map(table => aggregateCheck(table, plan.assigned, table === 'figure_book_contents' ? 'expected_parents' : table === 'figure_book_editions' ? 'expected_editions' : json(snapshot[table]))).join('\n')}
END ${delimiter};
${selection}
COMMIT;SELECT 'MERGE_COMMITTED';`
}

/** Compare all 18 rowsets independently; generated IDs/timestamps are the only new values. */
export function verifyReviewedCatalogInsertReadback(workIds, before, reviews, after) {
  const plan = planReviewedCatalogInsert(workIds, before, reviews); snapshotValid(after)
  const expected = structuredClone(before), parents = []
  for (const id of plan.newParentIds) {
    const rows = after.figure_book_contents.filter(row => row.content_id === id)
    const parent = rows.length === 1 && rows[0]
    if (!parent || typeof parent.created_at !== 'string' || !Number.isFinite(Date.parse(parent.created_at))
      || parent.updated_at !== parent.created_at || parents.length && parent.created_at !== parents[0].created_at)
      throw Error('CATALOG_INSERT_READBACK: parent identity/timestamp mismatch')
    parents.push(parent)
    expected.figure_book_contents.push({ content_id: id, created_at: parent.created_at, updated_at: parent.created_at })
  }
  const generated = new Set()
  let insertionTimestamp = parents[0]?.created_at
  for (const row of plan.editions) {
    const rows = after.figure_book_editions.filter(candidate => candidate.content_id === row.content_id && candidate.locale === row.locale && candidate.isbn === row.isbn)
    const actual = rows.length === 1 && rows[0]
    if (!actual || !Number.isSafeInteger(actual.id) || actual.id < 1 || generated.has(actual.id)
      || before.figure_book_editions.some(edition => edition.id === actual.id)
      || typeof actual.created_at !== 'string' || !Number.isFinite(Date.parse(actual.created_at))
      || insertionTimestamp && actual.created_at !== insertionTimestamp || actual.updated_at !== actual.created_at)
      throw Error('CATALOG_INSERT_READBACK: generated edition identity/timestamp mismatch')
    insertionTimestamp ??= actual.created_at
    generated.add(actual.id)
    expected.figure_book_editions.push({ ...row, id: actual.id, created_at: actual.created_at, updated_at: actual.created_at })
  }
  for (const table of SNAPSHOT_TABLES) if (!isDeepStrictEqual(rowsCanonical(expected[table]), rowsCanonical(after[table])))
    throw Error('CATALOG_INSERT_READBACK: ' + table + ' rows differ')
  return { insertedParents: plan.newParentIds.length, insertedEditions: plan.editions.map(row => ({ contentId: row.content_id, locale: row.locale, isbn: row.isbn,
    id: after.figure_book_editions.find(edition => edition.content_id === row.content_id && edition.locale === row.locale && edition.isbn === row.isbn).id })), checkedTables: SNAPSHOT_TABLES.length }
}

/** Caller owns the mutation lease. Transport failures are never retried automatically. */
export async function applyReviewedCatalogInsert(db, workIds, reviews, {
  capture = captureCatalogRepairSnapshot, execute,
} = {}) {
  const assigned = assignedValid(workIds), before = await capture(db, assigned)
  // 원작 ID를 삭제·이동하지 않는다. 고정 참조의 대상인 기존 BOOK도 그대로 보존한다.
  planReviewedCatalogInsert(assigned, before, reviews)
  const output = await executeTemporaryMergeSql(buildReviewedCatalogInsertSql(assigned, before, reviews), randomUUID(), execute)
  const encoded = String(output).split(/\r?\n/u).find(line => line.trimStart().startsWith(prefix))?.trim()
  if (!encoded || !String(output).split(/\r?\n/u).some(line => line.trim() === 'MERGE_COMMITTED'))
    throw Error('CATALOG_INSERT_READBACK: committed expected snapshot missing; inspect owned IDs before retry')
  const committed = JSON.parse(encoded.slice(prefix.length))
  verifyReviewedCatalogInsertReadback(assigned, before, reviews, committed)
  const after = await capture(db, assigned)
  snapshotValid(after)
  for (const table of SNAPSHOT_TABLES) if (!isDeepStrictEqual(rowsCanonical(committed[table]), rowsCanonical(after[table])))
    throw Error('CATALOG_INSERT_READBACK: actual ' + table + ' rows differ')
  return { completed: true, ...verifyReviewedCatalogInsertReadback(assigned, before, reviews, after) }
}
