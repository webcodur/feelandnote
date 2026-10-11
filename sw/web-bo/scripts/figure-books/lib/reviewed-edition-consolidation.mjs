/** Consolidate source-reviewed products of one original/translation; preserve protected records. */
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { executeTemporaryMergeSql } from '../merge-works.mjs'
import { captureCatalogRepairSnapshot } from './guarded-catalog-repairs.mjs'
import { SNAPSHOT_TABLES, referenceWhere, sqlLiteral } from './merge-work-sql.mjs'
import { CONTENT_ARRAY_REFERENCES } from './content-array-references.mjs'
import { toIsbn13 } from '../../../../../packages/content-search/src/book-isbn.ts'
import { bookTranslatorKey, excludedBookEditionReason } from '../../../../../packages/content-search/src/book-edition-policy.ts'
import { isBookIntroductionSource } from '../../../../../packages/content-search/src/book-introduction-contract.ts'

function publicSource(value, independent = false) {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false
  try {
    const source = new URL(value)
    return source.protocol === 'https:' && !source.username && !source.password
      && (!independent || !/(?:^|\.)openlibrary\.org$|^(?:books\.google\.[a-z.]+|www\.googleapis\.com)$/iu.test(source.hostname.replace(/\.$/u, '')))
      && !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)
      && ![...source.searchParams.keys()].some(key => /(?:api.?key|token|secret|password|authorization)/iu.test(key))
  } catch { return false }
}
function reviewsValid(reviews) {
  if (!Array.isArray(reviews) || !reviews.length || reviews.length > 20) throw Error('EDITION_REVIEW: 1..20 explicit source-reviewed mappings required')
  const kept = new Set(), dropped = new Set(), identities = new Map()
  for (const review of reviews) {
    if (!review || typeof review.contentId !== 'string' || !review.contentId || review.contentId.includes('\0')
      || !['original', 'translation'].includes(review.textIdentity) || typeof review.reason !== 'string' || !review.reason.trim()) throw Error('EDITION_REVIEW: work, text identity and reviewed reason required')
    if (review.dropContentId !== undefined && (typeof review.dropContentId !== 'string' || !review.dropContentId || review.dropContentId.includes('\0'))) throw Error('EDITION_REVIEW: explicit drop owner required')
    for (const id of [review.keepEditionId, review.dropEditionId]) {
      if (!/^\d+$/u.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw Error('EDITION_REVIEW: edition IDs must be positive and mutually distinct')
    }
    const keepId=String(review.keepEditionId),dropId=String(review.dropEditionId)
    if(dropped.has(dropId)||identities.has(keepId)&&identities.get(keepId)!==review.textIdentity)throw Error('EDITION_REVIEW: edition IDs must be positive and mutually distinct with one text identity per representative')
    kept.add(keepId);dropped.add(dropId);identities.set(keepId,review.textIdentity)
    if (!publicSource(review.sourceUrl, true)) throw Error('EDITION_REVIEW: independent public HTTPS source required')
  }
  if([...kept].some(id=>dropped.has(id)))throw Error('EDITION_REVIEW: edition IDs must be positive and mutually distinct; a representative cannot also be removed')
  return [...new Set(reviews.flatMap(review => [review.contentId, review.dropContentId ?? review.contentId]))]
}
function snapshotValid(snapshot) {
  for (const table of SNAPSHOT_TABLES) if (!Array.isArray(snapshot?.[table])) throw Error('EDITION_REVIEW: missing snapshot ' + table)
}
const descriptionSource = row => row.sources && typeof row.sources === 'object' ? row.sources.description : undefined
function reviewedRepresentativeIntroduction(review, keep, drop) {
  const proof = review.reviewedRepresentativeIntroduction
  if (proof === undefined) return null
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)
    || proof.method !== 'independent_representative_introduction' || proof.locale !== keep.locale
    || !isDeepStrictEqual(proof.keepBeforeDescription, keep.description ?? null)
    || !isDeepStrictEqual(proof.dropBeforeDescription, drop.description ?? null)
    || !isDeepStrictEqual(proof.keepBeforeSource, descriptionSource(keep) ?? null)
    || !isDeepStrictEqual(proof.dropBeforeSource, descriptionSource(drop) ?? null)
    || typeof keep.description !== 'string' || keep.description.trim().length < 30 || isBookIntroductionSource(keep.description)
    || !publicSource(descriptionSource(keep))
    || !publicSource(proof.keepSourceUrl, true) || !publicSource(proof.dropSourceUrl, true)
    || proof.keepSourceUrl === proof.dropSourceUrl
    || typeof proof.reason !== 'string' || proof.reason.trim().length < 20)
    throw Error('EDITION_REVIEW: representative introduction requires exact current prose and sources, both independent ISBN sources and explicit selection')
  return proof
}
function reviewedScopeEquivalence(review,keep,drop,crossWork){
  const proof=review.reviewedScopeEquivalence
  if(proof===undefined)return null
  if(!proof||typeof proof!=='object'||Array.isArray(proof)||crossWork
    ||proof.method!=='independent_same_body_scope'
    ||!isDeepStrictEqual(proof.keepBeforeEditionKind,keep.edition_kind??null)||!isDeepStrictEqual(proof.dropBeforeEditionKind,drop.edition_kind??null)
    ||!isDeepStrictEqual(proof.keepBeforeTextScope,keep.text_scope??null)||!isDeepStrictEqual(proof.dropBeforeTextScope,drop.text_scope??null)
    ||!publicSource(proof.keepSourceUrl,true)||!publicSource(proof.dropSourceUrl,true)||proof.keepSourceUrl===proof.dropSourceUrl
    ||typeof proof.reason!=='string'||proof.reason.trim().length<20)
    throw Error('EDITION_REVIEW: scope equivalence requires exact existing scopes and both independent ISBN body sources')
  return proof
}
// 공동 역자 일부만 복사된 옛 행은 두 실물 ISBN의 역할을 읽은 명시 보완으로만 정리한다.
function reviewedTranslatorCompletion(review,keep,drop){
  const proof=review.reviewedTranslatorCompletion
  if(proof===undefined)return null
  if(!proof||typeof proof!=='object'||Array.isArray(proof))throw Error('EDITION_REVIEW: invalid translator completion')
  const credit=row=>row.sources?.translators??row.translators??row.translator??null
  const names=value=>(typeof value==='string'?value.split(/[,;·]/u):Array.isArray(value)?value:[]).map(name=>bookTranslatorKey([name])).filter(Boolean)
  const complete=names(proof.translators),known=[...names(credit(keep)),...names(credit(drop))]
  if(review.textIdentity!=='translation'||proof.method!=='independent_translator_completion'
    ||!Array.isArray(proof.translators)||!complete.length||complete.length!==proof.translators.length||new Set(complete).size!==complete.length
    ||!isDeepStrictEqual(proof.keepBeforeTranslators,credit(keep))||!isDeepStrictEqual(proof.dropBeforeTranslators,credit(drop))
    ||!publicSource(proof.keepSourceUrl,true)||!publicSource(proof.dropSourceUrl,true)||proof.keepSourceUrl===proof.dropSourceUrl
    ||typeof proof.reason!=='string'||proof.reason.trim().length<20||known.some(name=>!complete.includes(name)))
    throw Error('EDITION_REVIEW: translator completion requires exact prior credits, both independent ISBN sources and no conflicting credited translator')
  return proof
}
function introRetained(drop, survivors, snapshot, crossWork = false) {
  if (!String(drop.description ?? '').trim() || isBookIntroductionSource(drop.description)) return true
  const origin = snapshot.contents.find(row => row.id === drop.content_id)
  const confirmedOriginal = publicSource(origin?.metadata?.figureBook?.identityEvidence)
    || survivors.some(row => row.content_id === drop.content_id && typeof row.isbn === 'string' && toIsbn13(row.isbn))
  return survivors.some(row => row.content_id === drop.content_id && row.locale === drop.locale
    && (row.sources?.primary !== 'none' && typeof row.isbn === 'string' && toIsbn13(row.isbn)
      || crossWork && confirmedOriginal && publicSource(descriptionSource(row)))
    && row.description === drop.description
    && (!descriptionSource(drop) || isDeepStrictEqual(descriptionSource(row), descriptionSource(drop))))
}
export function planReviewedEditionConsolidation(snapshot, reviews) {
  const assigned = reviewsValid(reviews); snapshotValid(snapshot)
  const expected = structuredClone(snapshot), changed = new Map(), retained = [], removed = new Set(reviews.map(review => String(review.dropEditionId)))
  for (const review of reviews) {
    const work = snapshot.contents.find(row => row.id === review.contentId && row.type === 'BOOK')
    const dropOwner = review.dropContentId ?? review.contentId
    const origin = snapshot.contents.find(row => row.id === dropOwner && row.type === 'BOOK')
    const crossWork = dropOwner !== review.contentId
    const keep = snapshot.figure_book_editions.find(row => String(row.id) === String(review.keepEditionId))
    const drop = snapshot.figure_book_editions.find(row => String(row.id) === String(review.dropEditionId))
    if (!work || !origin || !keep || !drop || keep.content_id !== review.contentId || drop.content_id !== dropOwner
      || keep.locale !== drop.locale || keep.locale !== review.locale) throw Error('EDITION_REVIEW: live owner/locale/edition mismatch')
    if (typeof review.keepIsbn !== 'string' || typeof review.dropIsbn !== 'string'
      || !toIsbn13(review.keepIsbn) || !toIsbn13(review.dropIsbn)
      || toIsbn13(review.keepIsbn) !== toIsbn13(keep.isbn ?? '') || toIsbn13(review.dropIsbn) !== toIsbn13(drop.isbn ?? '')) throw Error('EDITION_REVIEW: live ISBN changed or invalid')
    const attribution = review.workAttribution
    if (crossWork && (!attribution || attribution.method !== 'independent_work_review'
      || attribution.content_id !== review.contentId || typeof work.metadata?.figureBook?.workIdentity !== 'string'
      || !work.metadata.figureBook.workIdentity || attribution.work_identity !== work.metadata.figureBook.workIdentity
      || typeof attribution.isbn !== 'string' || toIsbn13(attribution.isbn) !== toIsbn13(drop.isbn ?? '')
      || attribution.locale !== drop.locale || attribution.edition_title !== drop.title || attribution.edition_creator !== drop.creator
      || !publicSource(attribution.source_url, true) || typeof attribution.explanation !== 'string' || !attribution.explanation.trim())) throw Error('EDITION_REVIEW: cross-work move requires exact independent work attribution')
    const scopeEquivalence=reviewedScopeEquivalence(review,keep,drop,crossWork)
    const effectiveDrop = { ...drop }
    for (const key of ['edition_kind', 'text_scope']) {
      if (keep[key] && drop[key] && keep[key] !== drop[key] || crossWork && drop[key] && drop[key] !== keep[key]) {
        if(scopeEquivalence){effectiveDrop[key]=keep[key];continue}
        if (!crossWork || !Object.hasOwn(attribution, 'before_' + key) || attribution['before_' + key] !== drop[key]
          || !Object.hasOwn(attribution, key) || attribution[key] !== keep[key]) throw Error('EDITION_REVIEW: known text scope conflict')
        effectiveDrop[key] = attribution[key]
      } else if (crossWork && Object.hasOwn(attribution, key) && attribution[key] !== keep[key]) throw Error('EDITION_REVIEW: attribution scope differs from selected edition')
    }
    const policy = row => excludedBookEditionReason({ ...row, editionKind: row.edition_kind, textScope: row.text_scope })
    if (policy(keep) || policy(effectiveDrop) || scopeEquivalence&&policy(drop)) throw Error('EDITION_REVIEW: excluded edition must be corrected separately')
    const translator = row => bookTranslatorKey(row.sources?.translators ?? row.translators ?? row.translator)
    const a = translator(keep), b = translator(drop)
    const completion=reviewedTranslatorCompletion(review,keep,drop)
    if (!completion&&a && b && a !== b || review.textIdentity === 'original' && (a || b)) throw Error('EDITION_REVIEW: known translator conflict')
    const introductionSelection = reviewedRepresentativeIntroduction(review, keep, drop)
    retained.push({ review, work, keep, drop, crossWork,completion,scopeEquivalence,introductionSelection })
  }
  const survivors = [...snapshot.content_locales, ...snapshot.figure_book_editions.filter(row => !removed.has(String(row.id)))]
  for (const { review, work, keep, drop, crossWork,completion,scopeEquivalence,introductionSelection } of retained) {
    if (!introductionSelection && !introRetained(drop, survivors, snapshot, crossWork)) throw Error('EDITION_REVIEW: preserve exact introduction and its source in a surviving real same-locale row first')
    const canonical = expected.figure_book_editions.find(row => String(row.id) === String(keep.id))
    const figure = work.metadata?.figureBook ?? {}, sources = canonical.sources && typeof canonical.sources === 'object' && !Array.isArray(canonical.sources) ? canonical.sources : {}
    const accumulatedTranslator=bookTranslatorKey(sources.translators),dropTranslator=bookTranslatorKey(drop.sources?.translators)
    if(completion){
      const earlier=retained.filter(item=>String(item.keep.id)===String(keep.id)&&item.completion)
      if(earlier.some(item=>bookTranslatorKey(item.completion.translators)!==bookTranslatorKey(completion.translators)))throw Error('EDITION_REVIEW: translator completion conflicts across mappings')
    }else if(accumulatedTranslator&&dropTranslator&&accumulatedTranslator!==dropTranslator)throw Error('EDITION_REVIEW: known translator conflict across mappings to one representative')
    if (sources.edition_work_evidence != null && !Array.isArray(sources.edition_work_evidence)) throw Error('EDITION_REVIEW: correct malformed canonical work evidence before consolidation')
    const proof = { method: 'independent_work_review', content_id: review.contentId, isbn: keep.isbn, locale: keep.locale,
      edition_title: keep.title, edition_creator: keep.creator, edition_kind: keep.edition_kind, text_scope: keep.text_scope,
      ...(typeof figure.workIdentity === 'string' && figure.workIdentity ? { work_identity: figure.workIdentity } : {}),
      // "same original text" does not establish its language (bilingual commentaries exist).
      ...(review.textIdentity === 'original' && figure.originalLanguage === keep.locale && /^https:\/\//u.test(figure.identityEvidence ?? '') ? { original_language: figure.originalLanguage } : {}),
      source_url: review.sourceUrl, explanation: review.reason, text_identity: review.textIdentity,
      ...(scopeEquivalence?{scope_source_urls:[scopeEquivalence.keepSourceUrl,scopeEquivalence.dropSourceUrl],scope_explanation:scopeEquivalence.reason}:{}),
      ...(completion?{translators:structuredClone(completion.translators),translator_source_urls:[completion.keepSourceUrl,completion.dropSourceUrl]}:{}),
      ...(introductionSelection ? { introduction_source_url: descriptionSource(keep), introduction_selection_reason: introductionSelection.reason } : {}) }
    const evidence = Array.isArray(sources.edition_work_evidence) ? sources.edition_work_evidence : []
    canonical.sources = { ...sources,
      ...(completion?{translators:structuredClone(completion.translators)}:{}),
      // A confirmed identical translation carries its known credits into an empty canonical slot.
      ...(!completion&&review.textIdentity === 'translation' && !bookTranslatorKey(sources.translators) && bookTranslatorKey(drop.sources?.translators) ? { translators: structuredClone(drop.sources.translators) } : {}),
      edition_work_evidence: evidence.some(row => isDeepStrictEqual(row, proof)) ? evidence : [...evidence, proof] }
    const editionKeys = changed.get('figure_book_editions') ?? new Set(); editionKeys.add(String(keep.id)); changed.set('figure_book_editions', editionKeys)
    const productKeys = changed.get('figure_book_products') ?? new Set()
    for (const product of expected.figure_book_products.filter(row => String(row.edition_id) === String(drop.id))) {
      if (product.is_active && expected.figure_book_products.some(row => String(row.edition_id) === String(keep.id) && row.platform === product.platform && row.is_active)) product.is_active = false
      product.edition_id = keep.id; productKeys.add(String(product.id))
    }
    if (productKeys.size) changed.set('figure_book_products', productKeys)
  }
  expected.figure_book_editions = expected.figure_book_editions.filter(row => !removed.has(String(row.id)))
  return { assigned, expected, changed, mappings: retained.map(({ review }) => review) }
}
const json = value => sqlLiteral(JSON.stringify(value)) + '::jsonb'
const where = (table, assigned, alias = '') => assigned.map(id => '(' + referenceWhere(table, sqlLiteral(id), sqlLiteral(id), alias) + ')').join(' OR ')
function normalized(table, row, changed) { if (!changed?.get(table)?.has(String(row.id))) return row; const copy = { ...row }; delete copy.updated_at; return copy }
function rowsetCheck(table, assigned, rows, changed) {
  const ids = [...(changed?.get(table) ?? [])]
  const expression = ids.length ? `CASE WHEN t.id::text IN (${ids.map(sqlLiteral).join(',')}) THEN to_jsonb(t)-'updated_at' ELSE to_jsonb(t) END` : 'to_jsonb(t)'
  return `IF (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM (SELECT ${expression} v FROM public.${table} t WHERE ${where(table, assigned, 't')}) a) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM jsonb_array_elements(${json(rows.map(row => normalized(table, row, changed)))}) v) THEN RAISE EXCEPTION 'EDITION_REVIEW: rowset mismatch in ${table}'; END IF;`
}
export function buildReviewedEditionConsolidationSql(snapshot, reviews) {
  const plan = planReviewedEditionConsolidation(snapshot, reviews), raw = JSON.stringify({ snapshot, reviews })
  let delimiter = '$edition_consolidation$'; for (let n = 1; raw.includes(delimiter); n++) delimiter = `$edition_consolidation_${n}$`
  // READ COMMITTED is required by the live identity-change guard. Product table lock also blocks
  // new history rows/activation races while the exact full18 pre/post rowsets are checked.
  const tableLocks = [...new Set(['figure_book_products', 'activity_logs', ...CONTENT_ARRAY_REFERENCES.map(ref => ref.table)])]
  const productMoves = plan.mappings.map(review => {
    return `UPDATE public.figure_book_products p SET is_active=false WHERE p.edition_id=${Number(review.dropEditionId)} AND p.is_active AND EXISTS(SELECT 1 FROM public.figure_book_products q WHERE q.edition_id=${Number(review.keepEditionId)} AND q.platform=p.platform AND q.is_active);
UPDATE public.figure_book_products SET edition_id=${Number(review.keepEditionId)} WHERE edition_id=${Number(review.dropEditionId)};`
  }).join('\n')
  // All reviewed duplicates must be gone before the canonical UPDATE invokes the live uniqueness guard.
  const removals=plan.mappings.map(review=>`DELETE FROM public.figure_book_editions WHERE id=${Number(review.dropEditionId)};`).join('\n')
  const canonicalUpdates=[...new Set(plan.mappings.map(review=>String(review.keepEditionId)))].map(id=>{
    const keep=plan.expected.figure_book_editions.find(row=>String(row.id)===id)
    return `UPDATE public.figure_book_editions SET sources=${json(keep.sources)} WHERE id=${Number(id)};`
  }).join('\n')
  const statements=[productMoves,removals,canonicalUpdates].join('\n')
  return `\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';
DO ${delimiter} BEGIN
LOCK TABLE ${tableLocks.map(table => 'public.' + table).join(',')} IN SHARE ROW EXCLUSIVE MODE;
${SNAPSHOT_TABLES.map(table => `PERFORM 1 FROM public.${table} t WHERE ${where(table, plan.assigned, 't')} ORDER BY to_jsonb(t)::text FOR UPDATE;`).join('\n')}
${SNAPSHOT_TABLES.map(table => rowsetCheck(table, plan.assigned, snapshot[table])).join('\n')}
IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
 LEFT JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=c.confkey[1]
 WHERE c.contype='f' AND c.confrelid='public.figure_book_editions'::regclass AND
 (n.nspname<>'public' OR r.relname<>'figure_book_products' OR cardinality(c.conkey)<>1 OR cardinality(c.confkey)<>1 OR a.attname IS DISTINCT FROM 'edition_id' OR b.attname IS DISTINCT FROM 'id')) THEN RAISE EXCEPTION 'EDITION_REVIEW: unhandled edition foreign reference'; END IF;
${statements}
${SNAPSHOT_TABLES.map(table => rowsetCheck(table, plan.assigned, plan.expected[table], plan.changed)).join('\n')}
END ${delimiter}; COMMIT; SELECT 'MERGE_COMMITTED';`
}
export async function applyReviewedEditionConsolidation(db, reviews, { capture = captureCatalogRepairSnapshot, execute } = {}) {
  const assigned = reviewsValid(reviews), before = await capture(db, assigned), plan = planReviewedEditionConsolidation(before, reviews)
  executeTemporaryMergeSql(buildReviewedEditionConsolidationSql(before, reviews), randomUUID(), execute)
  const actual = await capture(db, assigned); snapshotValid(actual)
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value
  const canonical = (table, rows) => rows.map(row => JSON.stringify(stable(normalized(table, row, plan.changed)))).sort()
  for (const table of SNAPSHOT_TABLES) if (!isDeepStrictEqual(canonical(table, plan.expected[table]), canonical(table, actual[table]))) throw Error('EDITION_REVIEW: readback mismatch in ' + table)
  return { completed: true, consolidated: reviews.length, removed: reviews.length, productsMoved: before.figure_book_products.filter(row => reviews.some(review => String(review.dropEditionId) === String(row.edition_id))).length, checkedTables: SNAPSHOT_TABLES.length }
}
