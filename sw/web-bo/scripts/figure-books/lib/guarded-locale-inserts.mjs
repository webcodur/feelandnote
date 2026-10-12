/** LLM이 검증한 기존 BOOK의 누락 언어 카드만 넣는다. 다른 17표는 그대로여야 한다. */
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
export function planReviewedLocaleInsert(workIds,snapshot,reviews){
 validSnapshot(snapshot)
 if(!Array.isArray(workIds)||!workIds.length||workIds.length>100||workIds.some(id=>!nonempty(id))||new Set(workIds).size!==workIds.length||!Array.isArray(reviews)||!reviews.length||reviews.length>200)throw Error('LOCALE_INSERT: assigned IDs and explicit reviews required')
 const keys=new Set(),isbns=new Set()
 const newLocales=reviews.map(r=>{
 const work=snapshot.contents.find(w=>w.id===r?.contentId&&w.type==='BOOK'),figure=work?.metadata?.figureBook
 if(!r||!workIds.includes(r.contentId)||!work||!['ko','en'].includes(r.locale)||r.textLanguage!==r.locale||!nonempty(r.title)||!nonempty(r.creator)||!nonempty(r.workTitle)||!nonempty(r.workCreator)||!nonempty(r.reason)||!sourceUrl(r.sourceUrl,true))throw Error('LOCALE_INSERT: exact original, language and independent review required')
 if(!figure||figure.workTitle!==r.workTitle||figure.workCreator!==r.workCreator)throw Error('LOCALE_INSERT: reviewed original differs from live work')
 const isbn=toIsbn13(r.isbn??'');if(!isbn||isbn!==r.isbn||!binding(r.locale,isbn,r.metadataSourceUrl))throw Error('LOCALE_INSERT: exact official ISBN binding required')
 const key=JSON.stringify([r.contentId,r.locale]);if(keys.has(key)||isbns.has(isbn)||snapshot.content_locales.some(l=>l.content_id===r.contentId&&l.locale===r.locale))throw Error('LOCALE_INSERT: locale exists or duplicate review')
 keys.add(key);isbns.add(isbn)
 if(snapshot.content_locales.some(l=>l.content_id!==r.contentId&&toIsbn13(l.isbn??'')===isbn)||snapshot.figure_book_editions.some(e=>e.content_id!==r.contentId&&toIsbn13(e.isbn??'')===isbn))throw Error('LOCALE_INSERT: ISBN belongs to another original')
 for(const old of [...snapshot.content_locales,...snapshot.figure_book_editions].filter(x=>x.content_id===r.contentId&&x.locale!==r.locale&&toIsbn13(x.isbn??'')===isbn))if(reviewedBookEditionSelectionReason(old)!=='wrong_locale')throw Error('LOCALE_INSERT: same ISBN other language must be independently rejected first')
 if(r.publisher!==null&&!nonempty(r.publisher)||r.thumbnailUrl!==null&&!sourceUrl(r.thumbnailUrl)||!Array.isArray(r.translators)||r.translators.some(x=>!nonempty(x)))throw Error('LOCALE_INSERT: explicit verified metadata required')
 if(!Object.hasOwn(r,'editionKind')||!Object.hasOwn(r,'textScope')||r.editionKind!==null&&!SERVICE_BOOK_EDITION_KINDS.includes(r.editionKind)||r.textScope!==null&&!nonempty(r.textScope)||excludedBookEditionReason({locale:r.locale,isbn,title:r.title,editionKind:r.editionKind,textScope:r.textScope,workTitles:[r.workTitle]}))throw Error('LOCALE_INSERT: explicit nonexcluded text scope required')
 const sources={primary:r.locale==='en'?'openlibrary':'kakao_book',title:r.metadataSourceUrl,isbn:r.metadataSourceUrl,creator:r.metadataSourceUrl,translators:r.translators,edition_title:r.title,edition_text_scope_evidence:{isbn,source_url:r.sourceUrl,reason:r.reason}}
 return {content_id:r.contentId,locale:r.locale,title:r.title,creator:r.creator,isbn,publisher:r.publisher,thumbnail_url:r.thumbnailUrl,description:null,affiliate_url:null,verified:true,sources}
 })
 return {assigned:[...workIds],newLocales}
}
export function buildReviewedLocaleInsertSql(workIds,before,reviews){
 const plan=planReviewedLocaleInsert(workIds,before,reviews)
 let delimiter='$reviewed_locale_insert$';for(let n=1;JSON.stringify({before,reviews}).includes(delimiter);n++)delimiter='$reviewed_locale_insert_'+n+'$'
 const variants=[...new Set(plan.newLocales.flatMap(r=>isbnVariants(r.isbn)))].map(sqlLiteral).join(',')
 const inserts=plan.newLocales.map(row=>'INSERT INTO public.content_locales('+Object.keys(row).join(',')+',created_at,updated_at) VALUES('+Object.entries(row).map(([k,v])=>k==='sources'?json(v):v===null?'NULL':typeof v==='boolean'?String(v):sqlLiteral(v)).join(',')+',ts,ts);expected_locales:=expected_locales||jsonb_build_array('+json(row)+'||jsonb_build_object(\'created_at\',ts,\'updated_at\',ts));').join('\n')
 const output='SELECT '+sqlLiteral(prefix)+'||jsonb_build_object('+SNAPSHOT_TABLES.map(t=>sqlLiteral(t)+',(SELECT coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) FROM public.'+t+' t WHERE '+where(t,plan.assigned)+')').join(',')+')::text;'
 return '\\set ON_ERROR_STOP on\n\\pset format unaligned\n\\pset tuples_only on\nBEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout=\'5s\';SET LOCAL statement_timeout=\'60s\';\nDO '+delimiter+' DECLARE ts timestamptz:=now();expected_locales jsonb:='+json(before.content_locales)+';BEGIN\nLOCK TABLE public.content_locales,public.figure_book_editions IN SHARE ROW EXCLUSIVE MODE;\n'+SNAPSHOT_TABLES.map(t=>'PERFORM 1 FROM public.'+t+' t WHERE '+where(t,plan.assigned)+' ORDER BY to_jsonb(t)::text FOR UPDATE;').join('\n')+'\n'+SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,json(before[t]))).join('\n')+'\nIF EXISTS(SELECT 1 FROM public.content_locales WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) OR EXISTS(SELECT 1 FROM public.figure_book_editions WHERE upper(regexp_replace(coalesce(isbn,\'\'),\'[[:space:]-]\',\'\',\'g\')) IN ('+variants+') AND content_id NOT IN ('+plan.assigned.map(sqlLiteral).join(',')+')) THEN RAISE EXCEPTION \'LOCALE_INSERT: ISBN belongs to another original\';END IF;\n'+inserts+'\n'+SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,t==='content_locales'?'expected_locales':json(before[t]))).join('\n')+'\nEND '+delimiter+';\n'+output+'\nCOMMIT;SELECT \'MERGE_COMMITTED\';'
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
