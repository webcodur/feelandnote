/** LLM이 확정한 서지 변경만 실행한다. 18개 참조의 CAS·transaction 검수·재조회를 공유한다. */
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {spawnSync} from 'node:child_process'
import {runProcess,executeTemporaryMergeSql,checkFixedReferences} from '../merge-works.mjs'
import {SNAPSHOT_TABLES,REFERENCE_TABLES,hasArrayReference,referenceWhere,sqlLiteral} from './merge-work-sql.mjs'
import {CONTENT_ARRAY_REFERENCES} from './content-array-references.mjs'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {excludedBookEditionReason,reviewedBookEditionSelectionReason,bookTranslatorKey,BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH} from '../../../../../packages/content-search/src/book-edition-policy.ts'
import {isBookIntroductionSource} from '../../../../../packages/content-search/src/book-introduction-contract.ts'
import researchIntroductionContract from '../../contents/book-research-introduction-contract.ts'
const {researchIntroductionText}=researchIntroductionContract

const allowed={contents:['metadata','external_id','external_source','release_date'],content_locales:['title','creator','description','publisher','isbn','thumbnail_url','sources','affiliate_url','verified'],
 figure_book_editions:['title','creator','description','publisher','isbn','thumbnail_url','release_date','edition_kind','text_scope','sort_order','sources','verified','locale','content_id']}
const rowKey=(table,row)=>table==='content_locales'?JSON.stringify([row.content_id,row.locale]):String(row.id)
// 현재 출처는 보존하되, 조사 원문·옛 행 복사본을 새 변경안에 다시 넣지 않는다.
const archiveCopyPaths={
 contents:[...['unverifiedEditions','historicalMergedWorks','historicalMisattachedISBNs','historicalMisattachedReviews','historicalMixedMetadata','historicalReadingProvenance','rejectedLocaleData','historicalMisidentifiedContent','historicalRepresentativeScope','historicalRepresentativeIsbn'].map(key=>['metadata',key]),
  ...['unverifiedEditions','historicalMixedLocale','historicalMixedMetadata','detachedLocaleData'].map(key=>['metadata','figureBook',key])],
 content_locales:['legacy_isbn_restoration','original_value','originalRows','sourceSnapshot'].map(key=>['sources',key]),
 figure_book_editions:['legacy_isbn_restoration','original_value','originalRows','sourceSnapshot'].map(key=>['sources',key])
}
const pathValue=(row,path)=>path.reduce((value,key)=>value?.[key],row)
function preventNewArchiveCopies(table,before,patch){
 const after={...before,...patch}
 for(const path of archiveCopyPaths[table]??[]){
  const previous=pathValue(before,path),next=pathValue(after,path)
  if(next!==undefined&&!isDeepStrictEqual(previous,next))throw Error('Catalog patch must not create or restore research archives: '+path.join('.'))
 }
 if(['content_locales','figure_book_editions'].includes(table)&&after.sources?.description?.type==='backup-restored'
  &&!isDeepStrictEqual(before.sources?.description,after.sources.description))throw Error('Catalog patch must not create or restore research archives: sources.description')
}
const ids=workIds=>{if(!Array.isArray(workIds)||!workIds.length||workIds.length>100||workIds.some(id=>typeof id!=='string'||!id||id.includes('\0')))throw Error('Assigned work IDs required (1..100)');return [...new Set(workIds)]}
const where=(table,workIds,alias='')=>workIds.map(id=>referenceWhere(table,sqlLiteral(id),sqlLiteral(id),alias)).map(value=>'('+value+')').join(' OR ')
const json=value=>sqlLiteral(JSON.stringify(value))+'::jsonb'
const value=v=>v===null?'NULL':typeof v==='object'?json(v):typeof v==='boolean'?(v?'TRUE':'FALSE'):typeof v==='number'&&Number.isFinite(v)?String(v):sqlLiteral(v)
function snapshotCheck(snapshot){for(const table of SNAPSHOT_TABLES)if(!Array.isArray(snapshot?.[table]))throw Error('Missing catalog snapshot: '+table)}
function reviewedIntroductionLanguage(before,patch,proof){
 const method=patch.sources?.description_method,sourceLocale=patch.sources?.description_source_locale
 return method==='research'&&sourceLocale===before.locale
  ||method==='translation'&&['ko','en'].includes(proof.referenceLocale)&&proof.referenceLocale!==before.locale&&sourceLocale===proof.referenceLocale
}

function reviewedPlaceholderReference(before,proof,snapshot){
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const sources=before.sources??{}
 const physicalSource=Object.values(sources).some(value=>typeof value==='string'&&(/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(value)||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(value)&&value!==sources.description))
 if(proof?.method!=='independent_placeholder_review'||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)
  ||proof.locale!==before.locale||proof.editionTitle!==before.title||[before.isbn,before.publisher,before.release_date,before.releaseDate].some(value=>String(value??'').trim())
  ||sources.edition_key||sources.provider_edition_url||sources.provider_edition_isbn||physicalSource
  ||!independentSource(proof.sourceUrl)||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==proof.referenceLocale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||!String(proof.referenceCreator??'').trim()
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope}))
  throw Error('Placeholder removal requires an exact unverified row and independently reviewed same-work physical edition')
 return reference
}

export function buildCatalogRepairSnapshotSql(workIds) {
 const assigned=ids(workIds)
 return `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL statement_timeout='60s';
SELECT jsonb_build_object(${SNAPSHOT_TABLES.map(table=>`${sqlLiteral(table)},(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.${table} t WHERE ${where(table,assigned,'t')})`).join(',')});COMMIT;`
}

// 전권 세트와 그 안의 첫 권은 동일본문 판본이 아니다. 검수한 완질만 대표로 남긴다.
function reviewedCompleteSetReference(before,proof,snapshot){
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const translator=bookTranslatorKey(proof?.translators)
 const selected=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 if(proof?.method!=='independent_complete_set_review'||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)
  ||proof.locale!==before.locale||proof.editionTitle!==before.title||!toIsbn13(before.isbn??'')||toIsbn13(proof.isbn??'')!==toIsbn13(before.isbn)
  ||before.edition_kind!=='volume'||before.text_scope!=='volume/1'||proof.volumeNumber!==1
  ||!Number.isInteger(proof.totalVolumes)||proof.totalVolumes<2||proof.totalVolumes>999||proof.completeSet!==true
  ||!independentSource(proof.sourceUrl)||!independentSource(proof.referenceSourceUrl)||proof.sourceUrl===proof.referenceSourceUrl
  ||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||!String(proof.referenceCreator??'').trim()
  ||before.creator!==reference.creator||reference.edition_kind!=='full'||reference.text_scope!=='complete'
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')
  ||toIsbn13(reference.isbn)===toIsbn13(before.isbn)||!selected||toIsbn13(selected.isbn??'')!==toIsbn13(reference.isbn)
  ||!translator||bookTranslatorKey(before.sources?.translators)!==translator||bookTranslatorKey(reference.sources?.translators)!==translator
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!String(reference.description??'').trim()||isBookIntroductionSource(reference.description)||!independentSource(reference.sources?.description))
  throw Error('Complete-set removal requires exact selected whole set, included first volume, same verified translator and independent ISBN sources')
 return reference
}
function reviewedNonstartReference(before,proof,snapshot){
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const selected=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work?.metadata?.figureBook??{}
 const a=bookTranslatorKey(before.sources?.translators),b=bookTranslatorKey(reference?.sources?.translators)
 const reviewedTranslator=bookTranslatorKey(proof?.translators)
 const sameText=proof?.textIdentity==='translation'&&reviewedTranslator
  &&(a===reviewedTranslator&&b===reviewedTranslator
   ||proof.reviewedTranslationAttribution===true&&(!a||a===reviewedTranslator)&&(!b||b===reviewedTranslator))
  ||proof?.textIdentity==='original'&&!a&&!b&&proof.originalLanguage===before.locale&&figure.originalLanguage===before.locale&&independentSource(figure.identityEvidence)
 const selectedStart=reference?.edition_kind==='volume'&&reference.text_scope==='volume/1'
  ||reference?.edition_kind==='full'&&['full','complete'].includes(reference.text_scope)
  ||proof?.referenceVolumeNumber===1&&reference?.edition_kind==null&&reference?.text_scope==null
 if(proof?.method!=='independent_nonstart_volume_review'||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)
  ||proof.locale!==before.locale||proof.editionTitle!==before.title||!toIsbn13(before.isbn??'')||toIsbn13(proof.isbn??'')!==toIsbn13(before.isbn)
  ||!Number.isInteger(proof.volumeNumber)||proof.volumeNumber<2||proof.volumeNumber>999||proof.continuousText!==true||!sameText
  ||proof.referenceVolumeNumber!==undefined&&proof.referenceVolumeNumber!==1
  ||!independentSource(proof.sourceUrl)||!independentSource(proof.referenceSourceUrl)||proof.sourceUrl===proof.referenceSourceUrl
  ||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||!String(proof.referenceCreator??'').trim()||before.creator!==reference.creator
  ||!selectedStart
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')||toIsbn13(reference.isbn)===toIsbn13(before.isbn)
  ||!selected||toIsbn13(selected.isbn??'')!==toIsbn13(reference.isbn)
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!String(reference.description??'').trim()||isBookIntroductionSource(reference.description)||!independentSource(reference.sources?.description))
  throw Error('Nonstart removal requires exact selected first or whole edition, source-reviewed continuous body and verified original or same translator')
 return reference
}
export async function captureCatalogRepairSnapshot(_db,workIds,spawn) {
 const sql=buildCatalogRepairSnapshotSql(workIds),command='docker exec -i feelandnote-db psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d postgres'
 const snapshot=JSON.parse(runProcess('ssh',['-i','C:/Users/webco/.ssh/feelandnote_oracle','-o','BatchMode=yes','-o','ConnectTimeout=15','ubuntu@152.67.198.197',command],
  (command,args,options)=>(spawn??spawnSync)(command,args,{...options,input:sql})))
 snapshotCheck(snapshot);return snapshot
}

/** LLM이 확정한 소개 한 건을 검토한 snapshot의 동일 작품·언어·ISBN 행에만 조립한다. DB 쓰기는 기존 가드가 한다. */
export function expandReviewedExactIsbnIntroductionChanges(snapshot,reviews) {
 snapshotCheck(snapshot)
 if(!Array.isArray(reviews)||!reviews.length||reviews.length>200)throw Error('Explicit reviewed exact-ISBN introductions required')
 const changes=[],seen=new Set()
 for(const review of reviews){
  const {contentId,locale,isbn,description,sourceUrl,method,sourceLocale,reason}=review??{}
  const normalized=toIsbn13(isbn??'')
  if(!snapshot.contents.some(row=>row.id===contentId&&row.type==='BOOK')||!['ko','en'].includes(locale)||!normalized
   ||typeof description!=='string'||!description.trim()||isBookIntroductionSource(description)
   ||!independentSource(sourceUrl)||typeof reason!=='string'||!reason.trim()
   ||!['provider','research','translation'].includes(method)||!['ko','en'].includes(sourceLocale)
   ||(method==='translation'?sourceLocale===locale:sourceLocale!==locale))
   throw Error('Introduction expansion requires reviewed BOOK, exact ISBN, body language, independent source and explicit reason')
  let matched=0
  for(const table of ['content_locales','figure_book_editions']){
   const rows=snapshot[table].filter(row=>row.content_id===contentId&&row.locale===locale&&toIsbn13(row.isbn??'')===normalized)
   if(table==='content_locales'&&rows.length>1)throw Error('Ambiguous exact-ISBN locale row')
   for(const row of rows){
    const key=table+'|'+rowKey(table,row)
    if(seen.has(key))throw Error('Repeated introduction decision for the same reviewed row')
    seen.add(key);matched++
    const before=structuredClone(row)
    changes.push({table,before,patch:{description,sources:{...structuredClone(before.sources??{}),description:sourceUrl,
     description_method:method,description_source_locale:sourceLocale}},
     reviewedIntroductionCorrection:{isbn:before.isbn,locale:before.locale,editionTitle:before.title,sourceUrl,reason}})
   }
  }
  if(!matched)throw Error('No exact reviewed work/locale/ISBN introduction row')
 }
 return changes
}

export function planGuardedCatalogRepairs(workIds,snapshot,changes) {
 const assigned=ids(workIds);snapshotCheck(snapshot)
 if(!Array.isArray(changes)||!changes.length)throw Error('Confirmed catalog changes required')
 if(assigned.some(id=>!snapshot.contents.some(row=>row.id===id&&row.type==='BOOK')))throw Error('Assigned BOOK work missing')
 const expected=structuredClone(snapshot),changedKeys=new Map(),seen=new Set()
 for(const change of changes){
  const {table,before,patch,remove}=change??{}
  if(!allowed[table]||!before||Boolean(patch)===Boolean(remove)||remove&&table!=='figure_book_editions')throw Error('Unsupported catalog change')
  if(!assigned.includes(table==='contents'?before.id:before.content_id))throw Error('Catalog change outside assigned works')
  const key=rowKey(table,before),identity=table+'|'+key,index=expected[table].findIndex(row=>rowKey(table,row)===key)
  if(seen.has(identity)||index<0||!isDeepStrictEqual(snapshot[table].find(row=>rowKey(table,row)===key),before))throw Error('Catalog before row differs from full snapshot')
  seen.add(identity)
  const evidence=patch?.sources?.edition_selection_evidence
  if(evidence!==undefined&&!isDeepStrictEqual(evidence,before.sources?.edition_selection_evidence)
   &&(!Array.isArray(evidence)||evidence.some(proof=>!reviewedBookEditionSelectionReason({...before,
    isbn:proof?.isbn,title:proof?.edition_title,sources:{edition_selection_evidence:[proof]}})
    &&!reviewedBookEditionSelectionReason({...before,...patch,isbn:proof?.isbn,title:proof?.edition_title,
     sources:{edition_selection_evidence:[proof]}}))))throw Error('Selection evidence must be an array of reviews with canonical selection reasons and valid source evidence')
  const selectionProof=change.reviewedSelectionExclusion
  const placeholderProof=change.reviewedPlaceholderRemoval
  const setProof=change.reviewedCompleteSetVolumeRemoval
  const nonstartProof=change.reviewedNonstartEditionRemoval
  if(nonstartProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||setProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Nonstart review is only valid for explicit later-volume removal')
  if(nonstartProof!==undefined&&nonstartProof.referenceAfterPatch!==true)reviewedNonstartReference(before,nonstartProof,snapshot)
  if(setProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Complete-set review is only valid for explicit included-volume removal')
  if(setProof!==undefined)reviewedCompleteSetReference(before,setProof,snapshot)
  if(placeholderProof!==undefined&&(!remove||selectionProof!==undefined))throw Error('Placeholder review is only valid for explicit edition removal')
  if(placeholderProof!==undefined)reviewedPlaceholderReference(before,placeholderProof,snapshot)
  if(selectionProof!==undefined&&(!remove||!independentSource(selectionProof?.source_url)
   ||!reviewedBookEditionSelectionReason({...before,sources:{edition_selection_evidence:[selectionProof]}})))throw Error('Source-reviewed edition exclusion requires exact live ISBN, locale, title and independent selection evidence')
  if(remove){
   const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work.metadata?.figureBook??{}
   if(selectionProof===undefined&&placeholderProof===undefined&&setProof===undefined&&nonstartProof===undefined&&!excludedBookEditionReason({...before,editionKind:before.edition_kind,textScope:before.text_scope,workTitles:[figure.workTitle,figure.originalTitle].filter(Boolean)}))throw Error('Only a policy-excluded edition may be removed')
   if(snapshot.figure_book_products.some(product=>String(product.edition_id)===String(before.id)))throw Error('Edition has product history; removal forbidden')
   expected[table].splice(index,1)
  }else{
   if(!patch||Array.isArray(patch)||typeof patch!=='object'||!Object.keys(patch).length||Object.keys(patch).some(field=>!allowed[table].includes(field)||patch[field]===undefined))throw Error('Unsupported catalog patch field')
   preventNewArchiveCopies(table,before,patch)
   if(patch.content_id&&patch.content_id!==before.content_id){
    const proof=patch.sources?.work_attribution
    if(!assigned.includes(patch.content_id)||proof?.method!=='independent_work_review'||proof.content_id!==patch.content_id||proof.isbn!==before.isbn||!/^https:\/\//u.test(proof.source_url??''))throw Error('Edition move requires assigned owner and explicit source evidence')
   }
   expected[table][index]={...expected[table][index],...structuredClone(patch)}
   const keys=changedKeys.get(table)??new Set();keys.add(key);changedKeys.set(table,keys)
  }
 }
 for(const {before,reviewedPlaceholderRemoval:proof} of changes)if(proof!==undefined){
  const reference=reviewedPlaceholderReference(before,proof,snapshot)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference)))throw Error('Placeholder removal must retain the reviewed physical edition unchanged')
 }
 for(const {before,reviewedCompleteSetVolumeRemoval:proof} of changes)if(proof!==undefined){
  const reference=reviewedCompleteSetReference(before,proof,snapshot)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
   ||!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===before.locale&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)))
   throw Error('Complete-set removal must retain the reviewed whole edition and its representative ISBN unchanged')
 }
 for(const {before,reviewedNonstartEditionRemoval:proof} of changes)if(proof!==undefined){
  // 시작권 교체와 후속 삭제를 한 transaction으로 확정한 경우에도 최종 대표를 ISBN·본문으로 검수한다.
  const reference=reviewedNonstartReference(before,proof,proof.referenceAfterPatch===true?expected:snapshot)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
   ||!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===before.locale&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)))
   throw Error('Nonstart removal must retain the reviewed first or whole edition and its representative ISBN unchanged')
 }
 // 소개 보존 예외도 정확한 ISBN의 독립 원문을 읽은 명시 판단으로만 허용한다.
 for(const {table,before,patch,remove,reviewedIntroductionCorrection:proof,reviewedCompleteSetVolumeRemoval:setProof,reviewedNonstartEditionRemoval:nonstartProof,reviewedArchiveProvenanceDiscard:archiveProof} of changes){
  if(archiveProof!==undefined){
   const old=before.sources?.description,remaining=structuredClone(before.sources??{})
   const copiedSources=old?.original_sources===null||old?.original_sources&&typeof old.original_sources==='object'&&!Array.isArray(old.original_sources)
   const currentPointer=independentSource(old?.source)&&Object.keys(old).every(key=>['type','backup','source','verification'].includes(key))
   remaining.description=currentPointer?Object.fromEntries(Object.entries(old).filter(([key])=>!['type','backup'].includes(key))):null
   if(!['content_locales','figure_book_editions'].includes(table)||remove||proof!==undefined||setProof!==undefined||nonstartProof!==undefined
    ||archiveProof.method!=='discard_raw_source_copy'||archiveProof.path!=='sources.description'||!String(archiveProof.reason??'').trim()
    ||old?.type!=='backup-restored'||typeof old.backup!=='string'||!copiedSources&&!currentPointer
    ||!patch||Object.keys(patch).length!==1||!isDeepStrictEqual(patch.sources,remaining))
    throw Error('Raw provenance discard may only remove a verified backup wrapper while retaining introduction and every live source field')
   continue
  }
  if(setProof!==undefined||nonstartProof!==undefined)continue // 분권 소개는 검수된 대표의 정상 소개로 대표된다. 감상 필드는 보존한다.
  if(proof!==undefined){
   if(proof?.method==='independent_locale_reference_introduction_review'){
    const reference=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===proof.referenceLocale
     &&row.title===proof.referenceWorkTitle&&row.creator===proof.referenceCreator&&toIsbn13(row.isbn??'')===toIsbn13(proof.isbn??''))
    if(table!=='content_locales'||remove||!patch||before.isbn!==null||before.sources?.primary!=='none'
     ||proof.contentId!==before.content_id||proof.referenceLocale===before.locale||!reference||!toIsbn13(reference.isbn??'')
     ||!String(proof.referenceWorkTitle??'').trim()||!String(proof.referenceCreator??'').trim()
     ||patch.isbn!==undefined&&patch.isbn!==null||patch.sources?.primary!=='none'
     ||!reviewedIntroductionLanguage(before,patch,proof)
     ||proof.locale!==before.locale||proof.editionTitle!==(patch.title??before.title)
     ||!independentSource(proof.sourceUrl)||patch.sources.description!==proof.sourceUrl||!String(proof.reason??'').trim()
     ||!Array.isArray(proof.evidence)||proof.evidence.some(item=>!independentSource(item?.url)))
     throw Error('Locale reference introduction correction requires the exact same-work ISBN, author and independent source review')
    researchIntroductionText({contentId:before.content_id,locale:before.locale,title:patch.title??before.title,creator:patch.creator??before.creator,
     description:patch.description,sourceUrl:proof.sourceUrl,evidence:proof.evidence})
    continue
   }
   if(proof?.method==='independent_work_introduction_review'){
    const reference=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===proof.referenceLocale
     &&row.title===proof.referenceWorkTitle&&row.creator===proof.referenceCreator)
    const workRows=[...snapshot.content_locales,...snapshot.figure_book_editions].filter(row=>row.content_id===before.content_id)
    if(table!=='content_locales'||remove||!patch||proof.contentId!==before.content_id||before.isbn!==null
     ||before.sources?.primary!=='none'||!reference||!String(proof.referenceWorkTitle??'').trim()||!String(proof.referenceCreator??'').trim()
     ||workRows.some(row=>String(row.isbn??'').trim())||patch.isbn!==undefined&&patch.isbn!==null
     ||patch.sources?.primary!=='none'||!reviewedIntroductionLanguage(before,patch,proof)
     ||proof.locale!==before.locale||proof.editionTitle!==(patch.title??before.title)
     ||!independentSource(proof.sourceUrl)||patch.sources.description!==proof.sourceUrl||!String(proof.reason??'').trim()
     ||!Array.isArray(proof.evidence)||proof.evidence.some(item=>!independentSource(item?.url)))
     throw Error('Work introduction correction requires an exact ISBN-less original, author and independent source review')
    researchIntroductionText({contentId:before.content_id,locale:before.locale,title:patch.title??before.title,creator:patch.creator??before.creator,
     description:patch.description,sourceUrl:proof.sourceUrl,evidence:proof.evidence})
    continue
   }
   let isbn=toIsbn13(before.isbn??'')
   if(!isbn&&table==='content_locales'&&before.isbn===null&&before.sources?.primary==='none'){
    const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId)
     &&row.content_id===before.content_id&&row.locale===proof?.referenceLocale&&toIsbn13(row.isbn??'')===toIsbn13(proof?.isbn??''))
    if(reference&&toIsbn13(reference.isbn??'')&&['translation','research'].includes(patch?.sources?.description_method)
     &&patch.sources.description_source_locale===(patch.sources.description_method==='translation'?reference.locale:before.locale))isbn=toIsbn13(reference.isbn)
   }
   const replacement=typeof patch?.description==='string'&&patch.description.trim()&&!isBookIntroductionSource(patch.description)
    &&patch.sources?.description===proof?.sourceUrl
   const clear=patch?.description===null&&patch.sources?.description===null
   if(table==='contents'||remove||!patch||!isbn||toIsbn13(proof?.isbn??'')!==isbn
    ||proof.locale!==before.locale||proof.editionTitle!==(patch.title??before.title)
    ||typeof proof.reason!=='string'||!proof.reason.trim()||!independentSource(proof.sourceUrl)
    ||!replacement&&!clear)throw Error('Introduction correction requires exact ISBN, locale, title and independently reviewed source text')
   continue
  }
  if(table==='contents'||!String(before.description??'').trim()||isBookIntroductionSource(before.description))continue
  const retained=[...expected.content_locales,...expected.figure_book_editions].some(row=>row.content_id===before.content_id&&row.locale===before.locale&&row.description===before.description
   &&isDeepStrictEqual(row.sources?.description,before.sources?.description))
  if(!retained)throw Error('Existing introduction must be retained before changing/removing its row')
 }
 return {assigned,expected,changedKeys}
}

function rowSql(table,row,alias=''){const prefix=alias?alias+'.':'';return table==='content_locales'?`${prefix}content_id=${sqlLiteral(row.content_id)} AND ${prefix}locale=${sqlLiteral(row.locale)}`:`${prefix}id::text=${sqlLiteral(String(row.id))}`}
const normalize=(table,row,changedKeys)=>{if(!changedKeys.get(table)?.has(rowKey(table,row)))return row;const result={...row};delete result.updated_at;return result}
function aggregateCheck(table,workIds,expected,changedKeys=null){
 const keys=[...(changedKeys?.get(table)??[])],expression=keys.length?`CASE WHEN ${keys.map(key=>{
  const row=expected.find(row=>rowKey(table,row)===key)
  return row?`(${rowSql(table,row,'t')})`:'FALSE'
 }).join(' OR ')} THEN to_jsonb(t)-'updated_at' ELSE to_jsonb(t) END`:'to_jsonb(t)'
 const rows=changedKeys?expected.map(row=>normalize(table,row,changedKeys)):expected
 return `IF (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM (SELECT ${expression} v FROM public.${table} t WHERE ${where(table,workIds,'t')}) a) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM jsonb_array_elements(${json(rows)}) v) THEN RAISE EXCEPTION 'CATALOG_REPAIR: rowset mismatch in ${table}'; END IF;`
}
export function buildGuardedCatalogRepairSql(workIds,snapshot,changes) {
 const plan=planGuardedCatalogRepairs(workIds,snapshot,changes)
 // 기존 후속을 먼저 제거해야 시작권 ISBN 교체가 중복 판본 trigger와 충돌하지 않는다.
 // 삭제 자체는 위의 전체 변경안 검수와 상품·참조 검사를 통과한 행만 허용된다.
 const ordered=[...changes].sort((a,b)=>Number(!a.remove)-Number(!b.remove)
  ||(a.remove?0:Number(a.table!=='contents')-Number(b.table!=='contents')))
 const statements=ordered.map(({table,before,patch,remove})=>remove?
  `IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.figure_book_editions'::regclass AND (n.nspname<>'public' OR r.relname<>'figure_book_products' OR cardinality(c.conkey)<>1 OR a.attname<>'edition_id')) THEN RAISE EXCEPTION 'CATALOG_REPAIR: unhandled edition reference';END IF;
IF EXISTS(SELECT 1 FROM public.figure_book_products WHERE edition_id::text=${sqlLiteral(String(before.id))}) THEN RAISE EXCEPTION 'CATALOG_REPAIR: edition product history';END IF;DELETE FROM public.${table} WHERE ${rowSql(table,before)};`:
  `UPDATE public.${table} SET ${Object.entries(patch).map(([field,v])=>field+'='+value(v)).join(',')} WHERE ${rowSql(table,before)};`).join('\n')
 let delimiter='$catalog_repair$';const raw=JSON.stringify({snapshot,changes});for(let n=1;raw.includes(delimiter);n++)delimiter=`$catalog_repair_${n}$`
 return `\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';DO ${delimiter} BEGIN
${SNAPSHOT_TABLES.map(table=>`PERFORM 1 FROM public.${table} t WHERE ${where(table,plan.assigned,'t')} ORDER BY to_jsonb(t)::text FOR UPDATE;`).join('\n')}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,snapshot[table])).join('\n')}
${statements}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,plan.expected[table],plan.changedKeys)).join('\n')}
END ${delimiter};COMMIT;SELECT 'MERGE_COMMITTED';`
}

export async function guardedCatalogRepairs(db,workIds,changes,{capture=captureCatalogRepairSnapshot,execute}={}) {
 const snapshot=await capture(db,ids(workIds)),plan=planGuardedCatalogRepairs(workIds,snapshot,changes)
 executeTemporaryMergeSql(buildGuardedCatalogRepairSql(workIds,snapshot,changes),randomUUID(),execute)
 const actual=await capture(db,plan.assigned);snapshotCheck(actual)
 for(const table of SNAPSHOT_TABLES){
  const expected=plan.expected[table].map(row=>normalize(table,row,plan.changedKeys)),after=actual[table].map(row=>normalize(table,row,plan.changedKeys))
  // object key order is irrelevant; row order can change after SQL UPDATE.
  const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value
  const canonical=rows=>rows.map(row=>JSON.stringify(stable(row))).sort()
  if(!isDeepStrictEqual(canonical(expected),canonical(after)))throw Error('Catalog repair readback mismatch: '+table)
 }
 return {changed:changes.length,removed:changes.filter(row=>row.remove).length,checkedTables:SNAPSHOT_TABLES.length}
}

// 이 명세는 LLM이 작품 전체를 검수해 제외를 확정한 경우에만 전달한다.
// 한 판본의 제외 판단은 guardedCatalogRepairs의 판본 교정으로 처리한다.
const exclusionTables=['figure_book_characters','figure_book_editions','figure_book_contents','content_locales','contents']
const protectedTables=SNAPSHOT_TABLES.filter(table=>!exclusionTables.includes(table))
function touchesWork(table,row,contentId,snapshot){
 if(table==='contents')return row.id===contentId
 if(table==='figure_book_products')return snapshot.figure_book_editions.some(edition=>edition.content_id===contentId&&String(edition.id)===String(row.edition_id))
 return row.content_id===contentId||hasArrayReference(table,row,contentId)
}
function independentSource(sourceUrl){
 let url;try{url=new URL(sourceUrl)}catch{return false}
 return url.protocol==='https:'&&!url.username&&!url.password&&!/(^|\.)openlibrary\.org$/iu.test(url.hostname)
  &&!['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname)
  &&![...url.searchParams.keys()].some(key=>/(?:api.?key|token|secret|password|authorization)/iu.test(key))
}
export function planGuardedCatalogExclusions(workIds,snapshot,reviewedExclusions,{mode='whole_work'}={}){
 const assigned=ids(workIds);snapshotCheck(snapshot)
 if(!['whole_work','catalog_only'].includes(mode))throw Error('Unsupported explicit catalog exclusion mode')
 const deleteTables=mode==='catalog_only'?exclusionTables.slice(0,3):exclusionTables
 const blockingTables=mode==='catalog_only'?['figure_book_products']:protectedTables
 if(!Array.isArray(reviewedExclusions)||!reviewedExclusions.length)throw Error('LLM-reviewed exclusions required')
 const seen=new Set(),excluded=[],blocked=[]
 for(const review of reviewedExclusions){
  const {contentId,isbns,reason,sourceUrl}=review??{}
  if(!assigned.includes(contentId)||seen.has(contentId)||!snapshot.contents.some(row=>row.id===contentId&&row.type==='BOOK'))throw Error('Exclusion must identify one assigned BOOK')
  if(typeof reason!=='string'||!reason.trim()||typeof sourceUrl!=='string'||!independentSource(sourceUrl)||!Array.isArray(isbns))throw Error('Reviewed exclusion reason, independent HTTPS source and exhaustive ISBN list required')
  seen.add(contentId)
  const actualRows=[...snapshot.figure_book_editions,...snapshot.content_locales.filter(row=>row.sources?.primary!=='none')].filter(row=>row.content_id===contentId&&String(row.isbn??'').trim())
  const actual=actualRows.map(row=>toIsbn13(String(row.isbn))),reviewed=isbns.map(isbn=>typeof isbn==='string'?toIsbn13(isbn):null)
  if(actual.some(isbn=>!isbn)||reviewed.some(isbn=>!isbn)||!isDeepStrictEqual([...new Set(actual)].sort(),[...new Set(reviewed)].sort()))throw Error('Exclusion evidence must cover EVERY current edition and real-locale ISBN')
  const references=blockingTables.flatMap(table=>{const count=snapshot[table].filter(row=>touchesWork(table,row,contentId,snapshot)).length;return count?[{table,count}]:[]})
  if(references.length)blocked.push({contentId,reason:'protected_references',references})
  else excluded.push(contentId)
 }
 const expected=structuredClone(snapshot)
 for(const table of deleteTables)expected[table]=expected[table].filter(row=>!excluded.some(id=>touchesWork(table,row,id,snapshot)))
 return {assigned,excluded,blocked,expected,mode,deleteTables,blockingTables}
}

export function buildGuardedCatalogExclusionSql(workIds,snapshot,reviewedExclusions,options={}){
 const plan=planGuardedCatalogExclusions(workIds,snapshot,reviewedExclusions,options)
 if(plan.blocked.length)throw Error('Protected references block reviewed exclusion')
 const target=plan.excluded,raw=JSON.stringify({snapshot,reviewedExclusions})
 let delimiter='$catalog_exclusion$';for(let n=1;raw.includes(delimiter);n++)delimiter=`$catalog_exclusion_${n}$`
 const contentsChildren=REFERENCE_TABLES.map(sqlLiteral).join(',')
 // FK 없는 배열·활동 참조의 신규 삽입만 기존 merge와 같은 잠금으로 막는다.
 const arrayLocks=[...new Set(['activity_logs',...CONTENT_ARRAY_REFERENCES.map(ref=>ref.table)])]
 // 운영 identity-change 트리거가 삭제에 READ COMMITTED를 요구한다. merge와 같은 잠금·CAS를 유지한다.
 return `\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL READ COMMITTED;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';DO ${delimiter} BEGIN
LOCK TABLE ${arrayLocks.map(table=>'public.'+table).join(',')} IN SHARE ROW EXCLUSIVE MODE;
${SNAPSHOT_TABLES.map(table=>`PERFORM 1 FROM public.${table} t WHERE ${where(table,plan.assigned,'t')} ORDER BY to_jsonb(t)::text FOR UPDATE;`).join('\n')}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,snapshot[table])).join('\n')}
IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
 LEFT JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=c.confkey[1]
 WHERE c.contype='f' AND c.confrelid IN (${plan.deleteTables.map(table=>`'public.${table}'::regclass`).join(',')}) AND (
 n.nspname<>'public' OR cardinality(c.conkey)<>1 OR cardinality(c.confkey)<>1 OR NOT (
  c.confrelid='public.contents'::regclass AND r.relname IN (${contentsChildren}) AND a.attname='content_id' AND b.attname='id'
  OR c.confrelid='public.figure_book_contents'::regclass AND r.relname IN ('figure_book_characters','figure_book_editions') AND a.attname='content_id' AND b.attname='content_id'
  OR c.confrelid='public.figure_book_editions'::regclass AND r.relname='figure_book_products' AND a.attname='edition_id' AND b.attname='id'
 ))) THEN RAISE EXCEPTION 'CATALOG_EXCLUSION: unhandled foreign reference';END IF;
${plan.blockingTables.map(table=>`IF EXISTS(SELECT 1 FROM public.${table} t WHERE ${where(table,target,'t')}) THEN RAISE EXCEPTION 'CATALOG_EXCLUSION: protected ${table} reference';END IF;`).join('\n')}
${plan.deleteTables.map(table=>`DELETE FROM public.${table} t WHERE ${where(table,target,'t')};`).join('\n')}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,plan.expected[table])).join('\n')}
END ${delimiter};COMMIT;SELECT 'MERGE_COMMITTED';`
}

/** checkReferences(contentId) throws or returns false when code/Remotion still uses this exact ID. */
export async function guardedCatalogExclusions(db,workIds,reviewedExclusions,{
 capture=captureCatalogRepairSnapshot,execute,checkReferences=contentId=>checkFixedReferences({drop:contentId}),mode='whole_work',
}={}){
 const snapshot=await capture(db,ids(workIds)),plan=planGuardedCatalogExclusions(workIds,snapshot,reviewedExclusions,{mode})
 const blocked=[...plan.blocked]
 for(const contentId of mode==='whole_work'?plan.excluded:[]){
  try{if(await checkReferences(contentId)===false)blocked.push({contentId,reason:'fixed_references'})}
  catch{blocked.push({contentId,reason:'fixed_references'})}
 }
 // 요청 batch에 보호된 작품이 있으면 그 batch 전체를 반영하지 않는다.
 const catalogResult=mode==='catalog_only'?{mode,catalogExcluded:0}:{}
 if(blocked.length)return {excluded:0,...catalogResult,blocked,checkedTables:SNAPSHOT_TABLES.length}
 executeTemporaryMergeSql(buildGuardedCatalogExclusionSql(workIds,snapshot,reviewedExclusions,{mode}),randomUUID(),execute)
 const actual=await capture(db,plan.assigned);snapshotCheck(actual)
 const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value
 const canonical=rows=>rows.map(row=>JSON.stringify(stable(row))).sort()
 for(const table of SNAPSHOT_TABLES)if(!isDeepStrictEqual(canonical(plan.expected[table]),canonical(actual[table])))throw Error('Catalog exclusion readback mismatch: '+table)
 // catalog_only는 등록 카탈로그만 제거한다. 소비 책장의 locale fallback 노출 차단을 뜻하지 않는다.
 return {excluded:mode==='catalog_only'?0:plan.excluded.length,...(mode==='catalog_only'?{mode,catalogExcluded:plan.excluded.length}:{}),contentIds:plan.excluded,blocked:[],checkedTables:SNAPSHOT_TABLES.length}
}
