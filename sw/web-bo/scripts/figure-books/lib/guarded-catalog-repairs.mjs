/** LLM이 확정한 서지 변경만 실행한다. 18개 참조의 CAS·transaction 검수·재조회를 공유한다. */
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {spawnSync} from 'node:child_process'
import {runProcess,executeTemporaryMergeSql,checkFixedReferences} from '../merge-works.mjs'
import {SNAPSHOT_TABLES,REFERENCE_TABLES,hasArrayReference,referenceWhere,sqlLiteral} from './merge-work-sql.mjs'
import {CONTENT_ARRAY_REFERENCES} from './content-array-references.mjs'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {excludedBookEditionReason,reviewedBookEditionSelectionReason,reviewedBookWorkSelectionReason,bookTranslatorKey,BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH,SERVICE_BOOK_EDITION_KINDS} from '../../../../../packages/content-search/src/book-edition-policy.ts'
import {isBookIntroductionSource} from '../../../../../packages/content-search/src/book-introduction-contract.ts'
import researchIntroductionContract from '../../contents/book-research-introduction-contract.ts'
import mediaIntroductionContract from '../../contents/media-introduction-contract.ts'
const {researchIntroductionText}=researchIntroductionContract
const {mediaIntroductionText}=mediaIntroductionContract
export const PROVIDER_BIBLIOGRAPHIC_DESCRIPTION_REVIEW='provider_bibliographic_description_review'
export const CATALOG_REPRESENTATIVE_SELECTION_REVIEW='independent_catalog_representative_selection_review'

const allowed={contents:['metadata','external_id','external_source','release_date'],content_locales:['title','creator','description','publisher','isbn','thumbnail_url','sources','affiliate_url','verified'],
 figure_book_editions:['title','creator','description','publisher','isbn','thumbnail_url','release_date','edition_kind','text_scope','sort_order','sources','verified','locale','content_id'],
 figure_book_characters:['relation_type']}
const rowKey=(table,row)=>table==='content_locales'?JSON.stringify([row.content_id,row.locale])
 :table==='figure_book_characters'?JSON.stringify([row.content_id,row.celeb_id]):String(row.id)
// 현재 출처는 보존하되, 조사 원문·옛 행 복사본을 새 변경안에 다시 넣지 않는다.
const archiveCopyPaths={
 contents:[...['unverifiedEditions','unverifiedReviews','restoredOriginalRows','historicalMergedWorks','historicalMisattachedISBNs','historicalMisattachedReviews','historicalMixedMetadata','historicalReadingProvenance','rejectedLocaleData','historicalMisidentifiedContent','historicalRepresentativeScope','historicalRepresentativeIsbn'].map(key=>['metadata',key]),
  ...['unverifiedEditions','historicalMixedLocale','historicalMixedMetadata','detachedLocaleData','rejectedLocaleData'].map(key=>['metadata','figureBook',key])],
 content_locales:['legacy_isbn_restoration','original_value','originalRows','sourceSnapshot'].map(key=>['sources',key]),
 figure_book_editions:['legacy_isbn_restoration','original_value','originalRows','sourceSnapshot'].map(key=>['sources',key])
}
const pathValue=(row,path)=>path.reduce((value,key)=>value?.[key],row)
const provenanceObject=value=>{if(typeof value==='string'){try{value=JSON.parse(value)}catch{return undefined}}
 return value&&typeof value==='object'&&!Array.isArray(value)?value:undefined}
const hasBackupProvenance=value=>{const object=provenanceObject(value)
 return object?.type==='backup-restored'||object?.type==='locale-translation'&&hasBackupProvenance(object.original_sources?.description)}
const containsLiveUrl=value=>typeof value==='string'?/https?:\/\//iu.test(value):value&&typeof value==='object'?Object.values(value).some(containsLiveUrl):false
function discardedBackupProvenance(value,before,retainedSourceUrl){
 const old=provenanceObject(value)
 if(old?.type==='locale-translation'){
  if(!Object.keys(old).every(key=>['type','snapshot_hash','source_locale','original_sources','source_content_id'].includes(key))
   ||!['ko','en'].includes(old.source_locale)||old.source_content_id!==before.content_id
   ||typeof old.snapshot_hash!=='string'||!old.snapshot_hash||containsLiveUrl(old))return undefined
  const nested=provenanceObject(old.original_sources?.description)
  return nested?.type==='backup-restored'&&discardedBackupProvenance(nested,before)===null?null:undefined
 }
 if(old?.type!=='backup-restored'||typeof old.backup!=='string'||!old.backup.trim())return undefined
 if(retainedSourceUrl!==undefined){
  const copied=old.original_sources,other=structuredClone(old)
  // 현행 포인터를 보존하는 것이며, OpenLibrary를 독립 본문 근거로 승격하지 않는다.
  const livePointer=typeof retainedSourceUrl==='string'&&(independentSource(retainedSourceUrl)||/^https:\/\/openlibrary\.org\/(?:works\/OL\d+W|books\/OL\d+M)\/?$/u.test(retainedSourceUrl))
  if(!livePointer||!Object.keys(old).every(key=>['type','backup','verification','original_locale','original_sources'].includes(key))
   ||!copied||typeof copied!=='object'||Array.isArray(copied)
   ||!Object.keys(copied).every(key=>['primary','thumbnail','description'].includes(key))||copied.description!==retainedSourceUrl)return undefined
  delete other.original_sources.description
  return containsLiveUrl(other)?undefined:retainedSourceUrl
 }
 const currentPointer=independentSource(old.source)&&Object.keys(old).every(key=>['type','backup','source','verification'].includes(key))
 if(currentPointer)return Object.fromEntries(Object.entries(old).filter(([key])=>!['type','backup'].includes(key)))
 const copiedSources=old.original_sources===null||old.original_sources&&typeof old.original_sources==='object'&&!Array.isArray(old.original_sources)
 return copiedSources&&!containsLiveUrl(old)?null:undefined
}
function preventNewArchiveCopies(table,before,patch){
 const after={...before,...patch}
 for(const path of archiveCopyPaths[table]??[]){
  const previous=pathValue(before,path),next=pathValue(after,path)
  if(next!==undefined&&!isDeepStrictEqual(previous,next))throw Error('Catalog patch must not create or restore research archives: '+path.join('.'))
 }
 if(table==='contents'){
  const oldSelection=before.metadata?.figureBook?.workSelectionEvidence,newSelection=after.metadata?.figureBook?.workSelectionEvidence
  if(newSelection!==undefined&&!isDeepStrictEqual(oldSelection,newSelection)
   &&(!Array.isArray(newSelection)||newSelection.some(proof=>!reviewedBookWorkSelectionReason({contentId:before.id,
    metadata:{...after.metadata,figureBook:{...after.metadata.figureBook,workSelectionEvidence:[proof]}}}))))
   throw Error('Work selection evidence requires exact reviewed original identity and independent source')
  const previous=before.metadata?.figureBook?.foreignEditions,next=after.metadata?.figureBook?.foreignEditions
  if(Array.isArray(next))for(const [index,edition] of next.entries())for(const key of ['originalLocale','originalEdition']){
   if(edition?.[key]!==undefined&&!isDeepStrictEqual(Array.isArray(previous)?previous[index]?.[key]:undefined,edition[key]))
    throw Error('Catalog patch must not create or restore research archives: metadata.figureBook.foreignEditions.'+index+'.'+key)
  }
 }
 if(['content_locales','figure_book_editions'].includes(table)&&hasBackupProvenance(after.sources?.description)
  &&!isDeepStrictEqual(before.sources?.description,after.sources.description))throw Error('Catalog patch must not create or restore research archives: sources.description')
}
const ids=workIds=>{if(!Array.isArray(workIds)||!workIds.length||workIds.length>100||workIds.some(id=>typeof id!=='string'||!id||id.includes('\0')))throw Error('Assigned work IDs required (1..100)');return [...new Set(workIds)]}
const where=(table,workIds,alias='')=>workIds.map(id=>referenceWhere(table,sqlLiteral(id),sqlLiteral(id),alias)).map(value=>'('+value+')').join(' OR ')
const json=value=>sqlLiteral(JSON.stringify(value))+'::jsonb'
const value=v=>v===null?'NULL':typeof v==='object'?json(v):typeof v==='boolean'?(v?'TRUE':'FALSE'):typeof v==='number'&&Number.isFinite(v)?String(v):sqlLiteral(v)
function snapshotCheck(snapshot){for(const table of SNAPSHOT_TABLES)if(!Array.isArray(snapshot?.[table]))throw Error('Missing catalog snapshot: '+table)}
// 관계를 새로 추정하지 않는다. 실제 책과 서비스 인물의 신원을 읽은 LLM의 정확한 기존 행 교정만 받는다.
function reviewedFigureRelation(snapshot,change){
 const {before,patch,remove,reviewedFigureRelation:proof}=change
 const source=url=>independentSource(url)&&new URL(url).hostname!=='[::1]'
  &&!/(^|\.)books\.google\.[a-z.]+$|(^|\.)googleapis\.com$/iu.test(new URL(url).hostname)
 const text=value=>typeof value==='string'&&value.trim().length>=20
 const named=value=>typeof value==='string'&&!!value.trim()&&!value.includes('\0')
 if(!proof||typeof proof!=='object'||Array.isArray(proof)||proof.method!=='independent_figure_relation_review'||proof.llmReviewed!==true
  ||typeof before.celeb_id!=='string'||!before.celeb_id.trim()||before.celeb_id.includes('\0')
  ||proof.contentId!==before.content_id||proof.celebId!==before.celeb_id||proof.beforeRelationType!==before.relation_type
  ||!['authored','appearance','related'].includes(before.relation_type)||!['ko','en'].includes(proof.locale)
  ||typeof proof.isbn!=='string'||!toIsbn13(proof.isbn)||!named(proof.editionTitle)||!named(proof.editionCreator)
  ||!named(proof.figureName)||!text(proof.identityStatement)||!text(proof.bodyEvidence)||!text(proof.reason)
  ||!source(proof.sourceUrl)||!source(proof.identitySourceUrl)||proof.sourceUrl===proof.identitySourceUrl
  ||Object.keys(change).some(key=>key.startsWith('reviewed')&&key!=='reviewedFigureRelation'))
  throw Error('Figure relation repair requires exact live identity, normal ISBN, independent book/person sources and explicit LLM review')
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const candidates=[...snapshot.figure_book_editions,...snapshot.content_locales].filter(row=>row.content_id===before.content_id
  &&row.locale===proof.locale&&toIsbn13(row.isbn??'')===toIsbn13(proof.isbn)
  &&row.title===proof.editionTitle&&row.creator===proof.editionCreator)
 const origin=proof.originalAuthorship
 const confirmedOriginal=origin?.method==='independent_original_authorship_review'&&origin.llmReviewed===true
  &&!remove&&proof.decision==='correct_role'&&before.relation_type==='appearance'&&proof.afterRelationType==='authored'
  &&origin.contentId===before.content_id&&named(figure.workTitle)&&named(figure.workCreator)&&named(figure.workIdentity)
  &&origin.workTitle===figure.workTitle&&origin.workCreator===figure.workCreator&&origin.workIdentity===figure.workIdentity
  &&origin.sourceUrl===figure.identityEvidence&&source(origin.sourceUrl)&&text(origin.bodyEvidence)
  &&proof.editionCreator===figure.workCreator
  &&candidates.some(row=>row.sources?.primary!=='none'&&reviewedBookEditionSelectionReason(row)==='abridged')
 if(!candidates.length||!confirmedOriginal&&!candidates.some(row=>row.sources?.primary!=='none'
  &&!excludedBookEditionReason({...row,editionKind:row.edition_kind,textScope:row.text_scope,
   workTitles:[figure.workTitle,figure.originalTitle].filter(Boolean)})))
  throw Error('Figure relation repair requires a retained live normal edition with exact ISBN/title/creator/locale')
 if(remove){
  const otherPerson=proof.decision==='remove_wrong_person'&&named(proof.actualPersonName)&&proof.actualPersonName.trim()!==proof.figureName.trim()
  const otherSubject=proof.decision==='remove_wrong_subject'&&proof.actualPersonName===undefined
   &&named(proof.actualSubjectName)&&proof.actualSubjectName.trim()!==proof.figureName.trim()
  if(proof.afterRelationType!==null||!otherPerson&&!otherSubject)
   throw Error('Figure relation removal requires an explicitly reviewed different person or actual book subject')
 }else if(!patch||Array.isArray(patch)||Object.keys(patch).length!==1||!Object.hasOwn(patch,'relation_type')
  ||!['authored','appearance'].includes(patch.relation_type)||patch.relation_type===before.relation_type
  ||proof.decision!=='correct_role'||proof.afterRelationType!==patch.relation_type)
  throw Error('Figure relation patch may only correct the reviewed authored/appearance role')
 return candidates
}
function reviewedIntroductionLanguage(before,patch,proof){
 const method=patch.sources?.description_method,sourceLocale=patch.sources?.description_source_locale
 return method==='research'&&sourceLocale===before.locale
  ||method==='translation'&&['ko','en'].includes(proof.referenceLocale)&&proof.referenceLocale!==before.locale&&sourceLocale===proof.referenceLocale
}
function reviewedProviderTranslationSource(reference,patch,proof){
 const sources=reference?.sources??{},sourceUrl=proof?.sourceUrl
 return patch?.sources?.description_method==='translation'
  &&sources.primary==='openlibrary'&&/^https:\/\/openlibrary\.org\/books\/OL\d+M\/?$/u.test(sourceUrl??'')
  &&sources.provider_edition_url===sourceUrl
  &&!!toIsbn13(reference.isbn??'')&&toIsbn13(sources.provider_edition_isbn??'')===toIsbn13(reference.isbn)
  &&String(reference.description??'').trim()&&!isBookIntroductionSource(reference.description)
  &&independentSource(sources.description)
  &&proof.evidence?.some(item=>item.url===sources.description)
}

// 정확한 등록 ISBN의 제공자 서지로 설명을 바로잡는다. 본문 완전성 검수는 아니다.
function reviewedProviderBibliographicDescription(change,snapshot){
 const {table,before,patch,remove,reviewedIntroductionCorrection:proof}=change
 const fail=()=>{throw Error('Provider bibliographic description requires exact registered ISBN, live prose and reviewed English edition metadata')}
 const edition=proof?.fetchedEdition,url=proof?.sourceUrl
 const match=typeof url==='string'?url.match(/^https:\/\/openlibrary\.org(\/books\/OL\d+M)$/u):null
 const isbn=toIsbn13(before.isbn??'')
 if(!edition||typeof edition!=='object'||Array.isArray(edition)
  ||['languages','isbn_10','isbn_13'].some(key=>edition[key]!==undefined&&!Array.isArray(edition[key])))fail()
 const languages=(edition?.languages??[]).map(item=>item?.key)
 const providerIsbns=[...(edition?.isbn_10??[]),...(edition?.isbn_13??[])].map(value=>toIsbn13(value)).filter(Boolean)
 const expectedSources={...structuredClone(before.sources??{}),description:url,description_method:'provider',description_source_locale:'en'}
 if(!['content_locales','figure_book_editions'].includes(table)||remove||!patch
  ||!snapshot.contents.some(row=>row.id===before.content_id&&row.type==='BOOK')
  ||before.locale!=='en'||before.sources?.primary!=='openlibrary'||!isbn
  ||proof?.llmReviewed!==true||proof.identityConfirmed!==true||proof.bibliographicOnly!==true||proof.scopeClaimed!==false
  ||proof.contentId!==before.content_id||proof.locale!==before.locale||proof.editionTitle!==before.title
  ||toIsbn13(proof.isbn??'')!==isbn||proof.beforeDescription!==before.description
  ||!isDeepStrictEqual(proof.beforeSources,before.sources)
  ||!match||proof.fetchedUrl!==url+'.json'||edition?.key!==match[1]
  ||!providerIsbns.includes(isbn)||typeof edition.title!=='string'||!edition.title.trim()
  ||languages.length&&!languages.includes('/languages/eng')
  ||typeof proof.reason!=='string'||!proof.reason.trim()
  ||Object.keys(patch).some(key=>!['description','sources'].includes(key))
  ||!isDeepStrictEqual(patch.sources,expectedSources)
  ||typeof patch.description!=='string'||patch.description!==proof.description||patch.description.trim().length<30
  ||isBookIntroductionSource(patch.description)
  ||/\b(?:unabridged|abridged|complete translation|complete text|full text|entire text)\b/iu.test(patch.description))fail()
}

// 실제 제공자 산문과 현재 소개가 완전히 같을 때만 출처 포인터를 정리한다.
// OpenLibrary를 독립 판본 근거나 새 소개의 승인 경로로 취급하지 않는다.
function reviewedPreservedIntroductionSource(snapshot,expected,change){
 const {table,before,patch,remove,reviewedIntroductionSourcePointer:proof}=change
 const fail=()=>{throw Error('Preserved introduction source requires unchanged prose, exact live original and explicitly reviewed OpenLibrary body')}
 const named=value=>typeof value==='string'&&!!value.trim()
 const reviewed=value=>typeof value==='string'&&value.trim().length>=20
 const sameTitle=(a,b)=>named(a)&&named(b)&&a.trim().toLocaleLowerCase('en').replace(/\s+/gu,' ')===b.trim().toLocaleLowerCase('en').replace(/\s+/gu,' ')
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook
 const reference=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale==='en')
 const sources=reference?.sources??{},url=proof?.sourceUrl
 const order=proof?.coauthorOrderReview
 const authors=value=>typeof value==='string'?value.split(',').map(name=>name.trim()):[]
 const workAuthors=authors(figure?.workCreator),editionAuthors=authors(reference?.creator),fetchedAuthors=authors(proof?.sourceFetchedCreator)
 const equalNames=names=>Array.isArray(names)&&names.length>=2&&names.length<=3&&names.every(named)
  &&new Set(names).size===names.length&&isDeepStrictEqual([...names].sort(),[...workAuthors].sort())
 const coauthorOrder=order?.method==='independent_coauthor_order_review'&&order.llmReviewed===true
  &&isDeepStrictEqual(order.originalWork,snapshot.contents.find(row=>row.id===before.content_id))
  &&isDeepStrictEqual(order.currentRow,before)&&isDeepStrictEqual(order.referenceLocaleCard,reference)
  &&isDeepStrictEqual(order.orderedWorkCreators,workAuthors)&&isDeepStrictEqual(order.orderedEditionCreators,editionAuthors)
  &&isDeepStrictEqual(order.orderedFetchedCreators,fetchedAuthors)&&equalNames(workAuthors)&&equalNames(editionAuthors)&&equalNames(fetchedAuthors)
  &&equalNames(order.orderedPublicationCreators)&&order.isbn===reference?.isbn&&sameTitle(order.publicationTitle,reference?.title)
  &&independentSource(order.publicationSourceUrl)&&reviewed(order.creditEvidence)&&reviewed(order.reason)
 if(order!==undefined&&!coauthorOrder)fail()
 const sourceMatch=typeof url==='string'?url.match(/^https:\/\/openlibrary\.org(\/(?:works\/OL\d+W|books\/OL\d+M))$/u):null
 if(!proof||typeof proof!=='object'||Array.isArray(proof)||proof.method!=='preserved_openlibrary_introduction_source_review'||proof.llmReviewed!==true
  ||!['content_locales','figure_book_editions'].includes(table)||remove||!patch||Object.keys(patch).length!==1||!Object.hasOwn(patch,'sources')
  ||Object.keys(change).some(key=>key.startsWith('reviewed')&&key!=='reviewedIntroductionSourcePointer')
  ||proof.contentId!==before.content_id||proof.locale!==before.locale||proof.isbn!==before.isbn
  ||before.isbn!==null&&!toIsbn13(before.isbn??'')||proof.editionTitle!==before.title||proof.editionCreator!==before.creator
  ||table==='figure_book_editions'&&proof.editionId!==before.id
  ||!named(before.title)||!named(before.creator)||!named(before.description)||isBookIntroductionSource(before.description)
  ||!figure||!named(figure.workTitle)||!named(figure.workCreator)||!named(figure.workIdentity)
  ||proof.workTitle!==figure.workTitle||proof.workCreator!==figure.workCreator||proof.workIdentity!==figure.workIdentity
  ||!reference||sources.primary!=='openlibrary'||!toIsbn13(reference.isbn??'')
  ||proof.referenceIsbn!==reference.isbn||proof.referenceWorkTitle!==reference.title||proof.referenceCreator!==reference.creator
  ||reference.creator!==figure.workCreator&&!coauthorOrder
  ||!sourceMatch||proof.sourceFetchedUrl!==url+'.json'||proof.sourceFetchedKey!==sourceMatch[1]
  ||!/^\/works\/OL\d+W$/u.test(sources.workKey??'')||proof.sourceFetchedWorkKey!==sources.workKey
  ||!named(proof.sourceFetchedTitle)||!sameTitle(proof.sourceFetchedWorkTitle,figure.workTitle)||proof.sourceFetchedCreator!==figure.workCreator&&!coauthorOrder
  ||!named(reference.description)||isBookIntroductionSource(reference.description)||proof.sourceFetchedDescription!==reference.description
  ||!reviewed(proof.bodyEvidence)||!reviewed(proof.reason))fail()
 if(sourceMatch[1].startsWith('/works/')){if(sourceMatch[1]!==sources.workKey||proof.sourceFetchedTitle!==proof.sourceFetchedWorkTitle)fail()}
 else if(sources.provider_edition_url!==url||!Array.isArray(proof.sourceFetchedIsbns)
  ||!proof.sourceFetchedIsbns.some(isbn=>typeof isbn==='string'&&toIsbn13(isbn)===toIsbn13(reference.isbn)))fail()
 const method=before.locale==='en'?'provider':'translation'
 const desired={...structuredClone(before.sources??{}),description:url,description_method:method,description_source_locale:'en'}
 if(!isDeepStrictEqual(patch.sources,desired))fail()
 // 원작·참조 ISBN·본문을 같은 batch의 다른 변경으로 바꿔 통과시키지 않는다.
 const afterReference=expected.content_locales.find(row=>row.content_id===before.content_id&&row.locale==='en')
 const stripPointer=row=>{const copy=structuredClone(row);for(const key of ['description','description_method','description_source_locale'])delete copy.sources?.[key];return copy}
 if(!afterReference||!isDeepStrictEqual(stripPointer(reference),stripPointer(afterReference))
  ||!isDeepStrictEqual(expected.contents.find(row=>row.id===before.content_id),snapshot.contents.find(row=>row.id===before.content_id)))fail()
 if(before.locale==='en'){
  if(before.description!==reference.description||before.isbn!==reference.isbn||before.title!==reference.title||before.creator!==reference.creator
   ||before.sources?.primary!=='openlibrary'||before.sources?.workKey!==sources.workKey)fail()
  const old=before.sources?.description
  if(old!==undefined&&old!==null&&old!==url)fail()
 }else if(before.locale==='ko'&&table==='content_locales'){
  const wrapper=provenanceObject(before.sources?.description),original=wrapper?.original_sources,oldUrl=original?.isbn
  if(!wrapper||wrapper.type!=='locale-translation'||wrapper.source_locale!=='en'||wrapper.source_content_id!==before.content_id
   ||!Object.keys(wrapper).every(key=>['type','snapshot_hash','source_locale','source_content_id','original_sources'].includes(key))
   ||!named(wrapper.snapshot_hash)||proof.translationSnapshotHash!==wrapper.snapshot_hash||proof.translationReviewed!==true
   ||proof.translationOriginalDescription!==reference.description||proof.translationDescription!==before.description
   ||!original||original.primary!=='openlibrary'||!/^https:\/\/openlibrary\.org\/books\/OL\d+M$/u.test(oldUrl??'')
   ||original.title!==oldUrl||original.creator!==oldUrl||!named(sources.wikidata)||original.wikidata!==sources.wikidata
   ||!Object.keys(original).every(key=>['isbn','title','creator','primary','wikidata','description'].includes(key))
   ||original.description!==undefined&&original.description!==null&&original.description!==url
   ||proof.translationSourceFetchedUrl!==oldUrl+'.json'||proof.translationSourceFetchedWorkKey!==sources.workKey
   ||!named(proof.translationSourceFetchedTitle)||proof.translationSourceFetchedCreator!==reference.creator
   ||afterReference.sources?.description!==url||afterReference.sources?.description_method!=='provider'
   ||afterReference.sources?.description_source_locale!=='en')fail()
 }else fail()
}

function reviewedCrossOwnerPlaceholderReference(before,proof,snapshot,expected,assigned){
 const cross=proof.crossOwnerReference,reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof.referenceEditionId))
 const old=snapshot.contents.find(row=>row.id===before.content_id),normal=snapshot.contents.find(row=>row.id===reference?.content_id)
 const card=snapshot.content_locales.find(row=>row.content_id===normal?.id&&row.locale===reference?.locale)
 const source=cross?.sourceReview,review=cross?.referenceReview,modern=snapshot.figure_book_editions.find(row=>String(row.id)===String(source?.edition?.id))
 const anchor=row=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,row?.metadata?.figureBook?.[key]??null]))
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const physical=Object.values(before.sources??{}).some(value=>typeof value==='string'&&(/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(value)
  ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(value)&&value!==before.sources?.description))
 const fail=()=>{throw Error('Cross-owner placeholder requires exact assigned BOOKs, a source-bound copied other-work introduction, no physical identity and unchanged normal edition/card')}
 if(proof.method!=='independent_placeholder_review'||cross?.method!=='independent_cross_owner_placeholder_introduction_review'||cross.llmReviewed!==true
  ||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)||proof.locale!==before.locale||proof.editionTitle!==before.title
  ||[before.isbn,before.publisher,before.release_date,before.releaseDate].some(value=>String(value??'').trim())
  ||before.sources?.edition_key||before.sources?.provider_edition_url||before.sources?.provider_edition_isbn||physical
  ||old?.type!=='BOOK'||normal?.type!=='BOOK'||old.id===normal.id||!assigned?.includes(old.id)||!assigned.includes(normal.id)
  ||!isDeepStrictEqual(cross.rejectedWork,old)||!isDeepStrictEqual(cross.referenceWork,normal)
  ||!isDeepStrictEqual(cross.rejectedWorkAnchor,anchor(old))||!isDeepStrictEqual(cross.referenceWorkAnchor,anchor(normal))
  ||!isDeepStrictEqual(cross.discardedEdition,before)||!expected.contents.some(row=>isDeepStrictEqual(row,old))||!expected.contents.some(row=>isDeepStrictEqual(row,normal))
  ||!reference||!isDeepStrictEqual(cross.referenceEdition,reference)||reference.id===before.id||reference.locale!==proof.referenceLocale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||!String(reference.creator??'').trim()
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')||reference.sources?.primary==='none'
  ||!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!card||!isDeepStrictEqual(cross.referenceLocaleCard,card)||!expected.content_locales.some(row=>isDeepStrictEqual(row,card))
  ||card.isbn!==reference.isbn||card.title!==reference.title||card.creator!==reference.creator||card.description!==reference.description||card.sources?.primary==='none'
  ||(card.publisher??null)!==(reference.publisher??null)||(card.thumbnail_url??null)!==(reference.thumbnail_url??null)
  ||!mediaIntroductionText(reference.description,reference.locale)||!independentSource(reference.sources?.description)
  ||card.sources?.description!==reference.sources.description||card.sources.description_method!==reference.sources.description_method
  ||typeof reference.sources.description_method!=='string'||!reference.sources.description_method.trim()
  ||card.sources.description_source_locale!==reference.locale||reference.sources.description_source_locale!==reference.locale
  ||!independentSource(proof.sourceUrl)||proof.sourceUrl!==review?.sourceUrl||!text(proof.reason)||!proof.misattachedIntroduction
  ||source?.llmReviewed!==true||!modern||modern.content_id!==old.id||modern.id===before.id||!isDeepStrictEqual(source.edition,modern)
  ||!toIsbn13(modern.isbn??'')||source.isbn!==modern.isbn||source.locale!==modern.locale||source.editionTitle!==modern.title||source.editionCreator!==modern.creator
  ||before.locale!=='en'||modern.locale!=='ko'||reference.locale!==modern.locale||before.sources?.description_method!=='translation'||before.sources.description_source_locale!==modern.locale
  ||source.description!==before.description||source.copiedIntroductionSourceUrl!==before.sources?.description||modern.sources?.description!==before.sources.description
  ||!independentSource(source.copiedIntroductionSourceUrl)||!independentSource(source.sourceUrl)||source.sourceUrl===review?.sourceUrl
  ||source.actualCreator!==proof.misattachedIntroduction.creator||source.actualWorkTitle!==proof.misattachedIntroduction.workTitle
  ||source.isbn!==proof.misattachedIntroduction.isbn||source.sourceUrl!==proof.misattachedIntroduction.sourceUrl
  ||!['author','editor','compiler'].includes(source.actualCreatorRole)||source.actualCreator===reference.creator
  ||!Array.isArray(source.actualTranslators)||!source.actualTranslators.length||source.actualTranslators.some(value=>typeof value!=='string'||!value.trim())
  ||source.independentOtherWorkConfirmed!==true||source.copiedTranslationConfirmed!==true||!text(source.bodyEvidence)||!text(source.copyAttributionEvidence)||!text(source.roleEvidence)
  ||review?.llmReviewed!==true||review.isbn!==reference.isbn||review.editionTitle!==reference.title||review.editionCreator!==reference.creator
  ||review.workTitle!==anchor(normal).workTitle||review.workCreator!==anchor(normal).workCreator||!String(review.workTitle??'').trim()||!String(review.workCreator??'').trim()
  ||review.bodyLanguage!==reference.locale||review.textScope!==reference.text_scope||!String(review.textScope??'').trim()
  ||review.description!==reference.description||review.introductionSourceUrl!==reference.sources.description
  ||review.originalScopeConfirmed!==true||review.introductionMatchesOriginalConfirmed!==true||!text(review.bodyEvidence)||!text(review.scopeEvidence)||!text(review.introductionEvidence))fail()
 if(snapshot.figure_book_products.some(row=>String(row.edition_id)===String(before.id)))throw Error('Cross-owner placeholder has product history; removal forbidden')
 return reference
}

function reviewedPlaceholderReference(before,proof,snapshot,expected=snapshot,assigned){
 if(proof?.crossOwnerReference!==undefined)return reviewedCrossOwnerPlaceholderReference(before,proof,snapshot,expected,assigned)
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

// 번호가 비슷한 두 ISBN은 서로 다른 상품일 수 있다. 출처 없는 옛 제목 검색 행만 명시 검수 후 제거한다.
function reviewedUnboundIsbnReference(before,proof,snapshot){
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const isbn=toIsbn13(before.isbn??''),referenceIsbn=toIsbn13(reference?.isbn??'')
 const titleSearchSources={isbn:'kakao_title_search',title:'kakao_title_search',creator:'kakao_title_search',primary:'kakao_book'}
 if(proof?.method!=='independent_unbound_isbn_review'||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)
  ||proof.locale!==before.locale||proof.editionTitle!==before.title||!isbn||toIsbn13(proof.isbn??'')!==isbn
  ||!isDeepStrictEqual(before.sources,titleSearchSources)||String(before.description??'').trim()
  ||String(before.release_date??before.releaseDate??'').trim()
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||reference.publisher!==proof.referencePublisher
  ||![reference.title,reference.creator,reference.publisher].every(value=>typeof value==='string'&&value.trim())
  ||before.title!==reference.title||before.creator!==reference.creator||before.publisher!==reference.publisher
  ||!referenceIsbn||toIsbn13(proof.referenceIsbn??'')!==referenceIsbn||isbn.slice(0,3)===referenceIsbn.slice(0,3)||isbn.slice(3,12)!==referenceIsbn.slice(3,12)
  ||reference.sources?.isbn!==proof.providerSourceUrl||!/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(proof.providerSourceUrl??'')
  ||!independentSource(proof.sourceUrl)||proof.sourceUrl===proof.providerSourceUrl||/(^|\.)books\.google\.[a-z.]+$|(^|\.)googleapis\.com$/iu.test(new URL(proof.sourceUrl).hostname)
  ||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope}))
  throw Error('Unbound ISBN removal requires exact source-free title-search row, actual provider ISBN and independent same-work product review')
 return reference
}

function reviewedPlaceholderIntroductionDiscard(before,proof,snapshot,expected=snapshot,assigned){
 const reference=reviewedPlaceholderReference(before,proof,snapshot,expected,assigned),discard=proof?.misattachedIntroduction
 if(discard?.method!=='independent_other_work_introduction_review'||!toIsbn13(discard.isbn??'')
  ||toIsbn13(discard.isbn)===toIsbn13(reference.isbn)||!independentSource(discard.sourceUrl)||discard.sourceUrl===proof.sourceUrl
  ||![discard.workTitle,discard.creator,discard.reason].every(value=>typeof value==='string'&&value.trim())
  ||discard.creator===reference.creator||discard.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!String(before.description??'').trim()||isBookIntroductionSource(before.description)
  ||!independentSource(before.sources?.description)
  ||typeof reference.description!=='string'||reference.description.trim().length<30||isBookIntroductionSource(reference.description)
  ||!independentSource(reference.sources?.description))
  throw Error('Placeholder introduction discard requires independently reviewed other-work prose and retained actual representative introduction')
 return reference
}

// ISBN 없는 실물 외국어판과 잘못 복사된 범위 소개는 placeholder 판정을 넓히지 않고 개별 검수로 제거한다.
// 이 근거는 입력에만 존재하며 DB에는 정상 대표와 기존 서비스 값만 남긴다.
function reviewedIsbnlessTranslationProductSelection(before,proof,snapshot,expected,changes){
 const fail=()=>{throw Error('ISBN-less translation product selection requires exact live rows, independently confirmed same revised translation and preserved source introduction')}
 const text=value=>typeof value==='string'&&value.trim().length>=20
 const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work?.metadata?.figureBook??{}
 const anchorKeys=['workTitle','workCreator','workIdentity','originalTitle','originalCreator']
 const anchor=Object.fromEntries(anchorKeys.map(key=>[key,figure[key]??null]))
 const finalWork=expected.contents.find(row=>row.id===before.content_id)
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEdition?.id))
 const retained=expected.figure_book_editions.find(row=>String(row.id)===String(reference?.id))
 const oldCard=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const card=expected.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const source=proof?.sourceReview,normal=proof?.referenceReview
 const translators=bookTranslatorKey(source?.translators),oldTranslators=bookTranslatorKey(before.sources?.translators)
 const key=before.sources?.google_books_id,sourceUrl=before.sources?.description
 const sameRevision=review=>review?.llmReviewed===true&&review.bodyLanguage==='en'&&review.scopeConfirmed===true
  &&review.completeTranslationConfirmed===true&&review.editionNumber===source?.editionNumber
  &&Number.isInteger(review.editionNumber)&&review.editionNumber>=1&&review.editionNumber<=99
  &&bookTranslatorKey(review.translators)===translators&&text(review.bodyEvidence)&&text(review.scopeEvidence)
  &&text(review.bodyScope)&&review.bodyScope===source?.bodyScope
 if(proof?.method!=='independent_isbnless_translation_product_selection_review'||proof.reason!=='same_translation_product'||proof.llmReviewed!==true
  ||proof.contentId!==before.content_id||before.isbn!==null||before.locale!=='en'
  ||!isDeepStrictEqual(proof.originalWork,work)||!isDeepStrictEqual(work,finalWork)||!isDeepStrictEqual(proof.workAnchor,anchor)
  ||!String(figure.workTitle??'').trim()||!String(figure.workCreator??figure.originalCreator??'').trim()
  ||!isDeepStrictEqual(proof.discardedEdition,before)||!isDeepStrictEqual(proof.referenceEdition,reference)
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||reference.edition_kind!=='full'||reference.text_scope!=='complete'||!toIsbn13(reference.isbn??'')
  ||!retained||!isDeepStrictEqual(proof.selectedReferenceEdition,retained)||retained.isbn!==normal?.isbn
  ||!toIsbn13(retained.isbn??'')||retained.locale!==before.locale||retained.sources?.primary!=='openlibrary'
  ||retained.edition_kind!==reference.edition_kind||retained.text_scope!==reference.text_scope
  ||excludedBookEditionReason({...retained,editionKind:retained.edition_kind,textScope:retained.text_scope})
  ||!isDeepStrictEqual(proof.previousLocaleCard,oldCard)||!isDeepStrictEqual(proof.selectedLocaleCard,card)
  ||!card||card.title!==retained.title||card.creator!==retained.creator||card.isbn!==retained.isbn
  ||(card.publisher??null)!==(retained.publisher??null)||(card.thumbnail_url??null)!==(retained.thumbnail_url??null)
  ||!/^\w+$/u.test(key??'')||!independentSource(sourceUrl)||new URL(sourceUrl).hostname!=='books.google.com'
  ||new URL(sourceUrl).searchParams.get('id')!==key||source?.sourceUrl!==sourceUrl||source.sourceBookKey!==key
  ||source.productFormat!=='ebook'||!toIsbn13(source.isbn??'')||source.editionTitle!==before.title||source.editionCreator!==before.creator
  ||source.description!==before.description||!translators||!Array.isArray(source.translators)||oldTranslators&&oldTranslators!==translators
  ||before.sources?.edition_key||before.sources?.provider_edition_url||before.sources?.provider_edition_isbn
  ||before.publisher!=null&&before.publisher!==source.publisher||retained.creator!==before.creator
  ||!sameRevision(source)||!sameRevision(normal)||source.isbn===retained.isbn||normal.productFormat!=='paper'
  ||normal.editionTitle!==retained.title||normal.editionCreator!==retained.creator||normal.publisher!==retained.publisher
  ||bookTranslatorKey(retained.sources?.translators)!==translators||bookTranslatorKey(card.sources?.translators)!==translators
  ||!independentSource(normal.sourceUrl)||normal.sourceUrl===sourceUrl||!text(proof.explanation)
  ||normal.providerEditionUrl!==retained.sources?.provider_edition_url||!/^https:\/\/openlibrary\.org\/books\/OL\d+M$/u.test(normal.providerEditionUrl??'')
  ||card.sources?.provider_edition_url!==normal.providerEditionUrl||retained.sources.isbn!==normal.providerEditionUrl||card.sources.isbn!==normal.providerEditionUrl
  ||!text(normal.physicalIdentityEvidence)||!mediaIntroductionText(before.description,'en')
  ||retained.description!==before.description||card.description!==before.description
  ||retained.sources.description!==sourceUrl||card.sources.description!==sourceUrl
  ||!['provider','research'].includes(retained.sources.description_method)||card.sources.description_method!==retained.sources.description_method
  ||retained.sources.description_source_locale!=='en'||card.sources.description_source_locale!=='en')fail()
 const fixed=row=>Object.fromEntries(Object.entries(row).filter(([field])=>!['title','creator','isbn','publisher','thumbnail_url','release_date','description','sources','verified','updated_at'].includes(field)))
 if(!isDeepStrictEqual(fixed(reference),fixed(retained))||!isDeepStrictEqual(fixed(oldCard),fixed(card)))fail()
 if(snapshot.figure_book_products.some(product=>[String(before.id),String(reference.id)].includes(String(product.edition_id))))
  throw Error('ISBN-less translation product selection has product history; removal or representative identity replacement forbidden')
 for(const [table,row] of [['figure_book_editions',retained],['content_locales',card]]){
  const correction=changes.find(change=>change.table===table&&rowKey(table,change.before)===rowKey(table,row))?.reviewedIntroductionCorrection
  if(!correction||correction.sourceUrl!==sourceUrl)fail()
 }
 return retained
}
// 출처의 실제 ISBN과 타원작 표지·출판사가 섞인 수동 행만 가른다. ISBN 없는 구판의 실재를 추정하지 않는다.
function reviewedIsbnlessSourceMetadata(before,proof,snapshot,expected){
 const review=proof?.sourceMetadataReview,source=proof?.sourceReview
 const fail=()=>{throw Error('ISBN-less source metadata removal requires a source-bound existing ISBN/language and independently identified other-work publisher/cover, with both normal rows unchanged')}
 const named=value=>typeof value==='string'&&!!value.trim()
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const sources=before.sources??{},record=review?.fetchedMetadata,other=review?.otherWorkPublicationReview
 const edition=snapshot.figure_book_editions.find(row=>String(row.id)===String(review?.sourceEdition?.id))
 const card=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===edition?.locale)
 const body=review?.bodyLanguageReview,work=snapshot.contents.find(row=>row.id===before.content_id),figure=work?.metadata?.figureBook??{}
 const publisherKey=value=>typeof value==='string'?value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,''):''
 let metadataUrl;try{metadataUrl=new URL(review?.metadataSourceUrl)}catch{fail()}
 const metadataId=metadataUrl.searchParams.get('id')
 const physical=Object.entries(sources).some(([key,value])=>key!=='description'&&typeof value==='string'
  &&(/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(value)
   ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(value)))
 if(proof.reason!=='wrong_scope_placeholder'||review?.method!=='independent_isbnless_source_metadata_review'||review.llmReviewed!==true
  ||!work||work.type!=='BOOK'||!isDeepStrictEqual(review.currentWork,work)||!expected.contents.some(row=>isDeepStrictEqual(row,work))
  ||sources.primary!=='manual-research'||before.isbn!==null||!named(before.publisher)||!named(before.thumbnail_url)
  ||[before.release_date,before.releaseDate].some(value=>String(value??'').trim())
  ||sources.edition_key||sources.provider_edition_url||sources.provider_edition_isbn||sources.isbn||physical
  ||source.sourceUrl!==sources.description||source.description!==before.description
  ||review.metadataSourceUrl!==sources.description||review.fetchedUrl!==review.metadataSourceUrl
  ||!independentSource(review.metadataSourceUrl)||metadataUrl.hostname!=='books.google.com'||metadataUrl.pathname!=='/books'
  ||!named(metadataId)||record?.id!==metadataId||!named(record.title)||record.title!==review.metadataTitle||!named(record.creator)||!named(record.publisher)
  ||!edition||edition.content_id!==before.content_id||edition.locale===before.locale||!['ko','en'].includes(edition.locale)
  ||!isDeepStrictEqual(review.sourceEdition,edition)||!isDeepStrictEqual(review.sourceLocaleCard,card)
  ||!toIsbn13(record.isbn??'')||toIsbn13(record.isbn)!==toIsbn13(edition.isbn??'')||record.creator!==edition.creator
  ||edition.sources?.google_books_id!==metadataId||edition.sources?.primary==='none'
  ||excludedBookEditionReason({...edition,editionKind:edition.edition_kind,textScope:edition.text_scope})
  ||!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,edition))
  ||!card||card.sources?.primary==='none'||card.isbn!==edition.isbn||card.title!==edition.title||card.creator!==edition.creator
  ||card.description!==edition.description||(card.publisher??null)!==(edition.publisher??null)
  ||(card.thumbnail_url??null)!==(edition.thumbnail_url??null)||!expected.content_locales.some(row=>isDeepStrictEqual(row,card))
  ||review.recordPublisher!==record.publisher||review.referencePublisher!==edition.publisher||review.matchingPublisherConfirmed!==true
  ||publisherKey(record.publisher).length<8||!publisherKey(edition.publisher).includes(publisherKey(record.publisher))
  ||!text(review.metadataEvidence)||!text(review.publisherEvidence)
  ||body?.llmReviewed!==true||body.isbn!==edition.isbn||body.editionCreator!==edition.creator||body.bodyLanguage!==edition.locale
  ||body.languageEvidenceBasis!=='explicit_library_text_language'||body.sourceKind!=='library'
  ||!independentSource(body.sourceUrl)||body.sourceUrl===review.metadataSourceUrl
  ||/(^|\.)books\.google\.[a-z.]+$|(^|\.)googleapis\.com$/iu.test(new URL(body.sourceUrl).hostname)
  ||!text(body.languageEvidence)||!text(body.bodyEvidence)
  ||other?.llmReviewed!==true||other.sourceKind!=='publisher'||!independentSource(other.sourceUrl)
  ||other.sourceUrl===review.metadataSourceUrl||other.sourceUrl===body.sourceUrl
  ||!toIsbn13(other.isbn??'')||[edition.isbn,proof.referenceEdition?.isbn].some(isbn=>toIsbn13(other.isbn)===toIsbn13(isbn??''))
  ||!named(other.title)||!named(other.creator)||other.creator===record.creator||other.creator===figure.workCreator
  ||other.otherWorkConfirmed!==true||!named(other.originalCreator)||other.originalCreator===figure.workCreator||other.originalCreator===record.creator
  ||other.publisher!==before.publisher||other.coverUrl!==before.thumbnail_url||other.coverMatchesConfirmed!==true
  ||!independentSource(other.publisherCoverUrl)||new URL(other.publisherCoverUrl).hostname!==new URL(other.sourceUrl).hostname
  ||!text(other.coverEvidence)||!text(other.bodyEvidence))fail()
 return edition
}
function reviewedIsbnlessOriginalProviderSelection(before,proof,snapshot,expected,changes,assigned){
 const fail=()=>{throw Error('ISBN-less original provider selection requires exact same-product rows, an independently reviewed original ISBN and unchanged normal introduction')}
 const named=value=>typeof value==='string'&&!!value.trim()
 const text=value=>named(value)&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const work=snapshot.contents.find(row=>row.id===before.content_id),reference=snapshot.figure_book_editions.find(row=>row.id===proof?.referenceEdition?.id)
 const referenceWork=snapshot.contents.find(row=>row.id===reference?.content_id)
 const card=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const referenceCard=snapshot.content_locales.find(row=>row.content_id===reference?.content_id&&row.locale===reference?.locale)
 const keys=['workTitle','workCreator','workIdentity','originalTitle','originalCreator']
 const anchor=row=>Object.fromEntries(keys.map(key=>[key,row?.metadata?.figureBook?.[key]??null]))
 const source=proof?.sourceReview,discardedSource=proof?.discardedSourceReview,productId=before.sources?.provider_product_id,providerUrl=before.sources?.provider_edition_url
 let url;try{url=new URL(providerUrl)}catch{fail()}
 const sameCard=(locale,edition)=>locale&&locale.locale===edition.locale&&['title','creator','isbn','publisher','thumbnail_url','description'].every(key=>(locale[key]??null)===(edition[key]??null))
 const emptyCredit=row=>!bookTranslatorKey(row.sources?.translators)&&!bookTranslatorKey(row.sources?.translator)
 const removal=changes.find(change=>change.table==='figure_book_editions'&&change.before.id===before.id&&change.remove)
 const cardChange=changes.find(change=>change.table==='content_locales'&&rowKey('content_locales',change.before)===rowKey('content_locales',card??{}))
 const wantedCard=card&&{...card,sources:{...card.sources,primary:'none'}}
 if(proof?.method!=='independent_isbnless_original_provider_product_review'||proof.reason!=='same_provider_product'||proof.llmReviewed!==true
  ||proof.contentId!==before.content_id||before.isbn!==null||before.locale!=='ko'||before.sources?.primary!=='kakao_book'
  ||work?.type!=='BOOK'||referenceWork?.type!=='BOOK'||!assigned?.includes(before.content_id)||!assigned.includes(reference?.content_id)
  ||!isDeepStrictEqual(proof.originalWork,work)||!isDeepStrictEqual(proof.referenceWork,referenceWork)
  ||!isDeepStrictEqual(proof.workAnchor,anchor(work))||!isDeepStrictEqual(proof.referenceWorkAnchor,anchor(referenceWork))
  ||!named(work.metadata?.figureBook?.workTitle)||work.metadata.figureBook.workCreator!==before.creator
  ||referenceWork.metadata?.figureBook?.workCreator!==before.creator
  ||!isDeepStrictEqual(proof.discardedEdition,before)||!reference||reference.id===before.id||reference.content_id===before.content_id
  ||!isDeepStrictEqual(proof.referenceEdition,reference)||reference.locale!=='ko'||reference.verified!==true||!toIsbn13(reference.isbn??'')
  ||reference.sources?.primary!=='kakao_book'||reference.title!==before.title||reference.creator!==before.creator||reference.publisher!==before.publisher
  ||!named(before.publisher)||!named(before.thumbnail_url)||reference.thumbnail_url!==before.thumbnail_url||!emptyCredit(before)||!emptyCredit(reference)
  ||!named(productId)||!/^\d+$/u.test(productId)||reference.sources.provider_product_id!==productId
  ||url.protocol!=='https:'||url.hostname!=='search.daum.net'||url.pathname!=='/search'||url.searchParams.get('w')!=='bookpage'||url.searchParams.get('bookId')!==productId
  ||reference.sources.provider_edition_url!==providerUrl||reference.sources.provider_edition_isbn!==reference.isbn
  ||!sameCard(card,before)||!sameCard(referenceCard,reference)||card.sources?.primary!=='kakao_book'||referenceCard.sources?.primary!=='kakao_book'
  ||card.sources.provider_product_id!==productId||referenceCard.sources.provider_product_id!==productId
  ||card.sources.provider_edition_url!==providerUrl||referenceCard.sources.provider_edition_url!==providerUrl
  ||!isDeepStrictEqual(proof.previousLocaleCard,card)||!isDeepStrictEqual(proof.referenceLocaleCard,referenceCard)
  ||source?.llmReviewed!==true||source.sourceKind!=='publisher'||!independentSource(source.sourceUrl)
  ||source.sourceUrl!==reference.sources.isbn||source.sourceUrl!==reference.sources.description
  ||source.isbn!==reference.isbn||source.editionTitle!==reference.title||source.editionCreator!==reference.creator||source.publisher!==reference.publisher
  ||source.providerProductId!==productId||source.providerUrl!==providerUrl||source.bodyLanguage!=='ko'
  ||source.originalLanguage!==undefined||source.originalWorkConfirmed!==undefined||source.completeTranslationConfirmed!==undefined
  ||source.sameProviderProductConfirmed!==true||source.physicalIdentityConfirmed!==true||source.bodyEquivalenceClaimed!==false
  ||source.translatorIdentityClaimed!==false||source.scopeClaimed!==false||!text(source.bodyEvidence)||!text(source.physicalIdentityEvidence)||!text(proof.explanation)
  ||discardedSource?.llmReviewed!==true||!independentSource(discardedSource.sourceUrl)||discardedSource.sourceUrl!==before.sources?.description
  ||discardedSource.sourceUrl===source.sourceUrl||discardedSource.isbn!==null||discardedSource.editionTitle!==before.title
  ||discardedSource.editionCreator!==before.creator||discardedSource.publisher!==before.publisher||discardedSource.bodyLanguage!=='ko'
  ||discardedSource.providerProductId!==productId||discardedSource.providerUrl!==providerUrl
  ||!text(discardedSource.bodyEvidence)||!text(discardedSource.physicalIdentityEvidence)
  ||!named(reference.description)||isBookIntroductionSource(reference.description)||!mediaIntroductionText(reference.description,'ko')
  ||!['provider','research'].includes(reference.sources.description_method)||reference.sources.description_source_locale!=='ko'
  ||referenceCard.sources.description!==reference.sources.description||referenceCard.sources.description_method!==reference.sources.description_method
  ||referenceCard.sources.description_source_locale!=='ko'||source.description!==reference.description
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!removal||!cardChange||cardChange.remove||changes.length!==2||!isDeepStrictEqual(cardChange.patch,{sources:wantedCard.sources})
  ||!isDeepStrictEqual(expected.contents,snapshot.contents)
  ||!isDeepStrictEqual(expected.figure_book_editions,snapshot.figure_book_editions.filter(row=>row.id!==before.id))
  ||!isDeepStrictEqual(expected.content_locales,snapshot.content_locales.map(row=>rowKey('content_locales',row)===rowKey('content_locales',card)?wantedCard:row)))fail()
 if(snapshot.figure_book_products.some(row=>[before.id,reference.id].some(id=>String(row.edition_id)===String(id))))
  throw Error('ISBN-less original provider selection has product history; removal forbidden')
 if(SNAPSHOT_TABLES.some(table=>table!=='figure_book_editions'
  &&snapshot[table].some(row=>row.edition_id!=null&&[before.id,reference.id].some(id=>String(row.edition_id)===String(id)))))fail()
 return reference
}
function reviewedIsbnlessEditionRemoval(before,proof,snapshot,expected,changes,assigned){
 if(proof?.reason==='same_provider_product')return reviewedIsbnlessOriginalProviderSelection(before,proof,snapshot,expected,changes,assigned)
 if(proof?.reason==='same_translation_product')return reviewedIsbnlessTranslationProductSelection(before,proof,snapshot,expected,changes)
 const fail=()=>{throw Error('ISBN-less edition removal requires exact live identity, independent body/scope review and a retained normal representative introduction')}
 const named=value=>typeof value==='string'&&!!value.trim()
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const keys=['workTitle','workCreator','workIdentity','originalTitle','originalCreator']
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const finalFigure=expected.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const anchor=Object.fromEntries(keys.map(key=>[key,figure[key]??null]))
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEdition?.id))
 const selected=expected.content_locales.find(row=>row.content_id===before.content_id&&row.locale===reference?.locale)
 const source=proof?.sourceReview,normal=proof?.referenceReview
 if(proof?.method!=='independent_isbnless_edition_removal_review'||proof.llmReviewed!==true
  ||!['foreign_language','wrong_scope_placeholder'].includes(proof.reason)||proof.contentId!==before.content_id
  ||before.isbn!==null||!['ko','en'].includes(before.locale)||!isDeepStrictEqual(proof.discardedEdition,before)
  ||!named(figure.workTitle)||!named(figure.workCreator??figure.originalCreator)||!isDeepStrictEqual(proof.workAnchor,anchor)
  ||keys.some(key=>!isDeepStrictEqual(finalFigure[key],figure[key]))
  ||!source||source.llmReviewed!==true||source.workTitle!==figure.workTitle
  ||source.workCreator!==(figure.workCreator??figure.originalCreator)||!independentSource(source.sourceUrl)
  ||!text(source.bodyEvidence)||!text(source.bodyExcerpt)||!text(source.scope)||!text(proof.explanation)
  ||!reference||!isDeepStrictEqual(proof.referenceEdition,reference)||String(reference.id)===String(before.id)
  ||reference.content_id!==before.content_id||!['ko','en'].includes(reference.locale)||!toIsbn13(reference.isbn??'')
  ||reference.sources?.primary==='none'||!named(reference.title)||!named(reference.creator)
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope,
   workTitles:[figure.workTitle,figure.originalTitle].filter(Boolean)})
  ||!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
  ||!named(reference.description)||isBookIntroductionSource(reference.description)||!mediaIntroductionText(reference.description,reference.locale)
  ||!['provider','research'].includes(reference.sources?.description_method)||reference.sources.description_source_locale!==reference.locale
  ||normal?.llmReviewed!==true||normal.workTitle!==figure.workTitle||normal.workCreator!==(figure.workCreator??figure.originalCreator)
  ||normal.description!==reference.description||normal.sourceUrl!==reference.sources?.description||!independentSource(normal.sourceUrl)
  ||!text(normal.bodyEvidence)||!text(normal.scope)||!isDeepStrictEqual(proof.selectedLocaleCard,selected)
  ||!selected||selected.sources?.primary==='none'||selected.title!==reference.title||selected.creator!==reference.creator
  ||selected.isbn!==reference.isbn||(selected.publisher??null)!==(reference.publisher??null)
  ||(selected.thumbnail_url??null)!==(reference.thumbnail_url??null)||selected.description!==reference.description
  ||selected.sources?.description!==normal.sourceUrl||selected.sources.description_method!==reference.sources.description_method
  ||selected.sources.description_source_locale!==reference.locale)fail()
 if(proof.reason==='foreign_language'){
  const sources=before.sources??{}
  const physicalUrls=[...new Set(Object.entries(sources).filter(([key,value])=>key!=='description'&&typeof value==='string'
   &&(/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(value)
    ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(value)
    ||key==='provider_edition_url'&&/^https:\/\//u.test(value))).map(([,url])=>url))]
  if(source.physicalIdentityConfirmed!==true||source.editionTitle!==before.title||source.editionCreator!==before.creator
   ||source.publisher!==before.publisher||source.releaseDate!==(before.release_date??before.releaseDate??null)
   ||!text(source.physicalIdentityEvidence)||source.physicalIdentitySourceUrl!==source.sourceUrl
   ||(physicalUrls.length
    ?!Array.isArray(source.physicalSourceUrls)||!source.physicalSourceUrls.length
     ||source.physicalSourceUrls.some(url=>!physicalUrls.includes(url))
    :!named(before.publisher)||!['publisher','library'].includes(source.physicalIdentitySourceType)
     ||source.physicalSourceUrls!==undefined&&(!Array.isArray(source.physicalSourceUrls)||source.physicalSourceUrls.length!==0))
   ||!(/^[a-z]{2,3}$/u.test(source.bodyLanguage??''))||['ko','kor','en','eng','und','mul','zxx'].includes(source.bodyLanguage)
   ||source.languageEvidenceBasis!=='body_text'||!text(source.languageEvidence))fail()
  // 표시용 카드가 동일 외국어 실물을 계속 가리키면 제거로 끝난 것이 아니다.
  const physicalPointers=['edition_key','provider_edition_url','provider_edition_isbn','isbn','title','creator']
   .filter(key=>named(sources[key])&&(key.startsWith('provider_edition_')||key==='edition_key'
    ||/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(sources[key])
    ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(sources[key])))
  if(expected.content_locales.some(row=>row.content_id===before.content_id&&row.title===before.title&&row.creator===before.creator
   &&row.isbn===null&&(named(before.publisher)&&row.publisher===before.publisher
    ||physicalPointers.some(key=>row.sources?.[key]===sources[key]))))fail()
 }else if(proof.sourceMetadataReview!==undefined){
  reviewedIsbnlessSourceMetadata(before,proof,snapshot,expected)
 }else{
  // 출판사·실물 포인터가 없는 옛 행만 허용한다. 같은 저자의 선집/다른 범위 소개도 원작 범위를 대조한다.
  const sources=before.sources??{}
  const physical=Object.values(sources).some(value=>typeof value==='string'&&(/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(value)
   ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(value)&&value!==sources.description))
  if([before.publisher,before.release_date,before.releaseDate].some(value=>String(value??'').trim())
   ||sources.edition_key||sources.provider_edition_url||sources.provider_edition_isbn||physical
   ||source.sourceUrl!==sources.description||source.description!==before.description
   ||!named(before.description)||isBookIntroductionSource(before.description)
   ||source.scope===normal.scope||source.wrongScopeConfirmed!==true||!text(source.scopeMismatchEvidence))fail()
 }
 if(reference.sources.description_method==='research')researchIntroductionText({contentId:before.content_id,locale:reference.locale,
  title:reference.title,creator:reference.creator,description:reference.description,sourceUrl:normal.sourceUrl,
  evidence:[{url:normal.sourceUrl,note:normal.bodyEvidence}]})
 return reference
}

// 서로 다른 소유 원작의 정상 대표를 읽은 경우에도 현재 두 원작과 모든 정상 행을 고정한다.
function reviewedCrossOwnerIntroductionReference(before,proof,snapshot,expected,assigned){
 const fail=()=>{throw Error('Cross-owner introduction review requires assigned live BOOKs, exact original anchors, independent ISBN/body sources and an unchanged normal edition/card')}
 const text=value=>typeof value==='string'&&value.trim().length>=20
 const anchor=row=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,row?.metadata?.figureBook?.[key]??null]))
 const rejected=snapshot.contents.find(row=>row.id===before.content_id),reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEdition?.id))
 const normalWork=snapshot.contents.find(row=>row.id===reference?.content_id)
 const card=snapshot.content_locales.find(row=>row.content_id===reference?.content_id&&row.locale===reference?.locale)
 const source=proof?.sourceReview,normal=proof?.referenceReview
 if(proof?.llmReviewed!==true||!rejected||!normalWork||rejected.type!=='BOOK'||normalWork.type!=='BOOK'||rejected.id===normalWork.id
  ||!assigned?.includes(rejected.id)||!assigned.includes(normalWork.id)
  ||!isDeepStrictEqual(proof.rejectedWork,rejected)||!isDeepStrictEqual(proof.referenceWork,normalWork)
  ||!isDeepStrictEqual(proof.rejectedWorkAnchor,anchor(rejected))||!isDeepStrictEqual(proof.referenceWorkAnchor,anchor(normalWork))
  ||![anchor(rejected).workTitle,anchor(rejected).workCreator,anchor(normalWork).workTitle,anchor(normalWork).workCreator].every(value=>typeof value==='string'&&!!value.trim())
  ||!isDeepStrictEqual(anchor(expected.contents.find(row=>row.id===rejected.id)),anchor(rejected))
  ||!isDeepStrictEqual(anchor(expected.contents.find(row=>row.id===normalWork.id)),anchor(normalWork))
  ||!isDeepStrictEqual(proof.discardedEdition,before)||!isDeepStrictEqual(proof.referenceEdition,reference)
  ||!reference||reference.locale!==before.locale||reference.sources?.primary==='none'||!toIsbn13(before.isbn??'')||!toIsbn13(reference.isbn??'')
  ||before.isbn===reference.isbn||!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!card||card.sources?.primary==='none'||!isDeepStrictEqual(proof.referenceLocaleCard,card)||!expected.content_locales.some(row=>isDeepStrictEqual(row,card))
  ||card.title!==reference.title||card.creator!==reference.creator||card.isbn!==reference.isbn||card.description!==reference.description
  ||(card.publisher??null)!==(reference.publisher??null)||(card.thumbnail_url??null)!==(reference.thumbnail_url??null)
  ||!mediaIntroductionText(reference.description,reference.locale)||!independentSource(reference.sources?.description)
  ||card.sources?.description!==reference.sources.description||card.sources.description_source_locale!==reference.locale
  ||reference.sources.description_source_locale!==reference.locale||card.sources.description_method!==reference.sources.description_method
  ||!['provider','research','editorial'].includes(reference.sources.description_method)
  ||source?.llmReviewed!==true||source.isbn!==before.isbn||source.editionTitle!==before.title||source.description!==before.description
  ||source.introductionSourceUrl!==before.sources?.description||!independentSource(source.sourceUrl)||!independentSource(source.introductionSourceUrl)
  ||!text(source.bodyEvidence)||!text(source.introductionEvidence)||!text(proof.reason)
  ||normal?.llmReviewed!==true||normal.isbn!==reference.isbn||normal.editionTitle!==reference.title||normal.editionCreator!==reference.creator
  ||normal.workTitle!==anchor(normalWork).workTitle||normal.workCreator!==anchor(normalWork).workCreator
  ||normal.description!==reference.description||normal.introductionSourceUrl!==reference.sources.description
  ||!independentSource(normal.sourceUrl)||normal.sourceUrl===source.sourceUrl||!text(normal.bodyEvidence)||!text(normal.scopeEvidence))fail()
 if(snapshot.figure_book_products.some(product=>String(product.edition_id)===String(before.id)))throw Error('Cross-owner rejected edition has product history; removal forbidden')
 return {reference,normalWork,rejected,source,normal}
}
function reviewedCrossOwnerOtherWorkIntroduction(before,selection,snapshot,expected,assigned){
 const proof=selection?.misattachedIntroduction?.crossOwnerReview
 const {reference,normalWork,rejected,source}=reviewedCrossOwnerIntroductionReference(before,proof,snapshot,expected,assigned)
 if(selection.reason!=='wrong_work'||proof.method!=='independent_cross_owner_other_work_introduction_review'
  ||source.sourceUrl!==selection.source_url||source.actualWorkTitle!==before.title
  ||typeof source.actualCreator!=='string'||!source.actualCreator.trim()||source.actualCreator===reference.creator
  ||source.actualCreator===(normalWork.metadata?.figureBook?.workCreator??normalWork.metadata?.figureBook?.originalCreator)
  ||source.descriptionBelongsToOtherWork!==true||typeof source.otherWorkAttributionEvidence!=='string'||source.otherWorkAttributionEvidence.trim().length<20
  ||!expected.contents.some(row=>isDeepStrictEqual(row,normalWork))||!expected.contents.some(row=>isDeepStrictEqual(row,rejected)))
  throw Error('Cross-owner wrong-work discard requires the existing introduction to belong to the independently identified different author’s book')
 return reference
}
function reviewedWrongLocaleRepresentativeIntroduction(before,selection,snapshot,expected,assigned){
 const proof=selection?.replacementIntroduction
 const {reference,normalWork,rejected,source,normal}=reviewedCrossOwnerIntroductionReference(before,proof,snapshot,expected,assigned)
 const rejectedFigure=rejected.metadata.figureBook,normalFigure=normalWork.metadata.figureBook
 const text=value=>typeof value==='string'&&value.trim().length>=20
 const languages=before.sources?.text_languages,commentary=before.sources?.commentary_languages
 if(selection.reason!=='wrong_locale'||proof.method!=='independent_wrong_locale_representative_introduction_review'
  ||selection.misattachedIntroduction!==undefined||before.locale!=='en'||source.sourceUrl!==selection.source_url
  ||!rejectedFigure.workIdentity||rejectedFigure.workIdentity!==normalFigure.workIdentity
  ||rejectedFigure.workTitle!==normalFigure.workTitle||rejectedFigure.workCreator!==normalFigure.workCreator
  ||source.editionCreator!==before.creator||source.actualOriginalCreator!==normalFigure.workCreator
  ||source.introductionIsValid!==true||!mediaIntroductionText(before.description,'en')
  ||!(/^[a-z]{2,3}$/u.test(source.bodyLanguage??''))||['en','eng','ko','kor','und','mul','zxx'].includes(source.bodyLanguage)
  ||!Array.isArray(languages)||!languages.includes(source.bodyLanguage)||!Array.isArray(commentary)||!commentary.includes('en')
  ||source.commentaryLanguage!=='en'||source.containsEnglishTranslation!==false||source.independentCommentaryWork!==false
  ||!text(source.languageEvidence)||normal.bodyLanguage!=='en'||normal.completeTranslationConfirmed!==true
  ||!Array.isArray(normal.translators)||!bookTranslatorKey(normal.translators)
  ||bookTranslatorKey(normal.translators)!==bookTranslatorKey(reference.sources?.translators)
  ||reference.edition_kind!=='full'||reference.text_scope!=='complete')
  throw Error('Wrong-locale representative selection requires a valid foreign-text/commentary introduction and a normal complete English translation of the same original')
 // 제거한 서비스 판본의 짧은 실서지만 남긴다. 소개나 원문·옛 행 복사본은 남기지 않는다.
 const bib={isbn:before.isbn,title:before.title,creator:before.creator,publisher:before.publisher,locale:source.bodyLanguage,source_url:selection.source_url}
 const previous=normalFigure.foreignEditions??[],after=expected.contents.find(row=>row.id===normalWork.id)?.metadata?.figureBook?.foreignEditions
 const included=Array.isArray(previous)&&previous.some(row=>isDeepStrictEqual(row,bib))
 if(!isDeepStrictEqual(proof.foreignBibliography,bib)||!Array.isArray(previous)||!Array.isArray(after)
  ||!isDeepStrictEqual(after,included?previous:[...previous,bib])
  ||!expected.contents.some(row=>isDeepStrictEqual(row,rejected))
  ||!isDeepStrictEqual(expected.contents.find(row=>row.id===normalWork.id),{...normalWork,metadata:{...normalWork.metadata,figureBook:{...normalFigure,foreignEditions:after}}}))
  throw Error('Wrong-locale representative selection must retain only the exact short foreign bibliography and preserve every existing entry')
 return reference
}
function reviewedSelectionIntroductionDiscard(before,proof,snapshot,expected=snapshot,assigned){
 if(proof?.misattachedIntroduction?.crossOwnerReview!==undefined)return reviewedCrossOwnerOtherWorkIntroduction(before,proof,snapshot,expected,assigned)
 const discard=proof?.misattachedIntroduction
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(discard?.referenceEditionId))
 if(proof?.reason!=='wrong_work'||discard?.method!=='independent_other_work_introduction_review'
  ||!toIsbn13(before.isbn??'')||toIsbn13(discard.isbn??'')!==toIsbn13(before.isbn)
  ||discard.sourceUrl!==proof.source_url||!independentSource(discard.sourceUrl)
  ||![discard.workTitle,discard.creator,discard.reason].every(value=>typeof value==='string'&&value.trim())
  ||discard.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!String(before.description??'').trim()||isBookIntroductionSource(before.description)
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id
  ||reference.locale!==discard.referenceLocale||reference.title!==discard.referenceTitle||reference.creator!==discard.referenceCreator
  ||!String(reference.creator??'').trim()||discard.creator===reference.creator
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(discard.referenceIsbn??'')||toIsbn13(reference.isbn)===toIsbn13(before.isbn)
  ||typeof reference.description!=='string'||reference.description.trim().length<30||isBookIntroductionSource(reference.description)
  ||!independentSource(reference.sources?.description)
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope}))
  throw Error('Wrong-work introduction discard requires the exact rejected ISBN and an independently reviewed retained original edition and introduction')
 return reference
}

// 선정 탈락을 축약·다른 원작으로 꾸미지 않는다. 기존 정상 대표의 실제 소개를 선택한다.
// 미확정 번역을 같은 본문으로 접지 않는다. 두 실물의 책임표시를 읽고 기존 정상 대표만 선택한다.
// 예전 소개 방법을 새 출처처럼 바꾸지 않는다. 현재 정상 카드·판본·소개 전체를 읽은 검수에만 결속한다.
function reviewedExistingLegacyRepresentativeIntroduction(proof,reference,snapshot,expected){
 const review=proof?.reviewedLegacyRepresentativeIntroduction
 if(!review)return false
 const work=snapshot.contents.find(row=>row.id===reference?.content_id)
 const card=snapshot.content_locales.find(row=>row.content_id===reference?.content_id&&row.locale===reference?.locale)
 const anchor=Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work?.metadata?.figureBook?.[key]??null]))
 const source=review.sourceReview,text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const fields=['title','creator','isbn','publisher','thumbnail_url','verified','description']
 const translators=reference?.sources?.translators??reference?.translators??reference?.translator??null
 return review.method==='independent_existing_legacy_introduction_review'&&review.llmReviewed===true&&work?.type==='BOOK'
  &&isDeepStrictEqual(review.work,work)&&isDeepStrictEqual(review.workAnchor,anchor)
  &&isDeepStrictEqual(review.referenceEdition,reference)&&isDeepStrictEqual(review.referenceLocaleCard,card)
  &&['ko','en'].includes(reference?.locale)&&reference.verified===true&&card?.verified===true&&toIsbn13(reference.isbn??'')
  &&fields.every(key=>isDeepStrictEqual(card[key]??null,reference[key]??null))
  &&reference.sources?.primary!=='none'&&card.sources?.primary!=='none'&&bookTranslatorKey(translators)
  &&['editorial_summary','reviewed_summary'].includes(reference.sources?.description_method)
  &&reference.sources.description_method===card.sources?.description_method
  &&reference.sources.description_source_locale===card.sources.description_source_locale
  &&(reference.sources.description_source_locale==null||reference.sources.description_source_locale===reference.locale)
  &&independentSource(reference.sources.description)&&card.sources.description===reference.sources.description
  &&mediaIntroductionText(reference.description??'',reference.locale)&&!isBookIntroductionSource(reference.description)
  &&source?.llmReviewed===true&&source.introductionIsValid===true&&source.bodyLanguage===reference.locale
  &&source.isbn===reference.isbn&&source.editionTitle===reference.title&&source.editionCreator===reference.creator
  &&source.locale===reference.locale&&source.description===reference.description&&source.sourceUrl===reference.sources.description
  &&isDeepStrictEqual(source.creditedTranslators,translators)&&text(source.bodyEvidence)&&text(source.introductionEvidence)&&text(source.scopeEvidence)&&text(review.reason)
  &&expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
  &&expected.content_locales.some(row=>isDeepStrictEqual(row,card))
}

function reviewedCatalogRepresentativeSelection(before,selection,snapshot,expected,changes,assigned){
 const proof=selection?.replacementIntroduction
 const work=snapshot.contents.find(row=>row.id===before.content_id)
 const reference=snapshot.figure_book_editions.find(row=>row.id===proof?.referenceEdition?.id)
 const referenceWork=snapshot.contents.find(row=>row.id===reference?.content_id)
 const card=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const referenceCard=snapshot.content_locales.find(row=>row.content_id===reference?.content_id&&row.locale===before.locale)
 const figure=work?.metadata?.figureBook??{},referenceFigure=referenceWork?.metadata?.figureBook??{}
 const legacyIntroduction=reviewedExistingLegacyRepresentativeIntroduction(proof,reference,snapshot,expected)
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const credit=row=>row?.sources?.translators??row?.translators??row?.translator??null
 const fail=()=>{throw Error('Catalog representative selection requires exact live originals/cards/editions, independent ISBN credit reviews and unchanged verified representative')}
 const unknownReview=proof?.reviewedUnknownCreditRepresentative
 const anchorKeys=['workTitle','workCreator','workIdentity','originalTitle','originalCreator']
 const anchor=row=>Object.fromEntries(anchorKeys.map(key=>[key,row?.metadata?.figureBook?.[key]??null]))
 const unknownCredit=unknownReview!==undefined&&unknownReview.method==='independent_unknown_credit_representative_review'
  &&unknownReview.llmReviewed===true&&unknownReview.sameOriginalConfirmed===true&&unknownReview.creditStatus==='unconfirmed'
  &&unknownReview.originalLanguageClaimed===false&&unknownReview.translatorIdentityClaimed===false&&unknownReview.scopeClaimed===false
  &&unknownReview.identicalBody===false&&text(unknownReview.originalIdentityEvidence)&&text(unknownReview.reason)
  &&['ko','en'].includes(before.locale)&&reference?.locale===before.locale&&!bookTranslatorKey(credit(before))&&!bookTranslatorKey(credit(reference))
  &&[before,reference].every(row=>[row?.sources?.translators,row?.sources?.translator,row?.translators,row?.translator].every(value=>!bookTranslatorKey(value)))
  &&isDeepStrictEqual(unknownReview.discardedWorkAnchor,anchor(work))&&isDeepStrictEqual(unknownReview.referenceWorkAnchor,anchor(referenceWork))
  &&[proof.discardedSourceReview,proof.referenceSourceReview].every(review=>review?.bodyLanguage===before.locale&&review.creditStatus==='unconfirmed'
   &&['publisher','library','bookseller'].includes(review.sourceKind)&&review.originalLanguage===undefined
   &&review.completeTranslationConfirmed===undefined&&review.identicalBody===undefined)
  &&reference?.sources?.description_method===referenceCard?.sources?.description_method
  &&reference?.sources?.description_source_locale===referenceCard?.sources?.description_source_locale
  &&reference?.description===referenceCard?.description&&!/<\/?[a-z][^>]*>/i.test(reference?.description??'')
  &&!SNAPSHOT_TABLES.some(table=>table!=='figure_book_editions'
   &&snapshot[table].some(row=>row.edition_id!=null&&[before.id,reference?.id].some(id=>String(row.edition_id)===String(id))))
 if(unknownReview!==undefined&&!unknownCredit)fail()
 const fields=['title','creator','description','isbn','publisher','thumbnail_url','sources','affiliate_url','verified']
 const reviewValid=(review,row)=>review?.llmReviewed===true&&review.isbn===row.isbn&&review.locale===row.locale
  &&review.editionTitle===row.title&&review.editionCreator===row.creator&&independentSource(review.sourceUrl)
  &&review.workTitle===proof.workTitle&&review.workCreator===proof.workCreator&&review.workIdentity===proof.workIdentity
  &&isDeepStrictEqual(review.creditedTranslators,credit(row))&&text(review.creditEvidence)&&text(review.bodyEvidence)&&text(review.scopeEvidence)
 if(selection.reason!=='editorial_exclusion'||selection.misattachedIntroduction!==undefined
  ||proof?.method!==CATALOG_REPRESENTATIVE_SELECTION_REVIEW||proof.llmReviewed!==true
  ||proof.decision!=='select_existing_verified_representative'||proof.identicalBody!==false||!text(proof.reason)
  ||!work||!referenceWork||work.type!=='BOOK'||referenceWork.type!=='BOOK'
  ||!assigned.includes(work.id)||!assigned.includes(referenceWork.id)
  ||!isDeepStrictEqual(proof.discardedWork,work)||!isDeepStrictEqual(proof.referenceWork,referenceWork)
  ||!isDeepStrictEqual(proof.discardedEdition,before)||!reference||!isDeepStrictEqual(proof.referenceEdition,reference)
  ||!card||!referenceCard||!isDeepStrictEqual(proof.discardedLocaleCard,card)||!isDeepStrictEqual(proof.referenceLocaleCard,referenceCard)
  ||!['workTitle','workCreator','workIdentity'].every(key=>typeof figure[key]==='string'&&figure[key].trim()
   &&proof[key]===figure[key]&&referenceFigure[key]===figure[key])
  ||reference.locale!==before.locale||!['ko','en'].includes(before.locale)||reference.id===before.id
  ||!toIsbn13(before.isbn??'')||!toIsbn13(reference.isbn??'')||before.isbn===reference.isbn
  ||reference.verified!==true||referenceCard.verified!==true||!bookTranslatorKey(credit(reference))&&!unknownCredit||bookTranslatorKey(credit(before))
  ||!reviewValid(proof.discardedSourceReview,before)||!reviewValid(proof.referenceSourceReview,reference)
  ||selection.source_url!==proof.discardedSourceReview.sourceUrl
  ||proof.discardedSourceReview.sourceUrl===proof.referenceSourceReview.sourceUrl
  ||reference.sources?.primary==='none'||referenceCard.sources?.primary==='none'
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!mediaIntroductionText(reference.description??'',reference.locale)||isBookIntroductionSource(reference.description)
  ||reference.description!==referenceCard.description||reference.isbn!==referenceCard.isbn||reference.title!==referenceCard.title
  ||reference.creator!==referenceCard.creator||(reference.publisher??null)!==(referenceCard.publisher??null)
  ||(reference.thumbnail_url??null)!==(referenceCard.thumbnail_url??null)
  ||!independentSource(referenceCard.sources?.description)||!legacyIntroduction&&!['editorial','provider','research'].includes(referenceCard.sources.description_method)
  ||!legacyIntroduction&&referenceCard.sources.description_source_locale!==reference.locale
  ||reference.sources?.description!=null&&reference.sources.description!==referenceCard.sources.description
  ||proof.referenceSourceReview.sourceUrl!==referenceCard.sources.description)fail()
 if(SNAPSHOT_TABLES.some(table=>table!=='figure_book_editions'
  &&snapshot[table].some(row=>row.edition_id!=null&&String(row.edition_id)===String(before.id))))fail()
 const removal=changes.find(change=>change.table==='figure_book_editions'&&change.remove&&isDeepStrictEqual(change.before,before))
 const cardChange=changes.find(change=>change.table==='content_locales'&&isDeepStrictEqual(change.before,card))
 const workChange=changes.find(change=>change.table==='contents'&&isDeepStrictEqual(change.before,work))
 const correction=cardChange?.reviewedIntroductionCorrection
 const selected=expected.content_locales.find(row=>row.content_id===card.content_id&&row.locale===card.locale)
 const wanted={...card,...Object.fromEntries(fields.map(key=>[key,structuredClone(referenceCard[key]??null)]))}
 const alreadySelected=isDeepStrictEqual(card,wanted)&&!cardChange
 const clearIsbn=proof.clearDiscardedExternalIsbn===true
 if(clearIsbn&&(work.id===referenceWork.id||work.external_id!==before.isbn||!workChange||workChange.remove
  ||!isDeepStrictEqual(workChange.patch,{external_id:null})))fail()
 if(!clearIsbn&&(proof.clearDiscardedExternalIsbn!==undefined||workChange))fail()
 const wantedWorks=snapshot.contents.map(row=>clearIsbn&&row.id===work.id?{...row,external_id:null}:row)
 if(changes.length!==(alreadySelected?1:2)+Number(clearIsbn)||!removal||!alreadySelected&&(!cardChange||cardChange.remove||Object.keys(cardChange.patch??{}).some(key=>!fields.includes(key))
  ||correction?.method!==CATALOG_REPRESENTATIVE_SELECTION_REVIEW||correction.llmReviewed!==true
  ||correction.contentId!==work.id||correction.referenceEditionId!==reference.id||correction.isbn!==card.isbn
  ||correction.locale!==card.locale||correction.editionTitle!==reference.title||correction.sourceUrl!==referenceCard.sources.description||!text(correction.reason))
  ||!isDeepStrictEqual(selected,wanted)||!isDeepStrictEqual(expected.contents,wantedWorks)
  ||!isDeepStrictEqual(expected.figure_book_editions,snapshot.figure_book_editions.filter(row=>row.id!==before.id))
  ||!expected.content_locales.some(row=>isDeepStrictEqual(row,referenceCard)))fail()
 return reference
}

function reviewedEditorialIntroductionReplacement(before,selection,snapshot,expected,changes){
 const proof=selection?.replacementIntroduction
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const finalFigure=expected.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEdition?.id))
 const retained=expected.figure_book_editions.find(row=>String(row.id)===String(reference?.id))
 const selected=expected.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const oldSelected=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const cardChange=changes.find(change=>change.table==='content_locales'&&change.before.content_id===before.content_id&&change.before.locale===before.locale)
 const cardProof=cardChange?.reviewedIntroductionCorrection
 const named=value=>typeof value==='string'&&!!value.trim()
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const anchorKeys=['workTitle','workCreator','workIdentity','originalTitle','originalCreator']
 const creator=figure.workCreator??figure.originalCreator
 const stableEdition=row=>{const copy=structuredClone(row);delete copy.description
  for(const key of ['description_method','description_source_locale'])delete copy.sources?.[key];return copy}
 const legacyIntroduction=reviewedExistingLegacyRepresentativeIntroduction(proof,reference,snapshot,expected)
 if(selection.reason!=='editorial_exclusion'||selection.misattachedIntroduction!==undefined
  ||proof?.method!=='independent_editorial_introduction_replacement_review'||proof.llmReviewed!==true
  ||proof.contentId!==before.content_id||proof.workTitle!==figure.workTitle||proof.workCreator!==creator
  ||!named(figure.workTitle)||!named(creator)
  ||['workIdentity','originalTitle','originalCreator'].some(key=>(proof[key]??null)!==(figure[key]??null))
  ||anchorKeys.some(key=>!isDeepStrictEqual(finalFigure[key],figure[key]))
  ||!isDeepStrictEqual(proof.discardedEdition,before)||!toIsbn13(before.isbn??'')||!['ko','en'].includes(before.locale)
  ||!named(before.description)||isBookIntroductionSource(before.description)
  ||!independentSource(before.sources?.description)||selection.source_url!==before.sources.description
  ||!text(proof.bodyEvidence)||!text(proof.reason)
  ||!reference||!isDeepStrictEqual(proof.referenceEdition,reference)||String(reference.id)===String(before.id)
  ||reference.content_id!==before.content_id||reference.locale!==before.locale||!named(reference.title)||!named(reference.creator)
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)===toIsbn13(before.isbn)||reference.sources?.primary==='none'
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope,
   workTitles:[figure.workTitle,figure.originalTitle].filter(Boolean)})
  ||!named(reference.description)||isBookIntroductionSource(reference.description)||reference.description.trim().length<30
  ||!mediaIntroductionText(reference.description,reference.locale)
  ||proof.referenceDescription!==reference.description||proof.referenceSourceUrl!==reference.sources?.description
  ||!independentSource(proof.referenceSourceUrl)||proof.referenceSourceUrl===selection.source_url
  ||!retained||!isDeepStrictEqual(stableEdition(retained),stableEdition(reference))||retained.description!==reference.description
  ||!legacyIntroduction&&(!['provider','research'].includes(retained.sources?.description_method)||retained.sources.description_source_locale!==reference.locale)
  ||!selected||selected.title!==reference.title||selected.creator!==reference.creator||selected.isbn!==reference.isbn
  ||(selected.publisher??null)!==(reference.publisher??null)||(selected.thumbnail_url??null)!==(reference.thumbnail_url??null)
  ||selected.sources?.primary==='none'||selected.description!==reference.description||selected.sources?.description!==proof.referenceSourceUrl
  ||selected.sources.description_method!==retained.sources.description_method
  ||selected.sources.description_source_locale!==retained.sources.description_source_locale
  ||!legacyIntroduction&&selected.sources.description_source_locale!==reference.locale
  ||!isDeepStrictEqual(selected,oldSelected)&&(!cardChange||cardChange.remove
   ||cardProof?.method!=='independent_editorial_representative_introduction_review'||cardProof.llmReviewed!==true
   ||cardProof.contentId!==before.content_id||String(cardProof.referenceEditionId)!==String(reference.id)
   ||cardProof.sourceUrl!==proof.referenceSourceUrl||!text(cardProof.reason)))
  throw Error('Editorial introduction replacement requires exact live original and discarded/reference editions, explicit LLM body review and the normal representative card and source')
 const existingResearchIntroduction=reference.sources?.description_method==='research'
  &&retained.description===reference.description&&retained.sources?.description===reference.sources.description
  &&retained.sources.description_method===reference.sources.description_method
  &&retained.sources.description_source_locale===reference.sources.description_source_locale
  &&!/<\/?[a-z][^>]*>/i.test(reference.description)
 if(retained.sources.description_method==='research'&&!existingResearchIntroduction)researchIntroductionText({contentId:before.content_id,locale:reference.locale,
  title:reference.title,creator:reference.creator,description:reference.description,sourceUrl:proof.referenceSourceUrl,
  evidence:[{url:proof.referenceSourceUrl,note:proof.bodyEvidence}]})
 return retained
}

// 축약본의 원저 소개가 틀렸다고 꾸미지 않는다. 읽은 정상 판본의 현재 소개·출처로 함께 교체한다.
// 발췌 상품의 옛 소개를 잘못된 글로 꾸미지 않고, 이미 선택된 완질 카드의 소개를 정상 실판에 맞춘다.
function reviewedExistingCardAbridgedRepresentative(before,selection,snapshot,expected){
 const proof=selection.replacementIntroduction,work=snapshot.contents.find(row=>row.id===before.content_id)
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEdition?.id))
 const card=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const anchor=Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,work?.metadata?.figureBook?.[key]??null]))
 const drop=proof?.discardedSourceReview,normal=proof?.referenceSourceReview
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const after=expected.figure_book_editions.find(row=>String(row.id)===String(reference?.id))
 const fail=()=>{throw Error('Existing-card abridged representative requires exact live work/editions/card, absent discarded source and independent excerpt versus whole-work review')}
 if(selection.reason!=='abridged'||selection.misattachedIntroduction!==undefined||proof?.llmReviewed!==true
  ||proof.method!=='independent_existing_card_abridged_representative_review'||work?.type!=='BOOK'
  ||!isDeepStrictEqual(proof.work,work)||!isDeepStrictEqual(proof.workAnchor,anchor)||!expected.contents.some(row=>isDeepStrictEqual(row,work))
  ||!isDeepStrictEqual(proof.discardedEdition,before)||before.sources?.description!=null||before.locale!=='en'
  ||!reference||reference.id===before.id||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||!isDeepStrictEqual(proof.referenceEdition,reference)||!toIsbn13(before.isbn??'')||!toIsbn13(reference.isbn??'')||before.isbn===reference.isbn
  ||!card||!isDeepStrictEqual(proof.selectedLocaleCard,card)||!expected.content_locales.some(row=>isDeepStrictEqual(row,card))
  ||card.isbn!==reference.isbn||card.creator!==before.creator||card.creator!==reference.creator||card.sources?.primary==='none'
  ||!mediaIntroductionText(card.description,card.locale)||before.description!==card.description
  ||!independentSource(card.sources?.description)||!['provider','research'].includes(card.sources.description_method)||card.sources.description_source_locale!==card.locale
  ||!isDeepStrictEqual(proof.referenceAfter,after)||!after||after.edition_kind!=='full'||after.text_scope!=='complete'||after.sources?.primary==='none'
  ||!isDeepStrictEqual(after,{...reference,title:card.title,creator:card.creator,description:card.description,edition_kind:'full',text_scope:'complete',
   sources:{...reference.sources,description:card.sources.description,description_method:card.sources.description_method,description_source_locale:card.locale}})
  ||excludedBookEditionReason({...after,editionKind:after.edition_kind,textScope:after.text_scope})
  ||drop?.llmReviewed!==true||drop.isbn!==before.isbn||drop.editionTitle!==before.title||drop.editionCreator!==before.creator
  ||drop.sourceUrl!==selection.source_url||!independentSource(drop.sourceUrl)||!independentSource(drop.excerptSourceUrl)
  ||drop.selectedExcerptsConfirmed!==true||drop.originalWorkTitle!==card.title||drop.originalWorkCreator!==card.creator
  ||!text(drop.bodyEvidence)||!text(drop.excerptEvidence)
  ||normal?.llmReviewed!==true||normal.isbn!==reference.isbn||normal.editionTitle!==reference.title||normal.editionCreator!==reference.creator
  ||normal.actualWorkTitle!==card.title||normal.actualWorkCreator!==card.creator||normal.bodyLanguage!==card.locale
  ||normal.completeWorkConfirmed!==true||!Number.isInteger(normal.wholeVolumes)||normal.wholeVolumes<2
  ||!independentSource(normal.sourceUrl)||normal.sourceUrl===drop.sourceUrl||!text(normal.bodyEvidence)||!text(normal.scopeEvidence)
  ||normal.introductionSourceUrl!==card.sources.description||normal.description!==card.description||normal.introductionMatchesOriginalConfirmed!==true
  ||!text(normal.introductionEvidence)||!text(proof.reason))fail()
 if(snapshot.figure_book_products.some(row=>String(row.edition_id)===String(before.id)))throw Error('Existing-card abridged edition has product history; removal forbidden')
 return after
}

function reviewedAbridgedIntroductionReplacement(before,selection,snapshot,expected,changes,assigned){
 if(selection?.reason==='editorial_exclusion'&&selection.replacementIntroduction?.method===CATALOG_REPRESENTATIVE_SELECTION_REVIEW)
  return reviewedCatalogRepresentativeSelection(before,selection,snapshot,expected,changes,assigned)
 if(selection?.reason==='abridged'&&selection.replacementIntroduction?.method==='independent_existing_card_abridged_representative_review')
  return reviewedExistingCardAbridgedRepresentative(before,selection,snapshot,expected)
 if(selection?.reason==='wrong_locale'&&selection.replacementIntroduction?.method==='independent_wrong_locale_representative_introduction_review')
  return reviewedWrongLocaleRepresentativeIntroduction(before,selection,snapshot,expected,assigned)
 if(selection?.reason==='editorial_exclusion'&&selection.replacementIntroduction?.method==='independent_editorial_introduction_replacement_review')
  return reviewedEditorialIntroductionReplacement(before,selection,snapshot,expected,changes)
 const proof=selection?.replacementIntroduction
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const finalFigure=expected.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const reference=expected.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 if(selection?.reason!=='abridged'||selection.misattachedIntroduction!==undefined
  ||proof?.method!=='independent_same_work_introduction_replacement_review'||proof.llmReviewed!==true
  ||proof.contentId!==before.content_id||proof.workTitle!==figure.workTitle||proof.workCreator!==figure.workCreator
  ||!String(figure.workTitle??'').trim()||!String(figure.workCreator??'').trim()
  ||(figure.workIdentity?proof.workIdentity!==figure.workIdentity:proof.workIdentity!=null)
  ||finalFigure.workTitle!==figure.workTitle||finalFigure.workCreator!==figure.workCreator
  ||(finalFigure.workIdentity??null)!==(figure.workIdentity??null)
  ||before.title!==figure.workTitle||before.creator!==figure.workCreator||!toIsbn13(before.isbn??'')
  ||!String(before.description??'').trim()||isBookIntroductionSource(before.description)
  ||!independentSource(before.sources?.description)||proof.discardedSourceUrl!==before.sources.description
  ||!text(proof.bodyEvidence)||!text(proof.reason)
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id
  ||!snapshot.figure_book_editions.some(row=>String(row.id)===String(reference.id)&&row.content_id===before.content_id)
  ||reference.locale!==before.locale||reference.locale!==proof.referenceLocale
  ||reference.title!==figure.workTitle||reference.title!==proof.referenceTitle
  ||reference.creator!==figure.workCreator||reference.creator!==proof.referenceCreator
  ||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')
  ||toIsbn13(reference.isbn)===toIsbn13(before.isbn)||reference.sources?.primary==='none'
  ||reference.edition_kind!=='full'||!String(reference.text_scope??'').trim()
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope,workTitles:[figure.workTitle]})
  ||typeof reference.description!=='string'||reference.description.trim().length<30||isBookIntroductionSource(reference.description)
  ||reference.description!==proof.referenceDescription||reference.sources?.description!==proof.referenceSourceUrl
  ||!independentSource(proof.referenceSourceUrl)||proof.referenceSourceUrl===proof.discardedSourceUrl
  ||!['provider','research'].includes(reference.sources?.description_method)
  ||reference.sources.description_source_locale!==reference.locale
  ||!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===reference.locale
   &&row.title===reference.title&&row.creator===reference.creator&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)
   &&row.sources?.primary!=='none'&&row.description===reference.description&&row.sources?.description===reference.sources.description
   &&row.sources.description_method===reference.sources.description_method&&row.sources.description_source_locale===reference.locale))
  throw Error('Abridged introduction replacement requires explicit same-work review, exact old source and retained normal representative ISBN, prose and new source')
 if(reference.sources.description_method==='research')researchIntroductionText({contentId:before.content_id,locale:reference.locale,
  title:reference.title,creator:reference.creator,description:reference.description,sourceUrl:proof.referenceSourceUrl,
  evidence:[{url:proof.referenceSourceUrl,note:proof.bodyEvidence}]})
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
 const figure=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook??{}
 const a=bookTranslatorKey(before.sources?.translators),b=bookTranslatorKey(reference?.sources?.translators)
 const sameText=proof?.textIdentity==='original'&&!translator&&!a&&!b
  &&proof.originalLanguage===before.locale&&figure.originalLanguage===before.locale&&independentSource(figure.identityEvidence)
  ||(proof?.textIdentity===undefined||proof.textIdentity==='translation')&&translator&&a===translator&&b===translator
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
  ||!sameText
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!String(reference.description??'').trim()||isBookIntroductionSource(reference.description)||!independentSource(reference.sources?.description))
  throw Error('Complete-set removal requires exact selected whole set, included first volume, verified original or same translator and independent ISBN sources')
 return reference
}
// 이미 확인된 완질의 소개만 같은 transaction에서 보완한다. 서지·본문 범위는 바꾸지 않는다.
function reviewedCompleteSetIntroductionReplacement(before,selection,snapshot,expected,changes){
 const stableFigure=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['originalLanguage','identityEvidence'].includes(key)))
 const proof=selection?.replacementIntroduction
 const original=snapshot.contents.find(row=>row.id===before.content_id),finalWork=expected.contents.find(row=>row.id===before.content_id)
 const figure=original?.metadata?.figureBook??{},finalFigure=finalWork?.metadata?.figureBook??{}
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(selection.referenceEditionId))
 const retained=expected.figure_book_editions.find(row=>String(row.id)===String(reference?.id))
 const oldCard=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const card=expected.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const stableEdition=row=>{const copy=structuredClone(row);delete copy.description
  for(const key of ['description','description_method','description_source_locale','scope_source_url'])delete copy.sources?.[key];return copy}
 const source=proof?.sourceReview
 if(proof?.method!=='independent_complete_set_introduction_replacement_review'||proof.llmReviewed!==true
  ||selection.referenceAfterPatch!==undefined||!original||!reference||!retained||!oldCard||!card
  ||!isDeepStrictEqual(proof.originalWork,original)||!isDeepStrictEqual(proof.discardedEdition,before)
  ||!isDeepStrictEqual(proof.referenceEdition,reference)||!isDeepStrictEqual(proof.previousLocaleCard,oldCard)
  ||!isDeepStrictEqual(proof.selectedLocaleCard,card)||!isDeepStrictEqual(proof.selectedWork,finalWork)
  ||reference.edition_kind!=='full'||reference.text_scope!=='complete'||reference.sources?.primary==='none'
  ||!isDeepStrictEqual(stableEdition(reference),stableEdition(retained))
  ||!source||source.llmReviewed!==true||source.isbn!==reference.isbn||source.editionTitle!==reference.title
  ||source.editionCreator!==reference.creator||source.locale!==reference.locale||source.totalVolumes!==selection.totalVolumes
  ||source.completeSet!==true||!text(source.bodyEvidence)||!text(source.scopeEvidence)||!text(proof.reason)
  ||source.sourceUrl!==selection.referenceSourceUrl||!independentSource(source.sourceUrl)
  ||!String(figure.workTitle??'').trim()||!String(figure.workCreator??'').trim()||!String(figure.workIdentity??'').trim()
  ||!isDeepStrictEqual(stableFigure(finalFigure),stableFigure(figure))
  ||figure.originalLanguage!==undefined&&finalFigure.originalLanguage!==figure.originalLanguage
  ||figure.identityEvidence!==undefined&&finalFigure.identityEvidence!==figure.identityEvidence
  ||(finalFigure.originalLanguage!==figure.originalLanguage||finalFigure.identityEvidence!==figure.identityEvidence)
   &&selection.textIdentity!=='original'
  ||selection.textIdentity==='original'&&(finalFigure.originalLanguage!==before.locale
   ||!independentSource(finalFigure.identityEvidence)||figure.identityEvidence===undefined&&finalFigure.identityEvidence!==source.sourceUrl)
  ||retained.sources?.description_method!=='research'||retained.sources.description_source_locale!==reference.locale
  ||retained.sources.description!==source.sourceUrl||retained.sources.scope_source_url!==source.sourceUrl
  ||card.isbn!==reference.isbn||card.creator!==reference.creator
  ||![oldCard.title,reference.title].includes(card.title)||(card.publisher??null)!==(reference.publisher??null)
  ||(card.thumbnail_url??null)!==(reference.thumbnail_url??null)||card.description!==retained.description
  ||card.sources?.description!==source.sourceUrl||card.sources.description_method!=='research'
  ||card.sources.description_source_locale!==reference.locale||card.sources.edition_title!==reference.title
  ||card.sources.selection_source_url!==source.sourceUrl||!text(card.sources.selection_review))
  throw Error('Complete-set introduction replacement requires exact live original, included volume, unchanged whole bibliography and independently reviewed final introduction and card')
 const allowedCard=['isbn','title','creator','publisher','thumbnail_url','description','sources','updated_at']
 if(!isDeepStrictEqual(Object.fromEntries(Object.entries(oldCard).filter(([key])=>!allowedCard.includes(key))),
   Object.fromEntries(Object.entries(card).filter(([key])=>!allowedCard.includes(key)))))
  throw Error('Complete-set introduction replacement must preserve other representative fields')
 const cardSourceKeys=['description','description_method','description_source_locale','edition_title','selection_source_url','selection_review',
  'note','translators','provider_edition_url','edition_work_evidence','scope_source_url']
 const otherSources=row=>Object.fromEntries(Object.entries(row.sources??{}).filter(([key])=>!cardSourceKeys.includes(key)))
 if(!isDeepStrictEqual(otherSources(oldCard),otherSources(card))
  ||['note','translators','provider_edition_url','edition_work_evidence'].some(key=>!isDeepStrictEqual(card.sources[key],retained.sources[key])))
  throw Error('Complete-set introduction replacement must synchronize current edition sources without changing other provenance')
 const oldMeta=original.metadata??{},finalMeta=finalWork.metadata??{}
 if(finalWork.external_id!==reference.isbn
  ||!isDeepStrictEqual({...finalWork,external_id:original.external_id,metadata:original.metadata},original)
  ||!isDeepStrictEqual({...finalMeta,isbn:oldMeta.isbn,publisher:oldMeta.publisher,figureBook:oldMeta.figureBook},oldMeta)
  ||finalMeta.isbn!==reference.isbn||(finalMeta.publisher??null)!==(reference.publisher??null))
  throw Error('Complete-set introduction replacement must preserve original identity and only synchronize selected ISBN/publisher')
 for(const row of [retained,card]){
  const correction=changes.find(change=>change.table===(row===retained?'figure_book_editions':'content_locales')
   &&rowKey(change.table,change.before)===rowKey(change.table,row))?.reviewedIntroductionCorrection
  if(!correction||correction.sourceUrl!==source.sourceUrl)throw Error('Complete-set introduction replacement requires atomic explicit introduction corrections')
 }
 researchIntroductionText({contentId:before.content_id,locale:reference.locale,title:reference.title,creator:reference.creator,
  description:retained.description,sourceUrl:source.sourceUrl,evidence:[{url:source.sourceUrl,note:source.bodyEvidence}]})
 return reviewedCompleteSetReference(before,selection,expected)
}
function reviewedContinuousTranslationParts(before,reference,proof,figure){
 const parts=proof?.reviewedContinuousTranslationParts
 if(parts===undefined)return false
 const first=bookTranslatorKey(reference?.sources?.translators),later=bookTranslatorKey(before.sources?.translators)
 return parts?.method==='independent_continuous_translation_parts_review'&&parts.llmReviewed===true
  &&parts.contentId===before.content_id&&parts.workIdentity===figure.workIdentity&&typeof figure.workIdentity==='string'&&!!figure.workIdentity.trim()
  &&parts.originalTitle===figure.originalTitle&&typeof figure.originalTitle==='string'&&!!figure.originalTitle.trim()
  &&parts.originalCreator===figure.originalCreator&&typeof figure.originalCreator==='string'&&!!figure.originalCreator.trim()
  &&parts.seriesTitle===figure.series?.title&&typeof figure.series?.title==='string'&&!!figure.series.title.trim()
  &&String(parts.firstEditionId)===String(reference?.id)&&parts.firstIsbn===reference?.isbn&&parts.firstTitle===reference?.title
  &&String(parts.laterEditionId)===String(before.id)&&parts.laterIsbn===before.isbn&&parts.laterTitle===before.title
  &&!!first&&!!later&&first!==later&&bookTranslatorKey(parts.firstTranslators)===first&&bookTranslatorKey(parts.laterTranslators)===later
  &&parts.firstVolumeNumber===1&&proof.referenceVolumeNumber===1&&parts.laterVolumeNumber===proof.volumeNumber
  &&Number.isSafeInteger(parts.totalVolumes)&&parts.totalVolumes>=parts.laterVolumeNumber&&parts.totalVolumes<=999
  &&parts.firstSourceUrl===proof.referenceSourceUrl&&parts.laterSourceUrl===proof.sourceUrl
  &&independentSource(parts.firstSourceUrl)&&independentSource(parts.laterSourceUrl)&&independentSource(parts.seriesSourceUrl)
  &&parts.seriesSourceUrl!==parts.firstSourceUrl&&parts.seriesSourceUrl!==parts.laterSourceUrl
  &&typeof parts.bodyEvidence==='string'&&parts.bodyEvidence.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
}
// 역자 미상을 같은 역자로 취급하지 않고 출판사가 확인한 시작 합본과 후속 부분만 선정한다.
function reviewedUnknownCreditContinuousParts(before,reference,proof,snapshot){
 const review=proof?.reviewedUnknownCreditContinuousParts
 if(review===undefined)return false
 const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work?.metadata?.figureBook??{}
 const first=review.firstSourceReview,later=review.laterSourceReview
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 const source=(item,row,url)=>item?.llmReviewed===true&&item.sourceKind==='publisher'&&item.sourceUrl===url
  &&independentSource(url)&&item.isbn===row.isbn&&item.currentEditionTitle===row.title&&typeof item.actualEditionTitle==='string'&&!!item.actualEditionTitle.trim()
  &&item.editionCreator===row.creator&&item.seriesTitle===review.publisherSeriesTitle&&item.publisher===review.publisher
  &&item.bodyLanguage==='en'&&text(item.bodyEvidence)&&text(item.scopeEvidence)
 if(review.method!=='independent_unknown_credit_continuous_parts_review'||review.llmReviewed!==true
  ||proof.referenceOpeningOmnibusReview===undefined||proof.referenceAfterPatch===true
  ||!work||work.type!=='BOOK'||!isDeepStrictEqual(review.currentWork,work)
  ||!isDeepStrictEqual(review.firstEdition,reference)||!isDeepStrictEqual(review.laterEdition,before)
  ||bookTranslatorKey(reference?.sources?.translators)||bookTranslatorKey(before.sources?.translators)
  ||review.translatorIdentityClaimed!==false||review.originalLanguageClaimed!==false||review.equivalentBodyClaimed!==false
  ||reference?.locale!=='en'||before.locale!=='en'||review.workIdentity!==figure.workIdentity||!figure.workIdentity
  ||review.seriesTitle!==figure.series?.title||!figure.series?.title||review.seriesCreator!==figure.series?.creator
  ||review.seriesCreator!==before.creator||!String(review.publisher??'').trim()||!String(review.publisherSeriesTitle??'').trim()
  ||!isDeepStrictEqual(first?.includedOriginalVolumes,proof.referenceOpeningOmnibusReview.includedOriginalVolumes)
  ||later?.originalVolumeNumber!==proof.volumeNumber||proof.volumeNumber<=first?.includedOriginalVolumes?.at(-1)
  ||!source(first,reference,proof.referenceSourceUrl)||!source(later,before,proof.sourceUrl)
  ||proof.sourceUrl===proof.referenceSourceUrl||!text(review.wrongStartingSelectionEvidence))
  throw Error('Unknown-credit continuous parts require exact live opening omnibus and later edition, independent publisher ISBN/body/series reviews, without translator, original-language or equivalent-body claims')
 return true
}
// 시작 합본은 단권 1권으로 위장하지 않는다. 현재 합본·표시 카드와 실제 시작 권 구성을 함께 고정한다.
function reviewedReferenceOpeningOmnibus(before,proof,reference,selected,snapshot){
 const review=proof?.referenceOpeningOmnibusReview
 if(review===undefined)return false
 const fail=()=>{throw Error('Nonstart opening omnibus requires exact live original/edition/card and independently reviewed publisher body covering consecutive original volumes from one')}
 const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work?.metadata?.figureBook??{}
 const anchor=Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(key=>[key,figure[key]??null]))
 const source=review.sourceReview,volumes=review.includedOriginalVolumes
 const text=value=>typeof value==='string'&&value.trim().length>=BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
 if(review.method!=='independent_reference_opening_omnibus_review'||review.llmReviewed!==true||proof.referenceAfterPatch===true
  ||!work||work.type!=='BOOK'||!isDeepStrictEqual(review.currentWork,work)||!isDeepStrictEqual(review.workAnchor,anchor)
  ||!anchor.workTitle||!anchor.workCreator||!anchor.workIdentity
  ||!reference||reference.edition_kind!=='volume'||!isDeepStrictEqual(review.referenceEdition,reference)
  ||review.textScope!==reference.text_scope||!text(review.textScope)||!isDeepStrictEqual(review.selectedLocaleCard,selected)
  ||!selected||selected.content_id!==reference.content_id||selected.locale!==reference.locale||selected.creator!==reference.creator
  ||toIsbn13(selected.isbn??'')!==toIsbn13(reference.isbn??'')
  ||review.openingOriginalVolume!==1||!Array.isArray(volumes)||volumes.length<2||volumes.length>20
  ||volumes.some((volume,index)=>volume!==index+1)||proof.volumeNumber<=volumes.at(-1)
  ||source?.llmReviewed!==true||source.sourceKind!=='publisher'||source.sourceUrl!==proof.referenceSourceUrl
  ||!independentSource(source.sourceUrl)||source.sourceUrl===proof.sourceUrl
  ||source.isbn!==reference.isbn||source.editionTitle!==reference.title||source.editionCreator!==reference.creator
  ||source.workTitle!==anchor.workTitle||source.workCreator!==anchor.workCreator||source.bodyLanguage!==reference.locale
  ||!isDeepStrictEqual(source.includedOriginalVolumes,volumes)||!text(source.bodyEvidence)||!text(source.scopeEvidence))fail()
 return true
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
  // 연속 원작의 서로 다른 부분이다. 후속 본문을 시작 본문과 동등하게 매핑하지 않는다.
  ||proof?.textIdentity==='continuous_translation_parts'&&(reviewedContinuousTranslationParts(before,reference,proof,figure)
   ||reviewedUnknownCreditContinuousParts(before,reference,proof,snapshot))
 const openingOmnibus=reviewedReferenceOpeningOmnibus(before,proof,reference,selected,snapshot)
 const selectedStart=openingOmnibus||reference?.edition_kind==='volume'&&reference.text_scope==='volume/1'
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
// A reviewed one-song teaching series keeps one entry, without claiming identical or continuous music.
function reviewedSongScoreSeriesReference(before,proof,snapshot){
 const bodySource=url=>independentSource(url)&&!/(^|\.)books\.google\.[a-z.]+$|(^|\.)googleapis\.com$/iu.test(new URL(url).hostname)
 const reference=snapshot.figure_book_editions.find(row=>String(row.id)===String(proof?.referenceEditionId))
 const selected=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
 const series=snapshot.contents.find(row=>row.id===before.content_id)?.metadata?.figureBook?.series
 if(proof?.method!=='independent_song_score_series_review'||proof.contentId!==before.content_id||String(proof.editionId)!==String(before.id)
  ||proof.locale!==before.locale||proof.editionTitle!==before.title||!toIsbn13(before.isbn??'')||toIsbn13(proof.isbn??'')!==toIsbn13(before.isbn)
  ||proof.sameTeachingFormat!==true||proof.individualSongScores!==true||proof.continuousText!==undefined||proof.textIdentity!==undefined
  ||before.edition_kind!=='volume'||!/^song\/.+/u.test(before.text_scope??'')||proof.textScope!==before.text_scope
  ||!series||!String(proof.seriesTitle??'').trim()||series.title!==proof.seriesTitle||series.creator!==proof.seriesCreator
  ||series.locale!==before.locale||series.sourceUrl!==proof.seriesSourceUrl||!bodySource(proof.seriesSourceUrl)
  ||before.creator!==series.creator||bookTranslatorKey(before.sources?.translators)||bookTranslatorKey(reference?.sources?.translators)
  ||!bodySource(proof.sourceUrl)||!bodySource(proof.referenceSourceUrl)||proof.sourceUrl===proof.referenceSourceUrl
  ||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH
  ||!reference||String(reference.id)===String(before.id)||reference.content_id!==before.content_id||reference.locale!==before.locale
  ||reference.title!==proof.referenceTitle||reference.creator!==proof.referenceCreator||reference.creator!==series.creator
  ||reference.edition_kind!=='volume'||!/^song\/.+/u.test(reference.text_scope??'')||reference.text_scope!==proof.referenceTextScope
  ||reference.text_scope===before.text_scope||!toIsbn13(reference.isbn??'')||toIsbn13(reference.isbn)!==toIsbn13(proof.referenceIsbn??'')
  ||toIsbn13(reference.isbn)===toIsbn13(before.isbn)||!selected||toIsbn13(selected.isbn??'')!==toIsbn13(reference.isbn)
  ||excludedBookEditionReason({...reference,editionKind:reference.edition_kind,textScope:reference.text_scope})
  ||!String(reference.description??'').trim()||isBookIntroductionSource(reference.description)||!independentSource(reference.sources?.description))
  throw Error('Song-score series removal requires exact reviewed one-song teaching series and retained selected score; independent collections are not eligible')
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
  if(!allowed[table]||!before||Boolean(patch)===Boolean(remove)||remove&&!['figure_book_editions','figure_book_characters'].includes(table))throw Error('Unsupported catalog change')
  if(!assigned.includes(table==='contents'?before.id:before.content_id))throw Error('Catalog change outside assigned works')
  const key=rowKey(table,before),identity=table+'|'+key,index=expected[table].findIndex(row=>rowKey(table,row)===key)
  if(seen.has(identity)||index<0||!isDeepStrictEqual(snapshot[table].find(row=>rowKey(table,row)===key),before))throw Error('Catalog before row differs from full snapshot')
  seen.add(identity)
  if(table==='figure_book_characters'){
   reviewedFigureRelation(snapshot,change)
   if(remove)expected[table].splice(index,1)
   else{
    expected[table][index]={...expected[table][index],...structuredClone(patch)}
    const keys=changedKeys.get(table)??new Set();keys.add(key);changedKeys.set(table,keys)
   }
   continue
  }
  if(change.reviewedFigureRelation!==undefined)throw Error('Figure relation proof may only review an existing figure relation')
  const evidence=patch?.sources?.edition_selection_evidence
  if(['content_locales','figure_book_editions'].includes(table)&&!remove
   &&reviewedBookEditionSelectionReason(before)&&!reviewedBookEditionSelectionReason({...before,...patch})){
   const proof=change.reviewedSelectionRestoration,oldProof=before.sources.edition_selection_evidence
   if(!Array.isArray(evidence)||evidence.length!==0||proof?.method!=='independent_selection_restoration_review'||proof.llmReviewed!==true
    ||proof.contentId!==before.content_id||proof.isbn!==before.isbn||proof.locale!==before.locale||proof.editionTitle!==before.title
    ||proof.excludedReason!==reviewedBookEditionSelectionReason(before)||!independentSource(proof.sourceUrl)
    ||typeof proof.explanation!=='string'||proof.explanation.trim().length<60
    ||typeof proof.bodyEvidence!=='string'||proof.bodyEvidence.trim().length<40
    ||oldProof.length!==1||oldProof[0].llmReviewed!==true||oldProof[0].content_id!==before.content_id
    ||Object.keys(patch).some(key=>key!=='sources')
    ||!isDeepStrictEqual({...patch.sources,edition_selection_evidence:oldProof},before.sources))
    throw Error('Selection restoration requires exact live identity, independent LLM review and unchanged physical data and other sources')
  }
  if(evidence!==undefined&&!isDeepStrictEqual(evidence,before.sources?.edition_selection_evidence)
   &&(!Array.isArray(evidence)||evidence.some(proof=>!reviewedBookEditionSelectionReason({...before,
    isbn:proof?.isbn,title:proof?.edition_title,sources:{edition_selection_evidence:[proof]}})
    &&!reviewedBookEditionSelectionReason({...before,...patch,isbn:proof?.isbn,title:proof?.edition_title,
     sources:{edition_selection_evidence:[proof]}}))))throw Error('Selection evidence must be an array of reviews with canonical selection reasons and valid source evidence')
  const selectionProof=change.reviewedSelectionExclusion
  const afterKind=Object.hasOwn(patch??{},'edition_kind')?patch.edition_kind:before.edition_kind
  if(table==='figure_book_editions'&&!remove&&afterKind!=null&&!SERVICE_BOOK_EDITION_KINDS.includes(afterKind))
   throw Error('Edition kind must use SERVICE_BOOK_EDITION_KINDS or null')
  const placeholderProof=change.reviewedPlaceholderRemoval
  const setProof=change.reviewedCompleteSetVolumeRemoval
  const nonstartProof=change.reviewedNonstartEditionRemoval
  const scoreProof=change.reviewedSongScoreSeriesEditionRemoval
  const unboundProof=change.reviewedUnboundIsbnRemoval
  const isbnlessProof=change.reviewedIsbnlessEditionRemoval
  if(isbnlessProof!==undefined&&(!remove||table!=='figure_book_editions'
   ||Object.keys(change).some(key=>key.startsWith('reviewed')&&key!=='reviewedIsbnlessEditionRemoval')))
   throw Error('ISBN-less review is only valid for explicit independently reviewed edition removal')
  if(selectionProof?.replacementIntroduction!==undefined&&(table!=='figure_book_editions'||!remove
   ||placeholderProof!==undefined||setProof!==undefined||nonstartProof!==undefined||scoreProof!==undefined||unboundProof!==undefined
   ||change.reviewedIntroductionCorrection!==undefined||change.reviewedArchiveProvenanceDiscard!==undefined))
   throw Error('Abridged introduction replacement is only valid for explicit source-reviewed edition removal')
  if(scoreProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||setProof!==undefined||nonstartProof!==undefined||unboundProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Song-score series review is only valid for explicit alternative-score removal')
  if(unboundProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||setProof!==undefined||nonstartProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Unbound ISBN review is only valid for explicit source-free candidate removal')
  if(unboundProof!==undefined)reviewedUnboundIsbnReference(before,unboundProof,snapshot)
  if(nonstartProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||setProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Nonstart review is only valid for explicit later-volume removal')
  if(nonstartProof!==undefined&&nonstartProof.referenceAfterPatch!==true)reviewedNonstartReference(before,nonstartProof,snapshot)
  if(setProof!==undefined&&(!remove||table!=='figure_book_editions'||selectionProof!==undefined||placeholderProof!==undefined||change.reviewedIntroductionCorrection!==undefined))throw Error('Complete-set review is only valid for explicit included-volume removal')
  if(setProof!==undefined&&setProof.replacementIntroduction===undefined&&setProof.referenceAfterPatch!==true)reviewedCompleteSetReference(before,setProof,snapshot)
  if(placeholderProof!==undefined&&(!remove||selectionProof!==undefined))throw Error('Placeholder review is only valid for explicit edition removal')
  if(placeholderProof!==undefined){reviewedPlaceholderReference(before,placeholderProof,snapshot,snapshot,assigned)
   if(placeholderProof.misattachedIntroduction!==undefined)reviewedPlaceholderIntroductionDiscard(before,placeholderProof,snapshot,snapshot,assigned)}
  if(selectionProof!==undefined&&(!remove||!independentSource(selectionProof?.source_url)
   ||!reviewedBookEditionSelectionReason({...before,sources:{edition_selection_evidence:[selectionProof]}})))throw Error('Source-reviewed edition exclusion requires exact live ISBN, locale, title and independent selection evidence')
  if(selectionProof?.misattachedIntroduction!==undefined)reviewedSelectionIntroductionDiscard(before,selectionProof,snapshot,snapshot,assigned)
  if(remove){
   const work=snapshot.contents.find(row=>row.id===before.content_id),figure=work.metadata?.figureBook??{}
   if(selectionProof===undefined&&placeholderProof===undefined&&setProof===undefined&&nonstartProof===undefined&&scoreProof===undefined&&unboundProof===undefined&&isbnlessProof===undefined&&!excludedBookEditionReason({...before,editionKind:before.edition_kind,textScope:before.text_scope,workTitles:[figure.workTitle,figure.originalTitle].filter(Boolean)}))throw Error('Only a policy-excluded edition may be removed')
   if(snapshot.figure_book_products.some(product=>String(product.edition_id)===String(before.id)))throw Error('Edition has product history; removal forbidden')
   expected[table].splice(index,1)
  }else{
   if(!patch||Array.isArray(patch)||typeof patch!=='object'||!Object.keys(patch).length||Object.keys(patch).some(field=>!allowed[table].includes(field)||patch[field]===undefined))throw Error('Unsupported catalog patch field')
   for(const field of ['title','creator','description','publisher','isbn','thumbnail_url','affiliate_url','release_date','edition_kind','text_scope','locale','content_id','external_id','external_source'])
    if(Object.hasOwn(patch,field)&&patch[field]!==null&&typeof patch[field]!=='string')throw Error('Catalog text field requires string or null: '+field)
   preventNewArchiveCopies(table,before,patch)
   if(patch.content_id&&patch.content_id!==before.content_id){
    const proof=patch.sources?.work_attribution
    if(!assigned.includes(patch.content_id)||proof?.method!=='independent_work_review'||proof.content_id!==patch.content_id||proof.isbn!==before.isbn||!/^https:\/\//u.test(proof.source_url??''))throw Error('Edition move requires assigned owner and explicit source evidence')
   }
   expected[table][index]={...expected[table][index],...structuredClone(patch)}
   const keys=changedKeys.get(table)??new Set();keys.add(key);changedKeys.set(table,keys)
  }
 }
 for(const change of changes)if(change.table==='figure_book_characters')reviewedFigureRelation(expected,change)
 for(const {before,reviewedIsbnlessEditionRemoval:proof} of changes)if(proof!==undefined)
  reviewedIsbnlessEditionRemoval(before,proof,snapshot,expected,changes,assigned)
 for(const {before,reviewedPlaceholderRemoval:proof} of changes)if(proof!==undefined){
  const reference=reviewedPlaceholderReference(before,proof,snapshot,expected,assigned)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference)))throw Error('Placeholder removal must retain the reviewed physical edition unchanged')
 }
 for(const {before,reviewedSelectionExclusion:proof} of changes)if(proof?.misattachedIntroduction!==undefined){
  const reference=reviewedSelectionIntroductionDiscard(before,proof,snapshot,expected,assigned)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference)))
   throw Error('Wrong-work introduction discard must retain the reviewed original edition and introduction unchanged')
 }
 for(const {before,reviewedSelectionExclusion:proof} of changes)if(proof?.replacementIntroduction!==undefined)
  reviewedAbridgedIntroductionReplacement(before,proof,snapshot,expected,changes,assigned)
 for(const {before,reviewedUnboundIsbnRemoval:proof} of changes)if(proof!==undefined){
  const reference=reviewedUnboundIsbnReference(before,proof,snapshot)
  const selected=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===before.locale)
  const selectedIsbn=toIsbn13(selected?.isbn??'')
  const selectedEdition=snapshot.figure_book_editions.find(row=>row.content_id===before.content_id&&row.locale===before.locale
   &&toIsbn13(row.isbn??'')===selectedIsbn&&String(row.id)!==String(before.id))
  const selectedSource=selectedEdition?.sources?.isbn??selectedEdition?.sources?.description
  const sameSelectedPointer=selectedSource===proof.selectedProviderSourceUrl
   ||/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(selectedSource??'')
    &&/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(proof.selectedProviderSourceUrl??'')
    &&new URL(selectedSource).searchParams.get('bookId')===new URL(proof.selectedProviderSourceUrl).searchParams.get('bookId')
  const keepExisting=proof.keepExistingRepresentative===true&&selectedIsbn&&selectedIsbn!==toIsbn13(before.isbn)
   &&selectedEdition&&!excludedBookEditionReason({...selectedEdition,editionKind:selectedEdition.edition_kind,textScope:selectedEdition.text_scope})
   &&String(selectedEdition.id)===String(proof.selectedEditionId)&&toIsbn13(proof.selectedIsbn??'')===selectedIsbn&&sameSelectedPointer
   &&(/^https:\/\/(?:m\.)?search\.daum\.net\/search\?.*bookId=\d+/u.test(proof.selectedProviderSourceUrl??'')
    ||/^https:\/\/openlibrary\.org\/books\/OL\d+M(?:\/|$)/u.test(proof.selectedProviderSourceUrl??''))
   &&expected.content_locales.some(row=>isDeepStrictEqual(row,selected))&&expected.figure_book_editions.some(row=>isDeepStrictEqual(row,selectedEdition))
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
   ||!keepExisting&&!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===before.locale&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)))
   throw Error('Unbound ISBN removal must retain the reviewed actual product and selected ISBN')
 }
 for(const {before,reviewedCompleteSetVolumeRemoval:proof} of changes)if(proof!==undefined){
  const reference=proof.replacementIntroduction!==undefined?reviewedCompleteSetIntroductionReplacement(before,proof,snapshot,expected,changes)
   :reviewedCompleteSetReference(before,proof,proof.referenceAfterPatch===true?expected:snapshot)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
   ||!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===before.locale&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)))
   throw Error('Complete-set removal must retain the reviewed whole edition and its representative ISBN unchanged')
 }
 for(const {before,reviewedSongScoreSeriesEditionRemoval:proof} of changes)if(proof!==undefined){
  const reference=reviewedSongScoreSeriesReference(before,proof,expected)
  if(!snapshot.figure_book_editions.some(row=>isDeepStrictEqual(row,reference)))throw Error('Song-score series removal must retain the reviewed representative score unchanged')
 }
 for(const {before,reviewedNonstartEditionRemoval:proof} of changes)if(proof!==undefined){
  // 시작권 교체와 후속 삭제를 한 transaction으로 확정한 경우에도 최종 대표를 ISBN·본문으로 검수한다.
  const reference=reviewedNonstartReference(before,proof,proof.referenceAfterPatch===true?expected:snapshot)
  if(!expected.figure_book_editions.some(row=>isDeepStrictEqual(row,reference))
   ||!expected.content_locales.some(row=>row.content_id===before.content_id&&row.locale===before.locale&&toIsbn13(row.isbn??'')===toIsbn13(reference.isbn)))
   throw Error('Nonstart removal must retain the reviewed first or whole edition and its representative ISBN unchanged')
  if(proof.referenceOpeningOmnibusReview!==undefined
   &&(!expected.content_locales.some(row=>isDeepStrictEqual(row,proof.referenceOpeningOmnibusReview.selectedLocaleCard))
    ||!expected.contents.some(row=>isDeepStrictEqual(row,proof.referenceOpeningOmnibusReview.currentWork))))
   throw Error('Nonstart opening omnibus must retain the exact selected card and original unchanged')
 }
 // 소개 보존 예외도 정확한 ISBN의 독립 원문을 읽은 명시 판단으로만 허용한다.
 for(const change of changes){
  const {table,before,patch,remove,reviewedIntroductionCorrection:proof,reviewedPlaceholderRemoval:placeholderProof,reviewedSelectionExclusion:selectionProof,reviewedCompleteSetVolumeRemoval:setProof,reviewedNonstartEditionRemoval:nonstartProof,reviewedSongScoreSeriesEditionRemoval:scoreProof,reviewedArchiveProvenanceDiscard:archiveProof}=change
  if(table==='figure_book_characters')continue
  if(change.reviewedIsbnlessEditionRemoval!==undefined){reviewedIsbnlessEditionRemoval(before,change.reviewedIsbnlessEditionRemoval,snapshot,expected,changes,assigned);continue}
  if(change.reviewedIntroductionSourcePointer!==undefined){reviewedPreservedIntroductionSource(snapshot,expected,change);continue}
  if(archiveProof!==undefined){
   const remaining=structuredClone(before.sources??{}),discarded=discardedBackupProvenance(before.sources?.description,before,archiveProof.retainedSourceUrl)
   remaining.description=discarded
   if(!['content_locales','figure_book_editions'].includes(table)||remove||proof!==undefined||setProof!==undefined||nonstartProof!==undefined
    ||archiveProof.method!=='discard_raw_source_copy'||archiveProof.path!=='sources.description'||!String(archiveProof.reason??'').trim()
    ||discarded===undefined||archiveProof.retainedSourceUrl!==undefined&&discarded!==archiveProof.retainedSourceUrl
    ||!patch||Object.keys(patch).length!==1||!isDeepStrictEqual(patch.sources,remaining))
    throw Error('Raw provenance discard may only remove a verified backup wrapper while retaining introduction and every live source field')
   continue
  }
  if(placeholderProof?.misattachedIntroduction!==undefined){reviewedPlaceholderIntroductionDiscard(before,placeholderProof,snapshot,expected,assigned);continue}
  if(selectionProof?.misattachedIntroduction!==undefined){reviewedSelectionIntroductionDiscard(before,selectionProof,snapshot,expected,assigned);continue}
  if(selectionProof?.replacementIntroduction!==undefined){reviewedAbridgedIntroductionReplacement(before,selectionProof,snapshot,expected,changes,assigned);continue}
  if(setProof!==undefined||nonstartProof!==undefined||scoreProof!==undefined)continue // 분권 소개는 검수된 대표의 정상 소개로 대표된다. 감상 필드는 보존한다.
  if(proof!==undefined){
   if(proof?.method===CATALOG_REPRESENTATIVE_SELECTION_REVIEW){
    const removal=changes.find(item=>item.remove&&item.reviewedSelectionExclusion?.replacementIntroduction?.method===CATALOG_REPRESENTATIVE_SELECTION_REVIEW
     &&item.before.content_id===before.content_id)
    if(table!=='content_locales'||remove||!removal)throw Error('Catalog representative card requires its atomic independently reviewed edition selection')
    reviewedCatalogRepresentativeSelection(removal.before,removal.reviewedSelectionExclusion,snapshot,expected,changes,assigned)
    continue
   }
   if(proof?.method===PROVIDER_BIBLIOGRAPHIC_DESCRIPTION_REVIEW){
    reviewedProviderBibliographicDescription(change,snapshot)
    continue
   }
   if(proof?.method==='independent_existing_card_representative_introduction_review'){
    const removal=changes.find(item=>item.remove&&item.reviewedSelectionExclusion?.replacementIntroduction?.method==='independent_existing_card_abridged_representative_review'
     &&String(item.reviewedSelectionExclusion.replacementIntroduction.referenceEdition?.id)===String(before.id))
    const reference=removal&&reviewedExistingCardAbridgedRepresentative(removal.before,removal.reviewedSelectionExclusion,snapshot,expected)
    if(table!=='figure_book_editions'||remove||!reference||proof.llmReviewed!==true||proof.contentId!==before.content_id
     ||proof.isbn!==reference.isbn||proof.locale!==reference.locale||proof.editionTitle!==reference.title||proof.sourceUrl!==reference.sources.description
     ||typeof proof.reason!=='string'||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH)
     throw Error('Existing-card representative introduction correction requires its exact atomic excerpt-removal review')
    continue
   }
   if(proof?.method==='independent_locale_reference_introduction_review'){
    const clear=patch?.description===null&&patch?.sources?.description===null
    const reference=snapshot.content_locales.find(row=>row.content_id===before.content_id&&row.locale===proof.referenceLocale
     &&row.title===proof.referenceWorkTitle&&row.creator===proof.referenceCreator&&toIsbn13(row.isbn??'')===toIsbn13(proof.isbn??''))
    if(table!=='content_locales'||remove||!patch||before.isbn!==null||before.sources?.primary!=='none'
     ||proof.contentId!==before.content_id||proof.referenceLocale===before.locale||!reference||!toIsbn13(reference.isbn??'')
     ||!String(proof.referenceWorkTitle??'').trim()||!String(proof.referenceCreator??'').trim()
     ||patch.isbn!==undefined&&patch.isbn!==null||patch.sources?.primary!=='none'
     ||!clear&&!reviewedIntroductionLanguage(before,patch,proof)
     ||proof.locale!==before.locale||proof.editionTitle!==(patch.title??before.title)
     ||!(independentSource(proof.sourceUrl)||!clear&&reviewedProviderTranslationSource(reference,patch,proof))
     ||!clear&&patch.sources.description!==proof.sourceUrl||!String(proof.reason??'').trim()
     ||!Array.isArray(proof.evidence)||proof.evidence.some(item=>!independentSource(item?.url)))
     throw Error('Locale reference introduction correction requires the exact same-work ISBN, author and independent source review')
    if(clear){
     if(!String(before.description??'').trim()||isBookIntroductionSource(before.description)||proof.reason.trim().length<BOOK_EDITION_SELECTION_EXPLANATION_MIN_LENGTH||!proof.evidence.length)
      throw Error('Locale reference introduction clear requires actual incorrect prose and independent source evidence')
     continue
    }
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
   &&isDeepStrictEqual(row.sources?.description??null,before.sources?.description??null))
  if(!retained)throw Error('Existing introduction must be retained before changing/removing its row')
 }
 return {assigned,expected,changedKeys}
}

function rowSql(table,row,alias=''){const prefix=alias?alias+'.':'';return table==='content_locales'?`${prefix}content_id=${sqlLiteral(row.content_id)} AND ${prefix}locale=${sqlLiteral(row.locale)}`
 :table==='figure_book_characters'?`${prefix}content_id=${sqlLiteral(row.content_id)} AND ${prefix}celeb_id=${sqlLiteral(row.celeb_id)} AND ${prefix}relation_type IS NOT DISTINCT FROM ${value(row.relation_type)}`
 :`${prefix}id::text=${sqlLiteral(String(row.id))}`}
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
 const statements=ordered.map(({table,before,patch,remove})=>table==='figure_book_characters'?
  `IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='public.figure_book_characters'::regclass) THEN RAISE EXCEPTION 'CATALOG_REPAIR: unhandled figure relation reference';END IF;
${remove?`DELETE FROM public.${table} WHERE ${rowSql(table,before)}`:`UPDATE public.${table} SET relation_type=${value(patch.relation_type)} WHERE ${rowSql(table,before)}`};
GET DIAGNOSTICS affected_rows=ROW_COUNT;IF affected_rows<>1 THEN RAISE EXCEPTION 'CATALOG_REPAIR: exact figure relation row changed';END IF;`:
 remove?
  `IF EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace LEFT JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] WHERE c.contype='f' AND c.confrelid='public.figure_book_editions'::regclass AND (n.nspname<>'public' OR r.relname<>'figure_book_products' OR cardinality(c.conkey)<>1 OR a.attname<>'edition_id')) THEN RAISE EXCEPTION 'CATALOG_REPAIR: unhandled edition reference';END IF;
IF EXISTS(SELECT 1 FROM public.figure_book_products WHERE edition_id::text=${sqlLiteral(String(before.id))}) THEN RAISE EXCEPTION 'CATALOG_REPAIR: edition product history';END IF;DELETE FROM public.${table} WHERE ${rowSql(table,before)};`:
  `UPDATE public.${table} SET ${Object.entries(patch).map(([field,v])=>field+'='+value(v)).join(',')} WHERE ${rowSql(table,before)};`).join('\n')
 let delimiter='$catalog_repair$';const raw=JSON.stringify({snapshot,changes});for(let n=1;raw.includes(delimiter);n++)delimiter=`$catalog_repair_${n}$`
 return `\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';DO ${delimiter} DECLARE affected_rows integer;BEGIN
${SNAPSHOT_TABLES.map(table=>`PERFORM 1 FROM public.${table} t WHERE ${where(table,plan.assigned,'t')} ORDER BY to_jsonb(t)::text FOR UPDATE;`).join('\n')}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,snapshot[table])).join('\n')}
${statements}
${SNAPSHOT_TABLES.map(table=>aggregateCheck(table,plan.assigned,plan.expected[table],plan.changedKeys)).join('\n')}
END ${delimiter};COMMIT;SELECT 'MERGE_COMMITTED';`
}

export async function guardedCatalogRepairs(db,workIds,changes,{capture=captureCatalogRepairSnapshot,execute,apply,dryRun}={}) {
 if(apply===false||dryRun===true)throw Error('guardedCatalogRepairs executes DB writes; use planGuardedCatalogRepairs for dry-run validation')
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
