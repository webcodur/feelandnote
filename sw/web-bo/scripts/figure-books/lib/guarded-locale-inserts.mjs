/** LLM이 검증한 기존 BOOK의 누락 카드 삽입·언어 오분류 이동. 18표의 명시된 변경만 허용한다. */
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {executeTemporaryMergeSql} from '../merge-works.mjs'
import {captureCatalogRepairSnapshot} from './guarded-catalog-repairs.mjs'
import {SNAPSHOT_TABLES,referenceWhere,sqlLiteral} from './merge-work-sql.mjs'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {SERVICE_BOOK_EDITION_KINDS,reviewedBookEditionSelectionReason,excludedBookEditionReason} from '../../../../../packages/content-search/src/book-edition-policy.ts'
const prefix='LOCALE_INSERT_EXPECTED:'
const nonempty=x=>typeof x==='string'&&!!x.trim()&&!x.includes('\0')
const json=x=>sqlLiteral(JSON.stringify(x))+'::jsonb'
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x
const rows=x=>x.map(r=>JSON.stringify(canonical(r))).sort()
function validSnapshot(s){for(const t of SNAPSHOT_TABLES)if(!Array.isArray(s?.[t]))throw Error('LOCALE_INSERT: full18 snapshot required')}
function sourceUrl(value,independent=false){try{const u=new URL(value);return typeof value==='string'&&u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1','::1','[::1]'].includes(u.hostname)&&(!independent||!/(^|\.)openlibrary\.org$/iu.test(u.hostname))&&![...u.searchParams.keys()].some(k=>/api.?key|token|secret|password|authorization/iu.test(k))}catch{return false}}
function binding(locale,isbn,url){if(!sourceUrl(url))return false;const u=new URL(url);return locale==='en'?u.hostname==='openlibrary.org'&&/^\/books\/OL\d+M(?:\/|$)/u.test(u.pathname):/^(?:m\.)?search\.daum\.net$/u.test(u.hostname)&&u.pathname==='/search'&&/^\d+$/u.test(u.searchParams.get('bookId')??'')||u.hostname==='dapi.kakao.com'&&u.pathname==='/v3/search/book'&&u.searchParams.get('target')==='isbn'&&toIsbn13(u.searchParams.get('query')??'')===isbn}
const where=(table,ids)=>ids.map(id=>'('+referenceWhere(table,sqlLiteral(id),sqlLiteral(id),'t')+')').join(' OR ')
function check(table,ids,expected){return 'IF (SELECT coalesce(jsonb_agg(v ORDER BY v::text),\'[]\'::jsonb) FROM (SELECT to_jsonb(t) v FROM public.'+table+' t WHERE '+where(table,ids)+') a) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),\'[]\'::jsonb) FROM jsonb_array_elements('+expected+') v) THEN RAISE EXCEPTION \'LOCALE_INSERT: rowset mismatch '+table+'\';END IF;'}
function isbnVariants(isbn){if(!isbn.startsWith('978'))return [isbn];const stem=isbn.slice(3,12);const sum=[...stem].reduce((n,c,i)=>n+Number(c)*(10-i),0),digit=(11-sum%11)%11;return [isbn,stem+(digit===10?'X':String(digit))]}
function reviewedDisplayLocale(r,work,snapshot){
 const figure=work.metadata.figureBook,anchor=Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(k=>[k,figure[k]??null]))
 const ref=r.referenceEdition,card=r.referenceLocaleCard,review=r.sourceReview
 if(r.llmReviewed!==true||!isDeepStrictEqual(r.workAnchor,anchor)||r.reason.trim().length<20
  ||r.isbn!==null||r.publisher!==null||r.thumbnailUrl!==null||r.description!==null
  ||r.metadataSourceUrl!=null||r.existingCreatorEvidence!=null||r.editionKind!=null||r.textScope!=null
  ||r.translators!==undefined&&(!Array.isArray(r.translators)||r.translators.length))throw Error('LOCALE_INSERT: display review cannot assert publication metadata')
 if(!ref||ref.content_id!==r.contentId||!['ko','en'].includes(ref.locale)||ref.locale===r.locale
  ||!toIsbn13(ref.isbn??'')||ref.sources?.primary==='none'
  ||!snapshot.figure_book_editions.some(e=>isDeepStrictEqual(e,ref))
  ||excludedBookEditionReason({...ref,editionKind:ref.edition_kind,textScope:ref.text_scope,workTitles:[figure.workTitle]})
  ||reviewedBookEditionSelectionReason(ref))throw Error('LOCALE_INSERT: display requires exact current normal reference edition')
 if(!card||card.content_id!==r.contentId||card.locale!==ref.locale||toIsbn13(card.isbn??'')!==toIsbn13(ref.isbn)
  ||card.title!==ref.title||card.creator!==ref.creator||card.sources?.primary==='none'
  ||!snapshot.content_locales.some(l=>isDeepStrictEqual(l,card)))throw Error('LOCALE_INSERT: display reference card is stale or mismatched')
 if(!review||review.llmReviewed!==true||review.workTitle!==figure.workTitle||review.workCreator!==figure.workCreator
  ||review.isbn!==ref.isbn||review.editionTitle!==ref.title||review.editionCreator!==ref.creator||review.locale!==ref.locale
  ||review.sourceUrl!==r.sourceUrl||!sourceUrl(review.sourceUrl,true)
  ||!nonempty(review.bodyEvidence)||review.bodyEvidence.trim().length<20||!nonempty(review.scopeEvidence)||review.scopeEvidence.trim().length<20)
  throw Error('LOCALE_INSERT: display requires independently read exact reference body and scope')
 return {content_id:r.contentId,locale:r.locale,title:r.title,creator:r.creator,isbn:null,publisher:null,thumbnail_url:null,description:null,affiliate_url:null,verified:false,sources:{primary:'none',title:'translated'}}
}
export function planReviewedLocaleInsert(workIds,snapshot,reviews){
 validSnapshot(snapshot)
 if(!Array.isArray(workIds)||!workIds.length||workIds.length>100||workIds.some(id=>!nonempty(id))||new Set(workIds).size!==workIds.length||!Array.isArray(reviews)||!reviews.length||reviews.length>200)throw Error('LOCALE_INSERT: assigned IDs and explicit reviews required')
 const keys=new Set(),isbns=new Set()
 const newLocales=reviews.map(r=>{
 const work=snapshot.contents.find(w=>w.id===r?.contentId&&w.type==='BOOK'),figure=work?.metadata?.figureBook
 if(!r||!workIds.includes(r.contentId)||!work||!['ko','en'].includes(r.locale)||r.textLanguage!==r.locale||!nonempty(r.title)||!nonempty(r.creator)||!nonempty(r.workTitle)||!nonempty(r.workCreator)||!nonempty(r.reason)||!sourceUrl(r.sourceUrl,true))throw Error('LOCALE_INSERT: exact original, language and independent review required')
 if(!figure||figure.workTitle!==r.workTitle||figure.workCreator!==r.workCreator)throw Error('LOCALE_INSERT: reviewed original differs from live work')
 if(r.method==='independent_existing_display_locale_review'){
  const key=JSON.stringify([r.contentId,r.locale]);if(keys.has(key)||snapshot.content_locales.some(l=>l.content_id===r.contentId&&l.locale===r.locale))throw Error('LOCALE_INSERT: locale exists or duplicate review')
  keys.add(key);return reviewedDisplayLocale(r,work,snapshot)
 }
 const isbn=toIsbn13(r.isbn??'');if(!isbn||isbn!==r.isbn||!binding(r.locale,isbn,r.metadataSourceUrl))throw Error('LOCALE_INSERT: exact official ISBN binding required')
 const creatorEvidence=r.existingCreatorEvidence
 if(creatorEvidence!==undefined&&(r.locale!=='en'||creatorEvidence.method!=='independent_existing_original_creator_review'||creatorEvidence.llmReviewed!==true
  ||creatorEvidence.contentId!==r.contentId||creatorEvidence.workTitle!==figure.workTitle||creatorEvidence.workCreator!==figure.workCreator
  ||r.creator!==figure.workCreator||creatorEvidence.creator!==r.creator||creatorEvidence.isbn!==isbn
  ||creatorEvidence.metadataSourceUrl!==r.metadataSourceUrl||creatorEvidence.providerAuthorsMissing!==true
  ||!sourceUrl(creatorEvidence.sourceUrl,true)||!nonempty(creatorEvidence.reason)||creatorEvidence.reason.trim().length<20))
  throw Error('LOCALE_INSERT: missing provider author requires an exact independently confirmed existing original creator')
 const key=JSON.stringify([r.contentId,r.locale]);if(keys.has(key)||isbns.has(isbn)||snapshot.content_locales.some(l=>l.content_id===r.contentId&&l.locale===r.locale))throw Error('LOCALE_INSERT: locale exists or duplicate review')
 keys.add(key);isbns.add(isbn)
 if(snapshot.content_locales.some(l=>l.content_id!==r.contentId&&toIsbn13(l.isbn??'')===isbn)||snapshot.figure_book_editions.some(e=>e.content_id!==r.contentId&&toIsbn13(e.isbn??'')===isbn))throw Error('LOCALE_INSERT: ISBN belongs to another original')
 for(const old of [...snapshot.content_locales,...snapshot.figure_book_editions].filter(x=>x.content_id===r.contentId&&x.locale!==r.locale&&toIsbn13(x.isbn??'')===isbn))if(reviewedBookEditionSelectionReason(old)!=='wrong_locale')throw Error('LOCALE_INSERT: same ISBN other language must be independently rejected first')
 if(r.publisher!==null&&!nonempty(r.publisher)||r.thumbnailUrl!==null&&!sourceUrl(r.thumbnailUrl)||!Array.isArray(r.translators)||r.translators.some(x=>!nonempty(x)))throw Error('LOCALE_INSERT: explicit verified metadata required')
 if(!Object.hasOwn(r,'editionKind')||!Object.hasOwn(r,'textScope')||r.editionKind!==null&&!SERVICE_BOOK_EDITION_KINDS.includes(r.editionKind)||r.textScope!==null&&!nonempty(r.textScope)||excludedBookEditionReason({locale:r.locale,isbn,title:r.title,editionKind:r.editionKind,textScope:r.textScope,workTitles:[r.workTitle]}))throw Error('LOCALE_INSERT: explicit nonexcluded text scope required')
 const sources={primary:r.locale==='en'?'openlibrary':'kakao_book',title:r.metadataSourceUrl,isbn:r.metadataSourceUrl,creator:creatorEvidence?.sourceUrl??r.metadataSourceUrl,translators:r.translators,edition_title:r.title,edition_text_scope_evidence:{isbn,source_url:r.sourceUrl,reason:r.reason}}
 return {content_id:r.contentId,locale:r.locale,title:r.title,creator:r.creator,isbn,publisher:r.publisher,thumbnail_url:r.thumbnailUrl,description:null,affiliate_url:null,verified:true,sources}
 })
 return {assigned:[...workIds],newLocales}
}
export function buildReviewedLocaleInsertSql(workIds,before,reviews){
 const plan=planReviewedLocaleInsert(workIds,before,reviews)
 let delimiter='$reviewed_locale_insert$';for(let n=1;JSON.stringify({before,reviews}).includes(delimiter);n++)delimiter='$reviewed_locale_insert_'+n+'$'
 const variants=[...new Set(plan.newLocales.filter(r=>r.isbn!==null).flatMap(r=>isbnVariants(r.isbn)))].map(sqlLiteral).join(',')
 const inserts=plan.newLocales.map(row=>'INSERT INTO public.content_locales('+Object.keys(row).join(',')+',created_at,updated_at) VALUES('+Object.entries(row).map(([k,v])=>k==='sources'?json(v):v===null?'NULL':typeof v==='boolean'?String(v):sqlLiteral(v)).join(',')+',ts,ts);expected_locales:=expected_locales||jsonb_build_array('+json(row)+'||jsonb_build_object(\'created_at\',ts,\'updated_at\',ts));').join('\n')
 const output='SELECT '+sqlLiteral(prefix)+'||jsonb_build_object('+SNAPSHOT_TABLES.map(t=>sqlLiteral(t)+',(SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) FROM public.'+t+' t WHERE '+where(t,plan.assigned)+')').join(',')+')::text;'
 return '\\set ON_ERROR_STOP on\n\\pset format unaligned\n\\pset tuples_only on\nBEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout=\'5s\';SET LOCAL statement_timeout=\'60s\';\nDO '+delimiter+' DECLARE ts timestamptz:=now();expected_locales jsonb:='+json(before.content_locales)+';BEGIN\nLOCK TABLE public.content_locales,public.figure_book_editions IN SHARE ROW EXCLUSIVE MODE;\n'+SNAPSHOT_TABLES.map(t=>'PERFORM 1 FROM public.'+t+' t WHERE '+where(t,plan.assigned)+' ORDER BY to_jsonb(t)::text FOR UPDATE;').join('\n')+'\n'+SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,json(before[t]))).join('\n')+(variants?'\nIF EXISTS(SELECT 1 FROM public.content_locales WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) OR EXISTS(SELECT 1 FROM public.figure_book_editions WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) THEN RAISE EXCEPTION \'LOCALE_INSERT: ISBN belongs to another original\';END IF;\n':'\n')+inserts+'\n'+SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,t==='content_locales'?'expected_locales':json(before[t]))).join('\n')+'\nEND '+delimiter+';\n'+output+'\nCOMMIT;SELECT \'MERGE_COMMITTED\';'
}
export function verifyReviewedLocaleInsertReadback(workIds,before,reviews,after){
 const plan=planReviewedLocaleInsert(workIds,before,reviews);validSnapshot(after)
 const expected=structuredClone(before);let timestamp
 for(const row of plan.newLocales){const candidates=after.content_locales.filter(l=>l.content_id===row.content_id&&l.locale===row.locale),actual=candidates.length===1&&candidates[0]
 if(!actual||typeof actual.created_at!=='string'||!Number.isFinite(Date.parse(actual.created_at))||actual.updated_at!==actual.created_at||timestamp&&timestamp!==actual.created_at)throw Error('LOCALE_INSERT_READBACK: generated locale timestamp mismatch')
 timestamp??=actual.created_at;expected.content_locales.push({...row,created_at:timestamp,updated_at:timestamp})}
 for(const t of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(expected[t]),rows(after[t])))throw Error('LOCALE_INSERT_READBACK: '+t+' changed')
 return {insertedLocales:plan.newLocales.map(r=>({contentId:r.content_id,locale:r.locale,isbn:r.isbn})),checkedTables:SNAPSHOT_TABLES.length}
}
/** Caller owns the mutation lease; uncertain transport outcomes require actual inspection, never a blind retry. */
export async function applyReviewedLocaleInsert(db,workIds,reviews,{capture=captureCatalogRepairSnapshot,execute}={}){
 const before=await capture(db,workIds);planReviewedLocaleInsert(workIds,before,reviews)
 const output=await executeTemporaryMergeSql(buildReviewedLocaleInsertSql(workIds,before,reviews),randomUUID(),execute)
 const encoded=String(output).split(/\r?\n/u).find(l=>l.trimStart().startsWith(prefix))?.trim()
 if(!encoded||!String(output).split(/\r?\n/u).some(l=>l.trim()==='MERGE_COMMITTED'))throw Error('LOCALE_INSERT_READBACK: commit snapshot missing; inspect owned IDs before retry')
 const committed=JSON.parse(encoded.slice(prefix.length));verifyReviewedLocaleInsertReadback(workIds,before,reviews,committed)
 const after=await capture(db,workIds);validSnapshot(after);for(const t of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(committed[t]),rows(after[t])))throw Error('LOCALE_INSERT_READBACK: actual '+t+' changed')
 return {completed:true,...verifyReviewedLocaleInsertReadback(workIds,before,reviews,after)}
}

const relocationPrefix='LOCALE_RELOCATION_EXPECTED:'
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const introKeys=['description','description_method','description_locale','description_source_locale','source_method','source_locale']
/** Existing English publication misclassified as Korean; this does not register new metadata. */
export function planReviewedLocaleRelocation(workIds,snapshot,reviews){
 validSnapshot(snapshot)
 if(!Array.isArray(workIds)||!workIds.length||workIds.length>20||workIds.some(id=>!nonempty(id))||new Set(workIds).size!==workIds.length
  ||!Array.isArray(reviews)||reviews.length!==workIds.length)throw Error('LOCALE_RELOCATION: exact assigned originals and reviews required')
 const seen=new Set(),relocations=reviews.map(r=>{
  const work=snapshot.contents.find(w=>w.id===r?.contentId&&w.type==='BOOK'),card=r?.beforeLocale,edition=r?.beforeEdition,proof=r?.languageReview
  if(!r||r.method!=='independent_existing_locale_relocation_review'||r.llmReviewed!==true||!workIds.includes(r.contentId)||seen.has(r.contentId)
   ||!work||!isDeepStrictEqual(work,r.beforeWork)||r.fromLocale!=='ko'||r.toLocale!=='en'||!nonempty(r.displayTitle)||!nonempty(r.displayCreator)
   ||!nonempty(r.reason)||r.reason.trim().length<20||!sourceUrl(r.sourceUrl,true))throw Error('LOCALE_RELOCATION: exact current BOOK and reviewed ko-to-en move required')
  seen.add(r.contentId)
  const isbn=toIsbn13(r.isbn??'')
  if(!isbn||isbn!==r.isbn||!card||card.content_id!==r.contentId||card.locale!=='ko'||toIsbn13(card.isbn??'')!==isbn
   ||!snapshot.content_locales.some(l=>isDeepStrictEqual(l,card))||!object(card.sources)||card.sources.primary!=='kakao_book'
   ||!binding('ko',isbn,card.sources.isbn)||!edition||!Number.isSafeInteger(edition.id)||edition.id<=0
   ||edition.content_id!==r.contentId||edition.locale!=='ko'||toIsbn13(edition.isbn??'')!==isbn
   ||!snapshot.figure_book_editions.some(e=>isDeepStrictEqual(e,edition))||!object(edition.sources)||edition.sources.primary!=='kakao_book'
   ||!binding('ko',isbn,edition.sources.isbn)||!nonempty(card.title)||!nonempty(card.creator)||card.title!==edition.title||card.creator!==edition.creator)
   throw Error('LOCALE_RELOCATION: exact current Kakao locale and edition ISBN binding required')
  if(snapshot.content_locales.some(l=>l.content_id===r.contentId&&l.locale==='en')
   ||snapshot.figure_book_editions.some(e=>e.id!==edition.id&&e.content_id===r.contentId&&(e.locale==='en'||e.locale==='ko'
    &&!excludedBookEditionReason({...e,editionKind:e.edition_kind,textScope:e.text_scope}))))
   throw Error('LOCALE_RELOCATION: existing English card/edition or another valid Korean edition requires individual review')
  if([...snapshot.content_locales,...snapshot.figure_book_editions].some(x=>toIsbn13(x.isbn??'')===isbn
   &&!(x===card||isDeepStrictEqual(x,card)||isDeepStrictEqual(x,edition))))throw Error('LOCALE_RELOCATION: another same-ISBN row requires individual review')
  if(!proof||proof.llmReviewed!==true||proof.contentId!==r.contentId||proof.isbn!==isbn||proof.editionTitle!==edition.title
   ||proof.editionCreator!==edition.creator||proof.textLanguage!=='en'||proof.sourceUrl!==r.sourceUrl
   ||!nonempty(proof.bodyEvidence)||proof.bodyEvidence.trim().length<20)throw Error('LOCALE_RELOCATION: exact independent ISBN and actual English body review required')
  if(card.description!==null&&r.descriptionLanguage!=='ko'||card.description===null&&r.descriptionLanguage!==null
   ||edition.description!==null&&edition.description!==card.description)throw Error('LOCALE_RELOCATION: differing or unreviewed introductions require individual review')
  const actualSources={...card.sources},editionSources={...edition.sources}
  // The Korean introduction remains on the Korean display. Its source must not advertise English prose.
  for(const key of introKeys){delete actualSources[key];delete editionSources[key]}
  const display={...card,title:r.displayTitle,creator:r.displayCreator,isbn:null,publisher:null,thumbnail_url:null,affiliate_url:null,verified:false,
   sources:{...card.sources,primary:'none',title:'translated'}}
  const actual={...card,locale:'en',description:null,sources:actualSources}
  const actualEdition={...edition,locale:'en',description:null,sources:editionSources}
  if(excludedBookEditionReason({...actualEdition,editionKind:edition.edition_kind,textScope:edition.text_scope}))throw Error('LOCALE_RELOCATION: actual English edition is excluded')
  return {contentId:r.contentId,isbn,beforeLocale:card,beforeEdition:edition,display,actual,actualEdition}
 })
 return {assigned:[...workIds],relocations}
}
function relocationExpected(before,plan,timestamp){
 const expected=structuredClone(before)
 for(const move of plan.relocations){
  expected.content_locales=expected.content_locales.map(l=>l.content_id===move.contentId&&l.locale==='ko'?{...move.display,updated_at:timestamp}:l)
  expected.content_locales.push({...move.actual,created_at:timestamp,updated_at:timestamp})
  expected.figure_book_editions=expected.figure_book_editions.map(e=>e.id===move.beforeEdition.id?{...move.actualEdition,updated_at:timestamp}:e)
 }
 return expected
}
export function buildReviewedLocaleRelocationSql(workIds,before,reviews){
 const plan=planReviewedLocaleRelocation(workIds,before,reviews)
 let delimiter='$reviewed_locale_relocation$';for(let n=1;JSON.stringify({before,reviews}).includes(delimiter);n++)delimiter='$reviewed_locale_relocation_'+n+'$'
 const variants=[...new Set(plan.relocations.flatMap(r=>isbnVariants(r.isbn)))].map(sqlLiteral).join(',')
 const value=(key,v)=>key==='sources'?json(v):v===null?'NULL':typeof v==='boolean'?String(v):sqlLiteral(v)
 const mutations=plan.relocations.map(m=>{
  const cardKeys=['title','creator','isbn','publisher','thumbnail_url','affiliate_url','verified','sources'],newKeys=Object.keys(m.actual).filter(k=>!['created_at','updated_at'].includes(k))
  if(newKeys.some(k=>!['content_id','locale','title','creator','isbn','publisher','thumbnail_url','description','affiliate_url','verified','sources'].includes(k)))throw Error('LOCALE_RELOCATION: unsupported locale columns')
  return 'UPDATE public.figure_book_editions SET locale=\'en\',description=NULL,sources='+json(m.actualEdition.sources)+',updated_at=ts WHERE id='+m.beforeEdition.id+';\n'
   +'UPDATE public.content_locales SET '+cardKeys.map(k=>k+'='+value(k,m.display[k])).join(',')+',updated_at=ts WHERE content_id='+sqlLiteral(m.contentId)+" AND locale='ko';\n"
   +'INSERT INTO public.content_locales('+newKeys.join(',')+',created_at,updated_at) VALUES('+newKeys.map(k=>value(k,m.actual[k])).join(',')+',ts,ts);'
 }).join('\n')
 const expected=relocationExpected(before,plan,null),timestamped=(table,row)=>{
  const move=plan.relocations.find(m=>m.contentId===row.content_id)
  return json(row)+(move&&table==='content_locales'&&['ko','en'].includes(row.locale)?"||jsonb_build_object('updated_at',ts"+(row.locale==='en'?",'created_at',ts":'')+')':move&&table==='figure_book_editions'&&row.id===move.beforeEdition.id?"||jsonb_build_object('updated_at',ts)":'')
 }
 const expectedSql=t=>['content_locales','figure_book_editions'].includes(t)?'jsonb_build_array('+expected[t].map(r=>timestamped(t,r)).join(',')+')':json(before[t])
 const output='SELECT '+sqlLiteral(relocationPrefix)+'||jsonb_build_object('+SNAPSHOT_TABLES.map(t=>sqlLiteral(t)+',(SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) FROM public.'+t+' t WHERE '+where(t,plan.assigned)+')').join(',')+')::text;'
 return '\\set ON_ERROR_STOP on\n\\pset format unaligned\n\\pset tuples_only on\nBEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout=\'5s\';SET LOCAL statement_timeout=\'60s\';\nDO '+delimiter+' DECLARE ts timestamptz:=now();BEGIN\nLOCK TABLE public.content_locales,public.figure_book_editions IN SHARE ROW EXCLUSIVE MODE;\n'
  +SNAPSHOT_TABLES.map(t=>'PERFORM 1 FROM public.'+t+' t WHERE '+where(t,plan.assigned)+' ORDER BY to_jsonb(t)::text FOR UPDATE;').join('\n')+'\n'
  +SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,json(before[t]))).join('\n')
  +'\nIF EXISTS(SELECT 1 FROM public.content_locales WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) OR EXISTS(SELECT 1 FROM public.figure_book_editions WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) THEN RAISE EXCEPTION \'LOCALE_RELOCATION: ISBN belongs to another original\';END IF;\n'
  +mutations+'\n'+SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,expectedSql(t))).join('\n')+'\nEND '+delimiter+';\n'+output+'\nCOMMIT;SELECT \'MERGE_COMMITTED\';'
}
export function verifyReviewedLocaleRelocationReadback(workIds,before,reviews,after){
 const plan=planReviewedLocaleRelocation(workIds,before,reviews);validSnapshot(after);let timestamp
 for(const move of plan.relocations){
  const card=after.content_locales.find(l=>l.content_id===move.contentId&&l.locale==='en')
  if(!card||typeof card.created_at!=='string'||!Number.isFinite(Date.parse(card.created_at))||card.updated_at!==card.created_at||timestamp&&timestamp!==card.created_at)
   throw Error('LOCALE_RELOCATION_READBACK: generated locale timestamp mismatch')
  timestamp??=card.created_at
 }
 const expected=relocationExpected(before,plan,timestamp)
 for(const t of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(expected[t]),rows(after[t])))throw Error('LOCALE_RELOCATION_READBACK: '+t+' changed')
 return {relocatedLocales:plan.relocations.map(m=>({contentId:m.contentId,editionId:m.beforeEdition.id,isbn:m.isbn,fromLocale:'ko',toLocale:'en'})),checkedTables:SNAPSHOT_TABLES.length}
}
/** Caller owns an exact mutation lease. Uncertain commit/transport is inspected, never retried here. */
export async function applyReviewedLocaleRelocation(db,workIds,reviews,{capture=captureCatalogRepairSnapshot,execute}={}){
 const before=await capture(db,workIds);planReviewedLocaleRelocation(workIds,before,reviews)
 const output=await executeTemporaryMergeSql(buildReviewedLocaleRelocationSql(workIds,before,reviews),randomUUID(),execute)
 const encoded=String(output).split(/\r?\n/u).find(l=>l.trimStart().startsWith(relocationPrefix))?.trim()
 if(!encoded||!String(output).split(/\r?\n/u).some(l=>l.trim()==='MERGE_COMMITTED'))throw Error('LOCALE_RELOCATION_READBACK: commit snapshot missing; inspect owned IDs before retry')
 const committed=JSON.parse(encoded.slice(relocationPrefix.length));verifyReviewedLocaleRelocationReadback(workIds,before,reviews,committed)
 const after=await capture(db,workIds);validSnapshot(after);for(const t of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(committed[t]),rows(after[t])))throw Error('LOCALE_RELOCATION_READBACK: actual '+t+' changed')
 return {completed:true,...verifyReviewedLocaleRelocationReadback(workIds,before,reviews,after)}
}
