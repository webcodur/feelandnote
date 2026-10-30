/** 작품 통합은 한 PostgreSQL transaction에서만 실행한다. 충돌은 전체 pair를 되돌린다. */
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { bookEditionTranslationKey, excludedBookEditionReason, reviewedBookEditionSelectionReason, BOOK_EDITION_WORK_BOUND_SELECTION_REASONS } from '@feelandnote/content-search/book-edition-policy'
import { isOriginalEdition } from './edition-translation-policy.mjs'
import { CONTENT_ARRAY_REFERENCES } from './content-array-references.mjs'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { isDeepStrictEqual } from 'node:util'
export const REFERENCE_TABLES = ['content_locales', 'figure_book_contents', 'figure_book_characters', 'figure_book_editions', 'member_contents', 'celeb_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs', 'commerce_events', 'profession_book_picks']
const arrayReferences = table => CONTENT_ARRAY_REFERENCES.filter(ref => ref.table === table)
const rankedReferences = CONTENT_ARRAY_REFERENCES.filter(ref => ref.shape === 'tiers')
export const ARRAY_REFERENCE_TABLES = [...new Set(CONTENT_ARRAY_REFERENCES.map(ref => ref.table))].filter(table => !REFERENCE_TABLES.includes(table))
export const SNAPSHOT_TABLES = ['contents', ...REFERENCE_TABLES, 'figure_book_products', ...ARRAY_REFERENCE_TABLES]
export function hasArrayReference(table, row, id) {
  return arrayReferences(table).some(ref => ref.shape === 'tiers'
    ? Object.values(row[ref.column] ?? {}).some(ids => Array.isArray(ids) && ids.includes(id))
    : Array.isArray(row[ref.column]) && row[ref.column].includes(id))
}
function arrayReferenceWhere(ref, id, prefix = '') {
  const column = `${prefix}${ref.column}`
  if (ref.shape === 'tiers') return `jsonb_path_exists(${column}, '$.*[*] ? (@ == $drop)', jsonb_build_object('drop', ${id}))`
  return ref.storage === 'text[]' ? `${id} = ANY(${column})` : `${column} @> jsonb_build_array(${id})`
}
export function referenceWhere(table, k, d, alias = '') {
  const p = alias ? `${alias}.` : ''
  if (table === 'contents') return `${p}id IN (${k}, ${d})`
  if (table === 'figure_book_products') return `${p}edition_id IN (SELECT id FROM public.figure_book_editions WHERE content_id IN (${k}, ${d}))`
  const predicates = arrayReferences(table).map(ref => arrayReferenceWhere(ref, d, p))
  if (REFERENCE_TABLES.includes(table)) predicates.unshift(`${p}content_id IN (${k}, ${d})`)
  return predicates.length > 1 ? `(${predicates.join(' OR ')})` : predicates[0]
}
function rankGroupsSql(table, column) {
  return `coalesce(t.${column},'{}'::jsonb)` + arrayReferences(table).filter(ref => ref.shape === 'array')
    .map(ref => ` || jsonb_build_object('${ref.column}',coalesce(to_jsonb(t.${ref.column}),'[]'::jsonb))`).join('')
}
function arrayUpdateSql(ref) {
  const column = `t.${ref.column}`
  const mapped = 'CASE WHEN entry.id=drop_id THEN keep_id ELSE entry.id END'
  const grouping = `${mapped}${ref.table === 'faction_lv2' ? '' : ', CASE WHEN entry.id IN (keep_id,drop_id) THEN 0 ELSE entry.position END'}`
  const entries = source => `SELECT ${mapped} AS mapped_id,min(entry.position) AS first_position FROM ${source} WITH ORDINALITY entry(id,position) GROUP BY ${grouping}`
  const jsonArray = source => `(SELECT coalesce(jsonb_agg(to_jsonb(mapped_id) ORDER BY first_position),'[]'::jsonb) FROM (${entries(source)}) ids)`
  const value = ref.shape === 'tiers'
    ? `(SELECT jsonb_object_agg(tier.key,${jsonArray('jsonb_array_elements_text(tier.value)')}) FROM jsonb_each(${column}) tier)`
    : ref.storage === 'text[]'
      ? `(SELECT array_agg(mapped_id ORDER BY first_position) FROM (${entries(`unnest(${column})`)}) ids)`
      : jsonArray(`jsonb_array_elements_text(${column})`)
  return `UPDATE public.${ref.table} t SET ${ref.column}=${value} WHERE ${arrayReferenceWhere(ref, 'drop_id', 't.')};`
}
export function sqlLiteral(value) {
  if (typeof value !== 'string' || value.includes('\0')) throw new Error('SQL 문자열이 잘못됐습니다.')
  return "E'" + value.replaceAll('\\', '\\\\').replaceAll("'", "''") + "'"
}
export function validatePair(pair) {
  if (!pair || typeof pair.keep !== 'string' || typeof pair.drop !== 'string' || !pair.keep || !pair.drop || pair.keep === pair.drop) throw new Error('서로 다른 keep/drop 작품 ID가 필요합니다.')
}
function unrepresentedExternalIsbn(snapshot, pair) {
  const drop = snapshot.contents?.find(row => row.id === pair.drop), isbn = toIsbn13(drop?.external_id ?? '')
  return isbn && ![...(snapshot.content_locales ?? []), ...(snapshot.figure_book_editions ?? [])].some(row => toIsbn13(row.isbn ?? '') === isbn) ? isbn : null
}
const displayIsbn = snapshot => (snapshot.content_locales ?? []).some(row => row.isbn
  && row.sources?.primary === 'none' && ['translated','romanized','original'].includes(row.sources?.title))
function unrepresentedEnglishKakaoIsbn(snapshot) {
  const locales = snapshot.content_locales ?? [], editions = snapshot.figure_book_editions ?? []
  return locales.some(row => {
    const isbn = toIsbn13(row.isbn ?? '')
    return row.locale === 'en' && row.sources?.primary === 'kakao_book' && isbn
      && !editions.some(edition => toIsbn13(edition.isbn ?? '') === isbn)
      && !locales.some(other => other !== row && toIsbn13(other.isbn ?? '') === isbn
        && !(other.locale === 'en' && other.sources?.primary === 'kakao_book'))
  })
}
export function findConflicts(snapshot, pair) {
  validatePair(pair)
  const removedCurations = new Set(validateReviewedInvalidCurationRemovals(pair, snapshot, pair.reviewedInvalidCurationRemovals ?? []).map(row => row.id))
  const curationResolutions = validateReviewedCurationResolutions(pair, snapshot, pair.reviewedCurationResolutions ?? [])
  if (curationResolutions.some(review => [review.keep.id,review.drop.id].some(id => removedCurations.has(id)))) throw Error('MERGE_REVIEW: curation resolution/removal overlap')
  if (displayIsbn(snapshot)) return 'display-title-isbn-needs-review'
  if (unrepresentedEnglishKakaoIsbn(snapshot)) return 'english-kakao-isbn-needs-review'
  if (unrepresentedExternalIsbn(snapshot, pair)) return 'external-isbn-edition-needs-review'
  const rows = table => (snapshot[table] ?? []).filter(row => table !== 'celeb_contents' || (!removedCurations.has(row.id)
    && !curationResolutions.some(review => review.removePrivateDuplicate && review.drop.id === row.id))).map(row => {
    const review = table === 'celeb_contents' && curationResolutions.find(review => review.keep.id === row.id || review.drop.id === row.id)
    return review ? { ...row, ...review.patch } : row
  })
  const duplicates = (table, key) => rows(table).filter(row => row.content_id === pair.drop).flatMap(drop => rows(table).filter(keep => keep.content_id === pair.keep && keep[key] === drop[key]).map(keep => ({ keep, drop })))
  if (duplicates('member_contents', 'member_id').length) return 'member-duplicate-needs-review'
  for (const { keep, drop } of duplicates('celeb_contents', 'celeb_id')) {
    for (const key of new Set([...Object.keys(keep), ...Object.keys(drop)])) {
      if (['id', 'content_id', 'created_at', 'updated_at'].includes(key)) continue
      const a = keep[key], b = drop[key]
      const filled = value => value !== null && value !== undefined && value !== ''
      if (JSON.stringify(a) !== JSON.stringify(b) && (!['review', 'review_en', 'source_url'].includes(key) || (filled(a) && filled(b)))) return `celeb-${key}-needs-review`
    }
  }
  // 큐레이션 목록은 같은 작품의 개별 선정 행을 허용한다. 원행은 합치거나 삭제하지 않는다.
  for (const { table, column } of rankedReferences) for (const row of rows(table)) {
    const groups = Object.entries(row[column] ?? {})
    for (const ref of arrayReferences(table).filter(ref => ref.shape === 'array')) groups.push([ref.column, row[ref.column] ?? []])
    const keepGroups = groups.filter(([, ids]) => Array.isArray(ids) && ids.includes(pair.keep)).map(([name]) => name)
    const dropGroups = groups.filter(([, ids]) => Array.isArray(ids) && ids.includes(pair.drop)).map(([name]) => name)
    if (keepGroups.some(name => dropGroups.some(other => name !== other))) return `${table}-rank-needs-review`
  }
  for (const { keep, drop } of duplicates('figure_book_characters', 'celeb_id')) {
    for (const key of ['description', 'description_en']) if (keep[key] && drop[key] && keep[key] !== drop[key]) return `character-${key}-needs-review`
  }
  for (const drop of rows('figure_book_editions').filter(row => row.content_id === pair.drop && row.isbn != null)) {
    const keep = rows('figure_book_editions').find(row => row.content_id === pair.keep && row.locale === drop.locale && row.isbn === drop.isbn)
    for (const key of ['edition_kind', 'text_scope']) if (keep?.[key] && drop[key] && keep[key] !== drop[key]) return `edition-${key}-needs-review`
  }
  return null
}

/** LLM-reviewed equivalence is explicit and bound to the current pair's exact editions and ISBNs. */
export function validateReviewedEditionMappings(pair, snapshot, mappings = []) {
  validatePair(pair)
  if (!Array.isArray(mappings)) throw Error('MERGE_REVIEW: reviewedEditionMappings must be an array')
  const seen = new Set()
  return mappings.map(mapping => {
    if (!mapping || !Number.isSafeInteger(Number(mapping.keepEditionId)) || Number(mapping.keepEditionId) < 1
      || !Number.isSafeInteger(Number(mapping.dropEditionId)) || Number(mapping.dropEditionId) < 1
      || !/^\d+$/u.test(String(mapping.keepEditionId)) || !/^\d+$/u.test(String(mapping.dropEditionId))) throw Error('MERGE_REVIEW: reviewed edition IDs must be positive safe integers')
    const keep = snapshot.figure_book_editions.find(row => String(row.id) === String(mapping.keepEditionId))
    const drop = snapshot.figure_book_editions.find(row => String(row.id) === String(mapping.dropEditionId))
    if (!keep || !drop || keep.content_id !== pair.keep || drop.content_id !== pair.drop || keep.locale !== drop.locale
      || mapping.locale !== keep.locale || seen.has(String(drop.id))) throw Error('MERGE_REVIEW: reviewed edition mapping owner/locale/duplicate mismatch')
    seen.add(String(drop.id))
    const keepIsbn = toIsbn13(mapping.keepIsbn ?? ''), dropIsbn = toIsbn13(mapping.dropIsbn ?? '')
    if (!keepIsbn || !dropIsbn || keepIsbn !== toIsbn13(keep.isbn ?? '') || dropIsbn !== toIsbn13(drop.isbn ?? '')) throw Error('MERGE_REVIEW: reviewed edition mapping ISBN changed or missing')
    let source
    try { source = new URL(mapping.sourceUrl) } catch { throw Error('MERGE_REVIEW: reviewed edition mapping requires an independent HTTPS source') }
    if (typeof mapping.sourceUrl !== 'string' || source.protocol !== 'https:' || source.username || source.password
      || /(?:^|\.)openlibrary\.org$/iu.test(source.hostname) || typeof mapping.reason !== 'string' || !mapping.reason.trim()) throw Error('MERGE_REVIEW: reviewed edition mapping requires independent HTTPS source and reviewed reason')
    const policyInput = row => ({ ...row, editionKind: row.edition_kind, textScope: row.text_scope })
    if ([keep, drop].some(row => excludedBookEditionReason(policyInput(row)))) throw Error('MERGE_REVIEW: excluded edition cannot be mapped as an equivalent')
    const keepTranslation = bookEditionTranslationKey(keep), dropTranslation = bookEditionTranslationKey(drop)
    if (keepTranslation && dropTranslation && keepTranslation !== dropTranslation) throw Error('MERGE_REVIEW: different verified translators cannot be mapped as equivalent')
    for (const field of ['edition_kind', 'text_scope']) if (keep[field] && drop[field] && keep[field] !== drop[field]) throw Error('MERGE_REVIEW: reviewed edition scope conflict')
    if (String(drop.description ?? '').trim() && (drop.description !== keep.description
      || (isBookIntroductionSource(drop.description) && drop.sources?.description !== keep.sources?.description))) throw Error('MERGE_REVIEW: preserve the duplicate edition introduction before reviewed mapping')
    return { drop: drop.id, keep: keep.id }
  })
}

/** Later parts are removed, never represented as equivalent copies of the first part. */
export function validateReviewedNonstartEditionRemovals(pair, snapshot, removals = []) {
  validatePair(pair)
  if (!Array.isArray(removals)) throw Error('MERGE_REVIEW: reviewedNonstartEditionRemovals must be an array')
  const seen = new Set()
  return removals.map(review => {
    if (![review?.keepEditionId, review?.dropEditionId].every(id => /^\d+$/u.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 0)) throw Error('MERGE_REVIEW: nonstart edition IDs must be positive safe integers')
    const keep = snapshot.figure_book_editions.find(row => String(row.id) === String(review?.keepEditionId))
    const drop = snapshot.figure_book_editions.find(row => String(row.id) === String(review?.dropEditionId))
    if (!keep || !drop || keep.content_id !== pair.keep || drop.content_id !== pair.drop
      || keep.locale !== drop.locale || review.locale !== keep.locale || seen.has(String(drop.id))) throw Error('MERGE_REVIEW: nonstart owner/locale/duplicate mismatch')
    seen.add(String(drop.id))
    if (!toIsbn13(review.keepIsbn ?? '') || !toIsbn13(review.dropIsbn ?? '')
      || toIsbn13(review.keepIsbn) !== toIsbn13(keep.isbn ?? '') || toIsbn13(review.dropIsbn) !== toIsbn13(drop.isbn ?? '')
      || review.keepTitle !== keep.title || review.dropTitle !== drop.title) throw Error('MERGE_REVIEW: nonstart ISBN/title changed or missing')
    if (!Number.isSafeInteger(review.volumeNumber) || review.volumeNumber < 2 || review.volumeNumber > 999
      || typeof review.reason !== 'string' || review.reason.trim().length < 20) throw Error('MERGE_REVIEW: nonstart requires reviewed continuous-body reason and part number')
    for (const value of [review.sourceUrl, review.startSourceUrl]) {
      let source
      try { source = new URL(value) } catch { throw Error('MERGE_REVIEW: nonstart requires independent HTTPS sources for both parts') }
      if (typeof value !== 'string' || source.protocol !== 'https:' || source.username || source.password
        || /(?:^|\.)openlibrary\.org\.?$/iu.test(source.hostname)) throw Error('MERGE_REVIEW: nonstart requires independent HTTPS sources for both parts')
    }
    const reviewedCombinedStart = review.startTextScope === keep.text_scope && typeof keep.text_scope === 'string' && !!keep.text_scope.trim()
      && Array.isArray(review.startVolumeNumbers) && review.startVolumeNumbers.length >= 2 && review.startVolumeNumbers.length <= 999
      && review.startVolumeNumbers.every((number,index) => Number.isSafeInteger(number) && number === index + 1)
    let unselectedStart=false
    if(review.unselectedTranslationStartReview!==undefined){
      const proof=review.unselectedTranslationStartReview,text=value=>typeof value==='string'&&value.trim().length>=20
      const keepWork=snapshot.contents.find(row=>row.id===pair.keep),dropWork=snapshot.contents.find(row=>row.id===pair.drop)
      const anchor=work=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work?.metadata?.figureBook?.[key]??null]))
      const cards=snapshot.content_locales.filter(row=>row.content_id===pair.keep&&row.locale===keep.locale),card=cards.length===1&&cards[0]
      const selected=snapshot.figure_book_editions.find(row=>row.content_id===pair.keep&&row.locale===keep.locale&&row.isbn===card?.isbn)
      const known=row=>Array.isArray(row?.sources?.translators)&&row.sources.translators.length&&row.sources.translators.every(name=>typeof name==='string'&&name.trim())&&bookEditionTranslationKey(row)
      const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value
      const sameRows=(a,b)=>Array.isArray(a)&&isDeepStrictEqual(a.map(row=>JSON.stringify(stable(row))).sort(),b.map(row=>JSON.stringify(stable(row))).sort())
      const parts=value=>Array.isArray(value)&&value.length>=1&&value.length<=999&&value.every((part,index)=>Number.isSafeInteger(part)&&part===index+1)
      const independent=value=>{try{const url=new URL(value);return typeof value==='string'&&url.protocol==='https:'&&!url.username&&!url.password
        &&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!/(?:^|\.)(?:openlibrary\.org|books\.google\.[a-z.]+|googleapis\.com)$/iu.test(url.hostname)
        &&![...url.searchParams.keys()].some(key=>/(?:api.?key|token|secret|password|authorization)/iu.test(key))}catch{return false}}
      const sourceValid=(source,row,url,numbers)=>source?.llmReviewed===true&&source.contentId===row.content_id&&source.isbn===row.isbn
        &&source.locale===row.locale&&source.editionTitle===row.title&&source.editionCreator===row.creator
        &&source.editionKind===(row.edition_kind??null)&&source.textScope===(row.text_scope??null)&&source.sourceUrl===url&&independent(url)
        &&source.creditedOriginalCreator===keepWork?.metadata?.figureBook?.workCreator
        &&isDeepStrictEqual(source.creditedTranslators,row.sources?.translators)&&isDeepStrictEqual(source.includedOriginalParts,numbers)
        &&text(source.bodyEvidence)&&text(source.creditEvidence)&&text(source.scopeEvidence)&&text(source.introductionEvidence)
      const bibliography=proof?.retainedBibliography,origin=proof?.originalWorkReview
      const referenceParts=proof?.referenceSourceReview?.includedOriginalParts
      if(!proof||typeof proof!=='object'||Array.isArray(proof)||proof.method!=='independent_unselected_translation_start_review'||proof.llmReviewed!==true
        ||proof.identicalBody!==false||!text(proof.reason)||!text(proof.introductionSelectionReason)
        ||!keepWork||!dropWork||keepWork.type!=='BOOK'||dropWork.type!=='BOOK'
        ||!isDeepStrictEqual(proof.currentKeepWork,keepWork)||!isDeepStrictEqual(proof.currentDropWork,dropWork)
        ||!isDeepStrictEqual(proof.keepWorkAnchor,anchor(keepWork))||!isDeepStrictEqual(proof.dropWorkAnchor,anchor(dropWork))
        ||!['workTitle','workCreator','workIdentity'].every(key=>typeof anchor(keepWork)[key]==='string'&&anchor(keepWork)[key].trim()
          &&typeof anchor(dropWork)[key]==='string'&&anchor(dropWork)[key].trim())
        ||keepWork.metadata.figureBook.workTitle!==dropWork.metadata.figureBook.workTitle||keepWork.metadata.figureBook.workCreator!==dropWork.metadata.figureBook.workCreator
        ||!sameRows(proof.beforeLocaleCards,snapshot.content_locales)||!sameRows(proof.beforeEditions,snapshot.figure_book_editions)
        ||!isDeepStrictEqual(proof.referenceEdition,keep)||!isDeepStrictEqual(proof.discardedEdition,drop)
        ||!card||!selected||card.isbn===keep.isbn||card.verified!==true||selected.verified!==true||keep.verified!==true||drop.verified!==true
        ||!isDeepStrictEqual(proof.selectedLocaleCard,card)||!isDeepStrictEqual(proof.selectedEdition,selected)
        ||card.title!==selected.title||card.creator!==selected.creator||card.description!==selected.description
        ||!known(keep)||!known(drop)||known(keep)!==known(drop)||!known(selected)||known(selected)===known(keep)
        ||excludedBookEditionReason({...selected,editionKind:selected.edition_kind,textScope:selected.text_scope})
        ||!parts(referenceParts)||!isDeepStrictEqual(review.startVolumeNumbers,referenceParts)||review.startTextScope!==(keep.text_scope??null)
        ||review.sourceUrl===review.startSourceUrl||keep.sources?.description!==review.startSourceUrl||drop.sources?.description!==review.sourceUrl
        ||!sourceValid(proof.referenceSourceReview,keep,review.startSourceUrl,referenceParts)
        ||!sourceValid(proof.discardedSourceReview,drop,review.sourceUrl,[review.volumeNumber])
        ||!sourceValid(proof.selectedSourceReview,selected,selected.sources?.description,proof.selectedSourceReview?.includedOriginalParts)
        ||!parts(proof.selectedSourceReview?.includedOriginalParts)
        ||![keep,drop,selected].every(row=>text(row.description)&&!isBookIntroductionSource(row.description))
        ||origin?.llmReviewed!==true||origin.continuousOriginalPartsReviewed!==true
        ||origin.workTitle!==keepWork.metadata.figureBook.workTitle||origin.workCreator!==keepWork.metadata.figureBook.workCreator
        ||origin.keepWorkIdentity!==keepWork.metadata.figureBook.workIdentity||origin.dropWorkIdentity!==dropWork.metadata.figureBook.workIdentity
        ||origin.referenceSourceUrl!==review.startSourceUrl||origin.discardedSourceUrl!==review.sourceUrl||!text(origin.bodyEvidence)||!text(origin.creditEvidence)
        ||!bibliography||!isDeepStrictEqual(bibliography,snapshot.contents.find(row=>row.id===pair.keep)?.metadata?.figureBook?.foreignEditions?.find(row=>row.isbn===drop.isbn))
        ||bibliography.isbn!==drop.isbn||bibliography.title!==drop.title||bibliography.creator!==drop.creator||bibliography.locale!==drop.locale
        ||bibliography.publisher!==(drop.publisher??null)||bibliography.source_url!==review.sourceUrl||bibliography.part!==review.volumeNumber
        ||!isDeepStrictEqual(bibliography.translators,drop.sources.translators)
        ||SNAPSHOT_TABLES.some(table=>table!=='figure_book_editions'&&snapshot[table].some(row=>row.edition_id!=null&&String(row.edition_id)===String(drop.id))))
        throw Error('MERGE_REVIEW: nonstart unselected translation requires exact live originals/default card/editions, known same translators, independent first/later scopes and preserved bibliography/introduction selection')
      unselectedStart=true
    }
    if ((!unselectedStart&&(!/^(?:volume\/1|full|complete)$/iu.test(keep.text_scope ?? '') && !reviewedCombinedStart))
      || excludedBookEditionReason({ ...keep, editionKind: keep.edition_kind, textScope: keep.text_scope })
      || !unselectedStart&&!snapshot.content_locales.some(row => row.content_id === pair.keep && row.locale === keep.locale && toIsbn13(row.isbn ?? '') === toIsbn13(keep.isbn ?? ''))) throw Error('MERGE_REVIEW: nonstart requires an existing selected first or complete edition and locale')
    const keepTranslation = bookEditionTranslationKey(keep), dropTranslation = bookEditionTranslationKey(drop)
    if (keepTranslation && dropTranslation && keepTranslation !== dropTranslation) throw Error('MERGE_REVIEW: nonstart different verified translators')
    if (snapshot.figure_book_products.some(row => String(row.edition_id) === String(drop.id))) throw Error('MERGE_REVIEW: nonstart product references require separate review; do not attach later-part purchases to first part')
    return drop
  })
}

/** Wrong-speaker curation removal requires an LLM body judgment bound to the entire current row. */
export function validateReviewedInvalidCurationRemovals(pair, snapshot, removals = []) {
  validatePair(pair)
  if (!Array.isArray(removals)) throw Error('MERGE_REVIEW: reviewedInvalidCurationRemovals must be an array')
  const seen = new Set()
  const requiredText = value => typeof value === 'string' && value.trim().length >= 20
  const https = value => {
    try { const url = new URL(value); return typeof value === 'string' && url.protocol === 'https:' && !url.username && !url.password }
    catch { return false }
  }
  return removals.map(review => {
    const row = snapshot.celeb_contents?.find(row => row.id === review?.id)
    if (!row || ![pair.keep, pair.drop].includes(row.content_id) || seen.has(row.id)
      || review.celebId !== row.celeb_id || review.contentId !== row.content_id || review.sourceUrl !== row.source_url
      || !isDeepStrictEqual(review.before, row)) throw Error('MERGE_REVIEW: invalid curation exact before/owner/source mismatch')
    seen.add(row.id)
    if (Object.entries(row).some(([key, value]) => /(?:member|contributor)/iu.test(key) && value != null && value !== ''))
      throw Error('MERGE_REVIEW: invalid curation has member/contributor data')
    const evidence = review.speakerEvidence
    if (review.method !== 'llm_source_body_review' || review.llmReviewed !== true || review.decision !== 'remove_wrong_speaker'
      || !https(review.sourceUrl) || !https(evidence?.sourceUrl) || !requiredText(review.reason) || !requiredText(review.bodyFinding)
      || typeof evidence.actualSpeaker !== 'string' || !evidence.actualSpeaker.trim()
      || typeof evidence.registeredSpeaker !== 'string' || !evidence.registeredSpeaker.trim()
      || evidence.actualSpeaker.trim() === evidence.registeredSpeaker.trim() || evidence.registeredCelebId !== row.celeb_id
      || !requiredText(evidence.locator) || !requiredText(evidence.bodyEvidence))
      throw Error('MERGE_REVIEW: invalid curation requires reviewed body and actual-speaker evidence')
    return row
  })
}

/** Select an existing same-source translation or a reviewed fuller original, never arbitrary replacement prose. */
export function validateReviewedCurationResolutions(pair, snapshot, reviews = []) {
  validatePair(pair)
  if (!Array.isArray(reviews)) throw Error('MERGE_REVIEW: reviewedCurationResolutions must be an array')
  const seen = new Set(), ignored = new Set(['id','content_id','created_at','updated_at'])
  const text = value => typeof value === 'string' && value.trim().length >= 20
  const https = value => { try { const url = new URL(value);return typeof value === 'string' && !/\s/u.test(value) && url.protocol === 'https:' && !url.username && !url.password } catch { return false } }
  return reviews.map(review => {
    const keep = snapshot.celeb_contents?.find(row => row.id === review?.keepCurationId)
    const drop = snapshot.celeb_contents?.find(row => row.id === review?.dropCurationId)
    if (!keep || !drop || keep.content_id !== pair.keep || drop.content_id !== pair.drop || keep.celeb_id !== drop.celeb_id
      || review.celebId !== keep.celeb_id || !isDeepStrictEqual(review.keepBefore,keep) || !isDeepStrictEqual(review.dropBefore,drop)
      || seen.has(keep.celeb_id)) throw Error('MERGE_REVIEW: curation resolution exact before/owner mismatch')
    seen.add(keep.celeb_id)
    if ([keep,drop].some(row => Object.entries(row).some(([key,value]) => /(?:member|contributor)/iu.test(key) && value != null && value !== '')))
      throw Error('MERGE_REVIEW: curation resolution has member/contributor data')
    const translation = review.decision === 'same_source_translation_variants'
    const republication = review.decision === 'same_source_republication'
    const variants = review.decision === 'same_source_review_variants'
    const privateDuplicate = review.decision === 'existing_public_identical_private_duplicate'
    if ((review.preserveBothExistingReviews !== undefined && typeof review.preserveBothExistingReviews !== 'boolean')
      || (review.preserveBothExistingReviews === true && !republication && !variants)) throw Error('MERGE_REVIEW: preserveBothExistingReviews requires explicit boolean preservation approval')
    const fields = privateDuplicate ? [] : translation ? ['review'] : variants ? ['review','review_en'] : ['review','review_en','source_url']
    if ((!translation && !republication && !variants && !privateDuplicate) || review.method !== 'llm_source_body_review' || review.llmReviewed !== true
      || !text(review.bodyFinding) || !text(review.reason) || !Array.isArray(review.allowedFields)
      || !isDeepStrictEqual([...review.allowedFields].sort(), [...fields].sort()) || !https(keep.source_url) || !https(drop.source_url)
      || !Array.isArray(review.evidence) || !review.evidence.length || review.evidence.some(item => !https(item?.url) || !text(item?.bodyFinding)))
      throw Error('MERGE_REVIEW: curation resolution requires explicit fields and reviewed source bodies')
    for (const row of [keep,drop]) if (!review.evidence.some(item => item.url === row.source_url)) throw Error('MERGE_REVIEW: curation resolution source body missing')
    for (const key of new Set([...Object.keys(keep),...Object.keys(drop)])) {
      if (privateDuplicate && key === 'visibility') continue
      if (!ignored.has(key) && !fields.includes(key) && !isDeepStrictEqual(keep[key],drop[key])) throw Error('MERGE_REVIEW: curation resolution protected field differs: '+key)
    }
    if (privateDuplicate) {
      const proof=review.originalWorkReview,keepWork=snapshot.contents.find(row=>row.id===pair.keep),dropWork=snapshot.contents.find(row=>row.id===pair.drop)
      const anchor=work=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work?.metadata?.figureBook?.[key]??null]))
      if (keep.visibility!=='public'||drop.visibility!=='private'||keep.source_url!==drop.source_url||review.selectedCurationId!==keep.id
        ||Object.hasOwn(review,'additionalSourceUrl')||Object.hasOwn(review,'preserveBothExistingReviews')
        ||[keep,drop].some(row=>['review','review_en'].some(key=>typeof row[key]!=='string'||!row[key].trim()))
        ||!keepWork||!dropWork||keepWork.type!=='BOOK'||dropWork.type!=='BOOK'
        ||proof?.method!=='independent_existing_original_review'||proof.llmReviewed!==true||proof.sameOriginal!==true
        ||!isDeepStrictEqual(proof.currentKeepWork,keepWork)||!isDeepStrictEqual(proof.currentDropWork,dropWork)
        ||!isDeepStrictEqual(proof.keepWorkAnchor,anchor(keepWork))||!isDeepStrictEqual(proof.dropWorkAnchor,anchor(dropWork))
        ||!['workTitle','workCreator','workIdentity'].every(key=>typeof anchor(keepWork)[key]==='string'&&anchor(keepWork)[key].trim()
          &&typeof anchor(dropWork)[key]==='string'&&anchor(dropWork)[key].trim())
        ||anchor(keepWork).workTitle!==anchor(dropWork).workTitle||anchor(keepWork).workCreator!==anchor(dropWork).workCreator
        ||proof.sourceUrl!==keep.source_url||!text(proof.bodyFinding)||!text(proof.creditFinding)
        ||SNAPSHOT_TABLES.some(table=>table!=='celeb_contents'&&(snapshot[table]??[]).some(row=>Object.entries(row).some(([key,value])=>
          /^(?:celeb_contents?_id|curation_id)$/u.test(key)&&[keep.id,drop.id].includes(value)))))
        throw Error('MERGE_REVIEW: private duplicate requires an unchanged public original, exact identical private prose/source/state and reviewed current BOOK anchors without child references')
      return {keep,drop,patch:{},removePrivateDuplicate:true}
    }
    if (translation && (review.selectedCurationId !== keep.id || keep.source_url !== drop.source_url || keep.review_en !== drop.review_en
      || !text(keep.review_en) || review.additionalSourceUrl !== undefined)) throw Error('MERGE_REVIEW: translation resolution requires canonical translation of the identical English/source')
    if (variants && (review.preserveBothExistingReviews !== true || keep.source_url !== drop.source_url || Object.hasOwn(review,'additionalSourceUrl')))
      throw Error('MERGE_REVIEW: review variants require explicit preservation of both languages at the identical existing source URL')
    const selected = [keep,drop].find(row => row.id === review.selectedCurationId)
    if (!selected || fields.some(key => typeof selected[key] !== 'string' || !selected[key].trim())) throw Error('MERGE_REVIEW: curation resolution selected existing row mismatch')
    const patch = Object.fromEntries(fields.map(key => [key,selected[key]]))
    const other = selected === keep ? drop : keep
    if (review.preserveBothExistingReviews === true) {
      if ([selected,other].some(row => ['review','review_en'].some(key => typeof row[key] !== 'string' || !row[key].trim())))
        throw Error('MERGE_REVIEW: preserveBothExistingReviews requires both existing languages on both rows')
      patch.review += '\n\n'+other.review
      patch.review_en += '\n\n'+other.review_en
    }
    if (republication) {
      if (!https(review.additionalSourceUrl) || review.additionalSourceUrl !== other.source_url || review.additionalSourceUrl === selected.source_url)
        throw Error('MERGE_REVIEW: republication requires the exact second source URL retained in review text')
      patch.review += '\n\n추가 출처: '+review.additionalSourceUrl
      patch.review_en += '\n\nAdditional source: '+review.additionalSourceUrl
    }
    return {keep,drop,patch}
  })
}

export function buildMergeSql(pair, snapshot, { reviewedEditionMappings = [], reviewedNonstartEditionRemovals = [], reviewedInvalidCurationRemovals = pair.reviewedInvalidCurationRemovals ?? [], reviewedCurationResolutions = pair.reviewedCurationResolutions ?? [] } = {}) {
  validatePair(pair)
  if (displayIsbn(snapshot)) throw new Error('MERGE_REVIEW: display title still has an unverified ISBN')
  if (unrepresentedEnglishKakaoIsbn(snapshot)) throw new Error('MERGE_REVIEW: English Kakao card ISBN has no preserved edition')
  for (const table of SNAPSHOT_TABLES) if (!Array.isArray(snapshot[table])) throw new Error(`백업 누락: ${table}`)
  if (unrepresentedExternalIsbn(snapshot, pair)) throw new Error('MERGE_REVIEW: external ISBN has no preserved edition')
  const k = sqlLiteral(pair.keep), d = sqlLiteral(pair.drop)
  const removedCurations = validateReviewedInvalidCurationRemovals(pair, snapshot, reviewedInvalidCurationRemovals)
  const removedCurationIds = new Set(removedCurations.map(row => row.id))
  const remainingCurations = snapshot.celeb_contents.filter(row => !removedCurationIds.has(row.id))
  const curationResolutions = validateReviewedCurationResolutions(pair, snapshot, reviewedCurationResolutions)
  if (curationResolutions.some(review => [review.keep.id,review.drop.id].some(id => removedCurationIds.has(id)))) throw Error('MERGE_REVIEW: curation resolution/removal overlap')
  const curationResolutionSql = curationResolutions.map(review => `
  -- Resolve only exact reviewed rows; a private duplicate is deletion-only and child data is never cascaded.
  FOR row_pair IN SELECT to_jsonb(t) AS a FROM public.celeb_contents t WHERE t.id::text IN (${[review.keep.id,review.drop.id].map(sqlLiteral).join(',')}) LOOP
    FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, c.conkey, a.attname FROM pg_constraint c LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.celeb_contents'::regclass LOOP
      IF cardinality(unknown_ref.conkey) <> 1 THEN RAISE EXCEPTION 'MERGE_REVIEW: curation resolution unhandled child FK %', unknown_ref.rel; END IF;
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text=$1',unknown_ref.rel,unknown_ref.attname) INTO dependent_count USING row_pair.a->>'id';
      IF dependent_count>0 THEN RAISE EXCEPTION 'MERGE_REVIEW: curation resolution child references %',unknown_ref.rel; END IF;
    END LOOP;
  END LOOP;
  ${review.removePrivateDuplicate ? `DELETE FROM public.celeb_contents WHERE id::text=${sqlLiteral(review.drop.id)} AND content_id=drop_id AND visibility='private';` : `UPDATE public.celeb_contents SET ${Object.entries(review.patch).map(([key,value]) => key+'='+sqlLiteral(value)).join(',')} WHERE id::text IN (${[review.keep.id,review.drop.id].map(sqlLiteral).join(',')}) AND content_id IN (keep_id,drop_id);`}
  GET DIAGNOSTICS dependent_count = ROW_COUNT;
  IF dependent_count <> ${review.removePrivateDuplicate ? 1 : 2} THEN RAISE EXCEPTION 'MERGE_REVIEW: curation resolution row count changed'; END IF;`).join('\n')
  const projectedCurations = remainingCurations.filter(row=>!curationResolutions.some(review=>review.removePrivateDuplicate&&review.drop.id===row.id)).map(row => {
    const resolution = curationResolutions.find(review => review.keep.id === row.id || review.drop.id === row.id)
    return resolution ? { ...row, ...resolution.patch } : { ...row }
  })
  const finalCurations = projectedCurations.filter(row => row.content_id === pair.keep), updatedCurationIds = new Set()
  for (const row of projectedCurations.filter(row => row.content_id === pair.drop)) {
    const keep = finalCurations.find(keep => keep.celeb_id === row.celeb_id)
    updatedCurationIds.add(keep?.id ?? row.id)
    if (!keep) finalCurations.push({ ...row, content_id: pair.keep })
    else for (const key of ['review','review_en','source_url']) if (keep[key] == null || keep[key] === '') keep[key] = row[key]
  }
  const timestampIds = [...updatedCurationIds].map(sqlLiteral).join(',') || 'NULL'
  const normalizedCuration = `CASE WHEN t.id::text IN (${timestampIds}) THEN to_jsonb(t)-'updated_at' ELSE to_jsonb(t) END`
  const finalCurationRows = finalCurations.map(row => { const copy={...row};if(updatedCurationIds.has(row.id))delete copy.updated_at;return copy })
  const curationResolutionReadbackSql = curationResolutions.length ? `IF (SELECT coalesce(jsonb_agg(${normalizedCuration} ORDER BY (${normalizedCuration})::text),'[]'::jsonb) FROM public.celeb_contents t WHERE content_id=keep_id) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM jsonb_array_elements(${sqlLiteral(JSON.stringify(finalCurationRows))}::jsonb) v) THEN RAISE EXCEPTION 'MERGE_REVIEW: curation resolution protected readback mismatch'; END IF;` : ''
  const curationRemovalSql = removedCurations.length ? `
  -- Only exact, source-reviewed wrong-speaker rows may be removed; child data is never cascaded.
  FOR row_pair IN SELECT to_jsonb(t) AS a FROM public.celeb_contents t WHERE t.id::text IN (${removedCurations.map(row => sqlLiteral(row.id)).join(',')}) LOOP
    FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, c.conkey, a.attname FROM pg_constraint c LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.celeb_contents'::regclass LOOP
      IF cardinality(unknown_ref.conkey) <> 1 THEN RAISE EXCEPTION 'MERGE_REVIEW: invalid curation unhandled child FK %', unknown_ref.rel; END IF;
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text=$1', unknown_ref.rel, unknown_ref.attname) INTO dependent_count USING row_pair.a->>'id';
      IF dependent_count>0 THEN RAISE EXCEPTION 'MERGE_REVIEW: invalid curation child references %', unknown_ref.rel; END IF;
    END LOOP;
  END LOOP;
  DELETE FROM public.celeb_contents WHERE id::text IN (${removedCurations.map(row => sqlLiteral(row.id)).join(',')}) AND content_id IN (keep_id,drop_id);
  GET DIAGNOSTICS dependent_count = ROW_COUNT;
  IF dependent_count <> ${removedCurations.length} THEN RAISE EXCEPTION 'MERGE_REVIEW: invalid curation removal count changed'; END IF;` : ''
  const removedParts = validateReviewedNonstartEditionRemovals(pair, snapshot, reviewedNonstartEditionRemovals)
  const removedPartIds = new Set(removedParts.map(row => String(row.id)))
  if (!Array.isArray(reviewedEditionMappings)) throw Error('MERGE_REVIEW: reviewedEditionMappings must be an array')
  if (reviewedEditionMappings.some(mapping => removedPartIds.has(String(mapping.dropEditionId)))) throw Error('MERGE_REVIEW: a later part cannot also be mapped as an equivalent')
  const reviewedMappings = validateReviewedEditionMappings(pair, snapshot, reviewedEditionMappings)
  const excludedLocaleSeeds = snapshot.content_locales.filter(row => [pair.keep,pair.drop].includes(row.content_id)
    && (reviewedBookEditionSelectionReason({...row,title:row.sources?.edition_title??row.title})
      || removedParts.some(part => part.content_id === row.content_id && part.locale === row.locale && toIsbn13(part.isbn ?? '') === toIsbn13(row.isbn ?? ''))))
    .map(row => `(l.content_id=${sqlLiteral(row.content_id)} AND l.locale=${sqlLiteral(row.locale)} AND l.isbn IS NOT DISTINCT FROM ${sqlLiteral(row.isbn)})`)
  const excludedLocaleSeedSql = excludedLocaleSeeds.join(' OR ') || 'FALSE'
  const originalEditionIds = snapshot.figure_book_editions.map(row => sqlLiteral(String(row.id))).join(', ') || 'NULL'
  const works = new Map(snapshot.contents.map(row => [row.id, { ...row, figureBook: row.metadata?.figureBook }]))
  const translationKey = row => excludedBookEditionReason({ ...row, editionKind: row.edition_kind, textScope: row.text_scope })
    ? null : bookEditionTranslationKey(row, isOriginalEdition(row, works.get(row.content_id)))
  const representatives = new Map()
  for (const row of snapshot.figure_book_editions.filter(row => row.content_id === pair.keep)) {
    const key = translationKey(row)
    if (!key) continue
    if (representatives.has(key)) throw Error('MERGE_REVIEW: canonical work has duplicate original or translation')
    representatives.set(key, row)
  }
  const equivalents = snapshot.figure_book_editions.filter(row => row.content_id === pair.drop)
    .filter(row => !removedPartIds.has(String(row.id)))
    .flatMap(row => {
      const key = translationKey(row), keep = key && representatives.get(key)
      if (!keep || keep.isbn === row.isbn) return []
      for (const field of ['edition_kind','text_scope']) if (keep[field] && row[field] && keep[field] !== row[field])
        throw Error('MERGE_REVIEW: automatic translation mapping scope conflict; review included-volume selection separately')
      // 원문·역자 키는 수록 범위를 증명하지 않는다. 빈 범위의 후속권은 시작권의 재판으로 접지 않는다.
      const knownScope = edition => typeof edition.text_scope === 'string' && !!edition.text_scope.trim()
        && !/^unknown$/iu.test(edition.text_scope.trim())
      if ((!knownScope(keep) || !knownScope(row))
        && !reviewedMappings.some(mapping => String(mapping.drop) === String(row.id) && String(mapping.keep) === String(keep.id)))
        throw Error('MERGE_REVIEW: automatic translation mapping scope unverified; use source-reviewed equivalence or nonstart removal')
      return [{ drop: row.id, keep: keep.id }]
    })
  for (const mapping of reviewedMappings) {
    const automatic = equivalents.find(row => String(row.drop) === String(mapping.drop))
    if (automatic && String(automatic.keep) !== String(mapping.keep)) throw Error('MERGE_REVIEW: reviewed mapping conflicts with verified original/translation representative')
    if (!automatic) equivalents.push(mapping)
  }
  const equivalentEdition = equivalents.length ? `CASE duplicate_edition.id ${equivalents.map(row => `WHEN ${Number(row.drop)} THEN ${Number(row.keep)}`).join(' ')} ELSE NULL END` : 'NULL'
  const figure = works.get(pair.keep)?.figureBook ?? {}
  const proofOwner = { content_id: pair.keep }
  for (const [field, value] of Object.entries({ work_identity: figure.workIdentity, original_title: figure.workTitle ?? figure.originalTitle, original_creator: figure.workCreator ?? figure.originalCreator })) {
    if (typeof value === 'string' && value.trim()) proofOwner[field] = value
  }
  const rebindProof = proof => proof?.method === 'independent_work_review' && proof.content_id === pair.drop ? { ...proof, ...proofOwner } : proof
  // 독립 검수의 ISBN·URL은 그대로 두고 검수 대상 작품만 통합된 소유자로 옮긴다.
  const evidenceUpdates = ['figure_book_editions', 'content_locales'].flatMap(table => snapshot[table].filter(row => row.content_id === pair.drop && (table !== 'figure_book_editions' || !removedPartIds.has(String(row.id)))).flatMap(row => {
    const source = row.sources
    if (!source || typeof source !== 'object') return []
    let sources = { ...source }
    if (Array.isArray(source.edition_work_evidence)) sources.edition_work_evidence = source.edition_work_evidence.map(rebindProof)
    if (Array.isArray(source.edition_selection_evidence)) sources.edition_selection_evidence = source.edition_selection_evidence.map(proof => proof?.method === 'independent_selection_review' && (BOOK_EDITION_WORK_BOUND_SELECTION_REASONS.includes(proof.reason) || proof.reason === 'wrong_locale') && proof.content_id === pair.drop ? {...proof, content_id:pair.keep} : proof)
    // 비노출 실물은 DB 가드가 선정 근거 외의 sources 변경을 막는다. 다른 근거까지 재결속하면
    // owner 이동이 빠져 이전 owner에서 제외가 풀린다. 선정 근거만 옮기고 나머지 원출처는 보존한다.
    if (table === 'figure_book_editions' && reviewedBookEditionSelectionReason({ ...row, sources: source })
      && !isDeepStrictEqual(source.edition_selection_evidence, sources.edition_selection_evidence))
      sources = { ...source, edition_selection_evidence: sources.edition_selection_evidence }
    if (source.work_attribution) sources.work_attribution = rebindProof(source.work_attribution)
    const physicalProof = source.isbnless_physical_edition_evidence
    if (physicalProof?.method === 'independent_isbnless_physical_edition_review' && physicalProof.contentId === pair.drop)
      sources.isbnless_physical_edition_evidence = { ...physicalProof, contentId: pair.keep }
    if (JSON.stringify(sources) === JSON.stringify(source)) return []
    // 비노출 실물은 owner와 그 선정 근거를 같은 문장으로 옮긴다. 근거만 먼저
    // 재결속하면 이전 owner에서 제외가 풀리는 중간 상태가 생긴다.
    const withoutSelection = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'edition_selection_evidence'))
    const selectionOwnerMove = table === 'figure_book_editions'
      && reviewedBookEditionSelectionReason({ ...row, sources: source })
      && isDeepStrictEqual(withoutSelection(source), withoutSelection(sources))
      && !isDeepStrictEqual(source.edition_selection_evidence, sources.edition_selection_evidence)
    const where = table === 'content_locales' ? `content_id=drop_id AND locale=${sqlLiteral(row.locale)}` : `id=${Number(row.id)}`
    return [`UPDATE public.${table} SET ${selectionOwnerMove ? 'content_id=keep_id, ' : ''}sources=${sqlLiteral(JSON.stringify(sources))}::jsonb WHERE ${where};`]
  })).join('\n')
  const rawInput = JSON.stringify({ pair, snapshot })
  let delimiter = '$merge_work$'
  for (let suffix = 1; rawInput.includes(delimiter); suffix += 1) delimiter = `$merge_work_${suffix}$`
  const checks = SNAPSHOT_TABLES.map(table => {
    const where = referenceWhere(table, k, d, 't')
    return `IF (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM public.${table} t WHERE ${where}) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text), '[]'::jsonb) FROM jsonb_array_elements(${sqlLiteral(JSON.stringify(snapshot[table]))}::jsonb) v) THEN RAISE EXCEPTION 'MERGE_REVIEW: concurrent change in ${table}'; END IF;`
  }).join('\n')
  const whitelist = REFERENCE_TABLES.map(sqlLiteral).join(', ')
  const rowLocks = SNAPSHOT_TABLES.map(table => {
    const where = referenceWhere(table, k, d)
    return `PERFORM 1 FROM public.${table} WHERE ${where} ORDER BY ${table === 'contents' ? 'id' : `to_jsonb(${table})::text`} FOR UPDATE;`
  }).join('\n')
  return `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO ${delimiter}
DECLARE
  keep_id text := ${k}; drop_id text := ${d};
  row_pair record; field record; duplicate_edition record;
  canonical_id bigint; unknown_ref record; dependent_count bigint;
BEGIN
  -- FK 없는 배열·활동 참조는 행 잠금만으로 새 참조 삽입을 막을 수 없다.
  LOCK TABLE ${[...new Set(['activity_logs', ...CONTENT_ARRAY_REFERENCES.map(ref => ref.table)])].map(table => `public.${table}`).join(', ')} IN SHARE ROW EXCLUSIVE MODE;
  ${rowLocks}
  ${checks}
  IF (SELECT count(*) FROM public.contents WHERE id IN (keep_id, drop_id) AND type = 'BOOK') <> 2 THEN RAISE EXCEPTION 'MERGE_REVIEW: two BOOK works required'; END IF;
  -- 새 FK나 비표준 참조가 추가됐으면 원값 백업과 이동 코드가 갖춰지기 전에는 실행하지 않는다.
  FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, c.conkey, c.confkey, c.confrelid,
      n.nspname, r.relname, a.attname
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid IN ('public.contents'::regclass, 'public.figure_book_contents'::regclass, 'public.figure_book_editions'::regclass)
  LOOP
    IF unknown_ref.confrelid='public.contents'::regclass THEN
      IF unknown_ref.nspname <> 'public' OR unknown_ref.relname NOT IN (${whitelist}) OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'content_id' THEN
        RAISE EXCEPTION 'MERGE_REVIEW: unhandled contents FK %', unknown_ref.rel;
      END IF;
    ELSIF unknown_ref.confrelid='public.figure_book_contents'::regclass THEN
      IF unknown_ref.nspname <> 'public' OR unknown_ref.relname NOT IN ('figure_book_characters','figure_book_editions') OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'content_id' THEN RAISE EXCEPTION 'MERGE_REVIEW: unhandled catalog FK %', unknown_ref.rel; END IF;
    ELSIF unknown_ref.nspname <> 'public' OR unknown_ref.relname <> 'figure_book_products' OR cardinality(unknown_ref.conkey) <> 1 OR unknown_ref.attname <> 'edition_id' THEN
      RAISE EXCEPTION 'MERGE_REVIEW: unhandled edition FK %', unknown_ref.rel;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.member_contents a JOIN public.member_contents b USING(member_id) WHERE a.content_id=keep_id AND b.content_id=drop_id) THEN RAISE EXCEPTION 'MERGE_REVIEW: member duplicate; no user rows deleted'; END IF;
  ${rankedReferences.map(({ table, column }) => `IF EXISTS (SELECT 1 FROM public.${table} t CROSS JOIN LATERAL jsonb_each(${rankGroupsSql(table, column)}) a CROSS JOIN LATERAL jsonb_each(${rankGroupsSql(table, column)}) b WHERE a.key <> b.key AND a.value @> jsonb_build_array(keep_id) AND b.value @> jsonb_build_array(drop_id)) THEN RAISE EXCEPTION 'MERGE_REVIEW: ${table} rank conflict'; END IF;`).join('\n')}
  IF EXISTS (SELECT 1 FROM public.figure_book_characters a JOIN public.figure_book_characters b USING(celeb_id) WHERE a.content_id=keep_id AND b.content_id=drop_id AND ((nullif(a.description,'') IS NOT NULL AND nullif(b.description,'') IS NOT NULL AND a.description<>b.description) OR (nullif(a.description_en,'') IS NOT NULL AND nullif(b.description_en,'') IS NOT NULL AND a.description_en<>b.description_en))) THEN RAISE EXCEPTION 'MERGE_REVIEW: character description conflict'; END IF;
  IF EXISTS (SELECT 1 FROM public.figure_book_editions a JOIN public.figure_book_editions b USING(locale,isbn) WHERE a.content_id=keep_id AND b.content_id=drop_id AND ((a.edition_kind IS NOT NULL AND b.edition_kind IS NOT NULL AND a.edition_kind<>b.edition_kind) OR (a.text_scope IS NOT NULL AND b.text_scope IS NOT NULL AND a.text_scope<>b.text_scope))) THEN RAISE EXCEPTION 'MERGE_REVIEW: edition scope conflict'; END IF;
  ${curationRemovalSql}
  ${curationResolutionSql}
  FOR row_pair IN SELECT to_jsonb(a) AS a, to_jsonb(b) AS b FROM public.celeb_contents a JOIN public.celeb_contents b USING(celeb_id) WHERE a.content_id=keep_id AND b.content_id=drop_id LOOP
    FOR field IN SELECT x.key, x.value AS a, row_pair.b->x.key AS b FROM jsonb_each(row_pair.a) x WHERE x.key NOT IN ('id','content_id','created_at','updated_at') LOOP
      IF field.a IS DISTINCT FROM field.b AND (field.key NOT IN ('review','review_en','source_url') OR (field.a NOT IN ('null'::jsonb, '""'::jsonb) AND field.b NOT IN ('null'::jsonb, '""'::jsonb))) THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb conflict in %', field.key; END IF;
    END LOOP;
    -- 감상 행을 가리키는 자식 데이터를 cascade로 지우지 않는다.
    FOR unknown_ref IN SELECT c.conrelid::regclass AS rel, a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.celeb_contents'::regclass LOOP
      EXECUTE format('SELECT count(*) FROM %s WHERE %I::text=$1', unknown_ref.rel, unknown_ref.attname) INTO dependent_count USING row_pair.b->>'id';
      IF dependent_count>0 THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb child references %', unknown_ref.rel; END IF;
    END LOOP;
  END LOOP;
  ${evidenceUpdates}
  ${removedParts.length ? `DELETE FROM public.figure_book_editions WHERE content_id=drop_id AND id IN (${removedParts.map(row => Number(row.id)).join(',')});` : ''}
  IF NOT EXISTS(SELECT 1 FROM public.figure_book_contents WHERE content_id=keep_id) THEN
    INSERT INTO public.figure_book_contents(content_id) VALUES(keep_id);
    -- seed가 만든 표시용 제목 행은 실제 판본이 아니다. 기존 ISBN 없는 판본은 삭제하지 않는다.
    DELETE FROM public.figure_book_editions WHERE content_id=keep_id AND isbn IS NULL AND sources->>'primary'='none' AND sources->>'title' IN ('translated','romanized','original');
  END IF;
  -- catalog 생성 트리거가 만든 새 카드 판본 때문에 반대편 원판본 ID가 삭제되지 않게 한다.
  -- 원래 판본과 그 구매 참조는 보존하고, 이번 transaction에서 생긴 무참조 seed만 제거한다.
  DELETE FROM public.figure_book_editions seeded
    WHERE seeded.content_id=keep_id AND seeded.id NOT IN (${originalEditionIds}) AND seeded.isbn IS NOT NULL
      AND EXISTS(SELECT 1 FROM public.figure_book_editions original WHERE original.content_id=drop_id AND original.id IN (${originalEditionIds}) AND original.locale=seeded.locale AND original.isbn=seeded.isbn)
      AND NOT EXISTS(SELECT 1 FROM public.figure_book_products p WHERE p.edition_id=seeded.id);
  -- 같은 언어의 다른 ISBN 카드도 판본으로 보존한 뒤 대표 카드를 합친다.
  INSERT INTO public.figure_book_editions(content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,verified,sources)
    -- 같은 목적 작품·언어·ISBN은 BEFORE trigger에 두 번 전달하지 않는다.
    -- ISBN 없는 서로 다른 카드는 기존처럼 별개로 유지한다.
    SELECT DISTINCT ON (CASE WHEN EXISTS(SELECT 1 FROM public.figure_book_contents f WHERE f.content_id=l.content_id) THEN l.content_id ELSE keep_id END,l.locale,l.isbn,CASE WHEN l.isbn IS NULL THEN l.content_id END)
      CASE WHEN EXISTS(SELECT 1 FROM public.figure_book_contents f WHERE f.content_id=l.content_id) THEN l.content_id ELSE keep_id END,l.locale,coalesce(l.sources->>'edition_title',l.title),l.creator,l.description,l.isbn,l.publisher,l.thumbnail_url,l.verified,l.sources
    FROM public.content_locales l WHERE l.content_id IN(keep_id,drop_id) AND (l.isbn IS NOT NULL OR l.sources->>'primary' IN ('kakao_book','openlibrary'))
      AND NOT (${excludedLocaleSeedSql})
      AND NOT(coalesce(l.sources->>'primary','')='none' AND coalesce(l.sources->>'title','') IN('translated','romanized','original'))
      AND NOT(l.locale='en' AND coalesce(l.sources->>'primary','')='kakao_book')
      AND NOT(l.isbn IS NULL AND coalesce(l.sources->>'title','')='kakao_title_search' AND coalesce(l.sources->>'series_source_url','') !~ '^https://(m\\.)?search\\.daum\\.net/search\\?.*bookId=[0-9]+')
      AND NOT EXISTS(SELECT 1 FROM public.figure_book_editions e WHERE e.content_id IN(keep_id,drop_id) AND e.locale=l.locale AND (e.isbn=l.isbn OR (l.isbn IS NULL AND e.title=coalesce(l.sources->>'edition_title',l.title) AND e.creator IS NOT DISTINCT FROM l.creator AND (l.publisher IS NULL OR e.publisher IS NOT DISTINCT FROM l.publisher) AND e.sources - 'edition_work_evidence' - 'scope_evidence' - 'edition_title' - 'series_title' - 'series_source_url' - 'isbnless_physical_edition_evidence' - 'edition_text_scope_evidence' IS NOT DISTINCT FROM l.sources - 'edition_work_evidence' - 'scope_evidence' - 'edition_title' - 'series_title' - 'series_source_url' - 'isbnless_physical_edition_evidence' - 'edition_text_scope_evidence')))
    ORDER BY CASE WHEN EXISTS(SELECT 1 FROM public.figure_book_contents f WHERE f.content_id=l.content_id) THEN l.content_id ELSE keep_id END,l.locale,l.isbn,CASE WHEN l.isbn IS NULL THEN l.content_id END,CASE WHEN l.content_id=keep_id THEN 0 ELSE 1 END
    ON CONFLICT (content_id, locale, isbn) WHERE isbn IS NOT NULL DO NOTHING;
  UPDATE public.figure_book_characters a SET description=coalesce(nullif(a.description,''),b.description), description_en=coalesce(nullif(a.description_en,''),b.description_en), relation_type=CASE WHEN a.relation_type='authored' OR b.relation_type='authored' THEN 'authored' WHEN a.relation_type='appearance' OR b.relation_type='appearance' THEN 'appearance' ELSE a.relation_type END
    FROM public.figure_book_characters b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.celeb_id=b.celeb_id;
  DELETE FROM public.figure_book_characters b USING public.figure_book_characters a WHERE b.content_id=drop_id AND a.content_id=keep_id AND a.celeb_id=b.celeb_id;
  UPDATE public.figure_book_characters SET content_id=keep_id WHERE content_id=drop_id;
  FOR duplicate_edition IN SELECT * FROM public.figure_book_editions WHERE content_id=drop_id ORDER BY id LOOP
    canonical_id := ${equivalentEdition};
    IF canonical_id IS NULL AND duplicate_edition.isbn IS NOT NULL THEN SELECT id INTO canonical_id FROM public.figure_book_editions WHERE content_id=keep_id AND locale=duplicate_edition.locale AND isbn=duplicate_edition.isbn LIMIT 1; END IF;
    IF canonical_id IS NULL THEN UPDATE public.figure_book_editions SET content_id=keep_id WHERE id=duplicate_edition.id;
    ELSE
      -- 플랫폼 활성 상품 충돌은 버리지 않고 비활성 이력으로 모두 남긴다.
      UPDATE public.figure_book_products p SET is_active=false WHERE p.edition_id=duplicate_edition.id AND p.is_active AND EXISTS(SELECT 1 FROM public.figure_book_products q WHERE q.edition_id=canonical_id AND q.platform=p.platform AND q.is_active);
      UPDATE public.figure_book_products SET edition_id=canonical_id WHERE edition_id=duplicate_edition.id;
      -- 다른 상품의 ISBN·출판사·표지·출처는 대표 판본의 메타에 섞지 않는다.
      IF (${equivalentEdition}) IS NULL THEN
        UPDATE public.figure_book_editions a SET creator=coalesce(nullif(a.creator,''),duplicate_edition.creator), description=coalesce(nullif(a.description,''),duplicate_edition.description), publisher=coalesce(nullif(a.publisher,''),duplicate_edition.publisher), thumbnail_url=coalesce(a.thumbnail_url,duplicate_edition.thumbnail_url), release_date=coalesce(a.release_date,duplicate_edition.release_date), edition_kind=coalesce(a.edition_kind,duplicate_edition.edition_kind), text_scope=coalesce(a.text_scope,duplicate_edition.text_scope), verified=coalesce(a.verified,duplicate_edition.verified), sources=coalesce(duplicate_edition.sources,'{}'::jsonb)||coalesce(a.sources,'{}'::jsonb) WHERE a.id=canonical_id;
      END IF;
      DELETE FROM public.figure_book_editions WHERE id=duplicate_edition.id;
    END IF;
  END LOOP;
  UPDATE public.content_locales l SET content_id=keep_id WHERE content_id=drop_id AND NOT EXISTS(SELECT 1 FROM public.content_locales k WHERE k.content_id=keep_id AND k.locale=l.locale);
  UPDATE public.content_locales a SET creator=coalesce(nullif(a.creator,''),b.creator), description=coalesce(nullif(a.description,''),b.description), publisher=coalesce(nullif(a.publisher,''),b.publisher), thumbnail_url=coalesce(a.thumbnail_url,b.thumbnail_url), sources=coalesce(b.sources,'{}'::jsonb)||coalesce(a.sources,'{}'::jsonb)
    FROM public.content_locales b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.locale=b.locale AND a.isbn=b.isbn;
  DELETE FROM public.content_locales WHERE content_id=drop_id;
  UPDATE public.member_contents SET content_id=keep_id WHERE content_id=drop_id;
  UPDATE public.celeb_contents a SET review=coalesce(nullif(a.review,''),b.review),review_en=coalesce(nullif(a.review_en,''),b.review_en),source_url=coalesce(nullif(a.source_url,''),b.source_url)
    FROM public.celeb_contents b WHERE a.content_id=keep_id AND b.content_id=drop_id AND a.celeb_id=b.celeb_id;
  DELETE FROM public.celeb_contents b USING public.celeb_contents a WHERE b.content_id=drop_id AND a.content_id=keep_id AND a.celeb_id=b.celeb_id;
  UPDATE public.celeb_contents SET content_id=keep_id WHERE content_id=drop_id;
  ${['curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs', 'commerce_events', 'profession_book_picks'].map(table => `UPDATE public.${table} SET content_id=keep_id WHERE content_id=drop_id;`).join('\n')}
  ${CONTENT_ARRAY_REFERENCES.map(arrayUpdateSql).join('\n')}
  DELETE FROM public.figure_book_contents WHERE content_id=drop_id;
  -- 모든 참조 이동을 확인한 뒤에만 원래 작품을 지운다.
  ${REFERENCE_TABLES.map(table => `IF EXISTS(SELECT 1 FROM public.${table} WHERE content_id=drop_id) THEN RAISE EXCEPTION 'MERGE_REVIEW: residual ${table} reference'; END IF;`).join('\n')}
  ${CONTENT_ARRAY_REFERENCES.map(ref => `IF EXISTS(SELECT 1 FROM public.${ref.table} WHERE ${arrayReferenceWhere(ref, 'drop_id')}) THEN RAISE EXCEPTION 'MERGE_REVIEW: residual ${ref.table}.${ref.column} array reference'; END IF;`).join('\n')}
  IF (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id) <> ${snapshot.member_contents.length} THEN RAISE EXCEPTION 'MERGE_REVIEW: member row count changed'; END IF;
  IF (SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id) <> ${new Set(remainingCurations.map(row => row.celeb_id)).size} THEN RAISE EXCEPTION 'MERGE_REVIEW: celeb relationships lost'; END IF;
  ${curationResolutionReadbackSql}
  IF (SELECT count(*) FROM public.figure_book_characters WHERE content_id=keep_id) <> ${new Set(snapshot.figure_book_characters.map(row => row.celeb_id)).size} THEN RAISE EXCEPTION 'MERGE_REVIEW: character relationships lost'; END IF;
  IF (SELECT count(*) FROM public.figure_book_products p JOIN public.figure_book_editions e ON e.id=p.edition_id WHERE e.content_id=keep_id) <> ${snapshot.figure_book_products.length} THEN RAISE EXCEPTION 'MERGE_REVIEW: product history lost'; END IF;
  ${['records', 'notes', 'flow_nodes', 'curated_list_items', 'activity_logs', 'commerce_events', 'profession_book_picks'].map(table => `IF (SELECT count(*) FROM public.${table} WHERE content_id=keep_id) <> ${snapshot[table].filter(row => [pair.keep, pair.drop].includes(row.content_id)).length} THEN RAISE EXCEPTION 'MERGE_REVIEW: ${table} rows lost'; END IF;`).join('\n')}
  IF EXISTS(SELECT 1 FROM public.contents c WHERE c.id=keep_id AND (c.member_count IS DISTINCT FROM (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id) OR c.celeb_count IS DISTINCT FROM (SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id) OR c.record_count IS DISTINCT FROM (SELECT count(*) FROM public.member_contents WHERE content_id=keep_id)+(SELECT count(*) FROM public.celeb_contents WHERE content_id=keep_id))) THEN RAISE EXCEPTION 'MERGE_REVIEW: content counters differ from relationships'; END IF;
  DELETE FROM public.contents WHERE id=drop_id;
END;
${delimiter};
COMMIT;
SELECT 'MERGE_COMMITTED';
`
}
