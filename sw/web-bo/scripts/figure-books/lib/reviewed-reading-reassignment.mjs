/** 서로 다른 저작에 오연결된 기존 감상 행의 content_id만 교정한다. 문장·출처·상태와 나머지 참조는 보존한다. */
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {executeTemporaryMergeSql} from '../merge-works.mjs'
import {captureCatalogRepairSnapshot} from './guarded-catalog-repairs.mjs'
import {SNAPSHOT_TABLES,referenceWhere,sqlLiteral} from './merge-work-sql.mjs'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {excludedBookEditionReason,reviewedBookEditionSelectionReason} from '../../../../../packages/content-search/src/book-edition-policy.ts'
const prefix='READING_REASSIGN_EXPECTED:'
const named=x=>typeof x==='string'&&!!x.trim()&&!x.includes('\0')
const text=x=>named(x)&&x.trim().length>=20
const anchor=w=>Object.fromEntries(['workTitle','workCreator','workIdentity','originalTitle','originalCreator'].map(k=>[k,w.metadata?.figureBook?.[k]??null]))
const json=x=>sqlLiteral(JSON.stringify(x))+'::jsonb'
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x
const rows=x=>x.map(r=>JSON.stringify(canonical(r))).sort()
function source(url){try{const u=new URL(url);return named(url)&&u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','127.0.0.1','::1','[::1]'].includes(u.hostname)&&!/(?:^|\.)(?:openlibrary\.org|books\.google\.[a-z.]+|googleapis\.com)$/iu.test(u.hostname)&&![...u.searchParams.keys()].some(k=>/api.?key|token|secret|password|authorization/iu.test(k))}catch{return false}}
function full(s){for(const t of SNAPSHOT_TABLES)if(!Array.isArray(s?.[t]))throw Error('READING_REASSIGN: full18 snapshot required')}
export function planReviewedReadingReassignment(workIds,before,reviews){
 full(before)
 if(!Array.isArray(workIds)||!workIds.length||workIds.length>100||workIds.some(id=>!named(id))||new Set(workIds).size!==workIds.length||!Array.isArray(reviews)||!reviews.length||reviews.length>20)throw Error('READING_REASSIGN: assigned IDs and explicit reviews required')
 const expected=structuredClone(before),moved=new Set(),affected=new Set()
 for(const r of reviews){
  const row=r?.reading,old=before.contents.find(w=>w.id===r?.fromContentId&&w.type==='BOOK'),target=before.contents.find(w=>w.id===r?.toContentId&&w.type==='BOOK'),proof=r?.sourceReview,ref=r?.referenceEdition
  if(!r||r.method!=='independent_existing_reading_reassignment_review'||r.llmReviewed!==true||!workIds.includes(r.fromContentId)||!workIds.includes(r.toContentId)||r.fromContentId===r.toContentId||!old||!target
   ||!isDeepStrictEqual(r.fromWork,old)||!isDeepStrictEqual(r.toWork,target)||!row||!named(String(row.id??''))||!named(row.celeb_id)||row.content_id!==old.id
   ||!before.celeb_contents.some(x=>isDeepStrictEqual(x,row))||before.celeb_contents.filter(x=>String(x.id)===String(row.id)).length!==1||moved.has(String(row.id))
   ||!text(r.reason)||!source(row.source_url))throw Error('READING_REASSIGN: exact current reading and both assigned original rows required')
  const a=anchor(old),b=anchor(target)
  if(!named(b.workTitle)||!named(b.workCreator)||!named(b.workIdentity)||b.workIdentity===a.workIdentity)throw Error('READING_REASSIGN: independently distinct target original required')
  if(!proof||proof.llmReviewed!==true||proof.celebId!==row.celeb_id||proof.sourceUrl!==row.source_url||!isDeepStrictEqual(proof.targetWorkAnchor,b)
   ||proof.entireExistingReviewSupported!==true||proof.distinctOriginalConfirmed!==true||!source(proof.originalReadingSourceUrl)||!text(proof.originalReadingBodyEvidence)
   ||!text(proof.readingEvidence)||!text(proof.existingReviewEvidence)||!text(proof.originalDistinctionEvidence))throw Error('READING_REASSIGN: actual reading source must support the unchanged entire review and distinct original')
  const editionReview=r.referenceReview
  if(!ref||ref.content_id!==target.id||!['ko','en'].includes(ref.locale)||!toIsbn13(ref.isbn??'')||!named(ref.title)||!named(ref.creator)||ref.sources?.primary==='none'
   ||!before.figure_book_editions.some(e=>isDeepStrictEqual(e,ref))||excludedBookEditionReason({...ref,editionKind:ref.edition_kind,textScope:ref.text_scope,workTitles:[b.workTitle,b.originalTitle].filter(Boolean)})||reviewedBookEditionSelectionReason(ref)
   ||!editionReview||editionReview.llmReviewed!==true||!isDeepStrictEqual(editionReview.workAnchor,b)||editionReview.isbn!==ref.isbn||editionReview.editionTitle!==ref.title||editionReview.editionCreator!==ref.creator||editionReview.locale!==ref.locale
   ||!source(editionReview.sourceUrl)||!text(editionReview.bodyEvidence)||!text(editionReview.scopeEvidence))throw Error('READING_REASSIGN: exact normal target edition and independently read original body required')
  if(expected.celeb_contents.some(x=>x.content_id===target.id&&x.celeb_id===row.celeb_id))throw Error('READING_REASSIGN: existing target reading collision; no automatic deletion')
  expected.celeb_contents.find(x=>String(x.id)===String(row.id)).content_id=target.id
  moved.add(String(row.id));affected.add(old.id);affected.add(target.id)
 }
 // 현행 update_domain_content_counts 트리거와 같은 기존 세 집계만 재계산한다.
 for(const work of expected.contents.filter(w=>affected.has(w.id))){const members=expected.member_contents.filter(r=>r.content_id===work.id).length,celeb=expected.celeb_contents.filter(r=>r.content_id===work.id).length;for(const [k,v] of Object.entries({member_count:members,celeb_count:celeb,record_count:members+celeb})){if(!Object.hasOwn(work,k))throw Error('READING_REASSIGN: current counters required');work[k]=v}}
 return {assigned:[...workIds],expected,movedIds:[...moved]}
}
const where=ids=>table=>ids.map(id=>'('+referenceWhere(table,sqlLiteral(id),sqlLiteral(id),'t')+')').join(' OR ')
function check(table,ids,expected){return `IF (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM (SELECT to_jsonb(t) v FROM public.${table} t WHERE ${where(ids)(table)}) a) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY v::text),'[]'::jsonb) FROM jsonb_array_elements(${json(expected)}) v) THEN RAISE EXCEPTION 'READING_REASSIGN: rowset mismatch ${table}';END IF;`}
export function buildReviewedReadingReassignmentSql(workIds,before,reviews){
 const plan=planReviewedReadingReassignment(workIds,before,reviews)
 let delimiter='$reading_reassign$';for(let n=1;JSON.stringify({before,reviews}).includes(delimiter);n++)delimiter='$reading_reassign_'+n+'$'
 const statements=reviews.map(r=>`UPDATE public.celeb_contents SET content_id=${sqlLiteral(r.toContentId)} WHERE id::text=${sqlLiteral(String(r.reading.id))} AND content_id=${sqlLiteral(r.fromContentId)} AND celeb_id::text=${sqlLiteral(r.reading.celeb_id)};GET DIAGNOSTICS affected_rows=ROW_COUNT;IF affected_rows<>1 THEN RAISE EXCEPTION 'READING_REASSIGN: exact reading changed';END IF;`).join('\n')
 const output=`SELECT ${sqlLiteral(prefix)}||jsonb_build_object(${SNAPSHOT_TABLES.map(t=>sqlLiteral(t)+",(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public."+t+' t WHERE '+where(plan.assigned)(t)+')').join(',')})::text;`
 return `\\set ON_ERROR_STOP on\n\\pset format unaligned\n\\pset tuples_only on\nBEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';\nDO ${delimiter} DECLARE affected_rows integer;BEGIN\nLOCK TABLE public.celeb_contents IN SHARE ROW EXCLUSIVE MODE;\n${SNAPSHOT_TABLES.map(t=>'PERFORM 1 FROM public.'+t+' t WHERE '+where(plan.assigned)(t)+' ORDER BY to_jsonb(t)::text FOR UPDATE;').join('\n')}\n${SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,before[t])).join('\n')}\n${statements}\n${SNAPSHOT_TABLES.map(t=>check(t,plan.assigned,plan.expected[t])).join('\n')}\nEND ${delimiter};\n${output}\nCOMMIT;SELECT 'MERGE_COMMITTED';`
}
export function verifyReviewedReadingReassignment(workIds,before,reviews,after){
 const plan=planReviewedReadingReassignment(workIds,before,reviews);full(after)
 for(const table of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(plan.expected[table]),rows(after[table])))throw Error('READING_REASSIGN_READBACK: '+table+' changed')
 return {movedReadingIds:plan.movedIds,checkedTables:SNAPSHOT_TABLES.length}
}
/** Caller must acquire the mutation lease in a separate call before actual execution. */
export async function applyReviewedReadingReassignment(db,workIds,reviews,options={}){
 if(options.apply===false||options.dryRun===true)throw Error('READING_REASSIGN: actual execution; use planReviewedReadingReassignment for previews')
 const {capture=captureCatalogRepairSnapshot,execute}=options,before=await capture(db,workIds)
 const sql=buildReviewedReadingReassignmentSql(workIds,before,reviews),output=await executeTemporaryMergeSql(sql,randomUUID(),execute)
 const encoded=String(output).split(/\r?\n/u).find(l=>l.trimStart().startsWith(prefix))?.trim()
 if(!encoded||!String(output).split(/\r?\n/u).some(l=>l.trim()==='MERGE_COMMITTED'))throw Error('READING_REASSIGN_READBACK: commit snapshot missing; inspect owned IDs before any retry')
 const committed=JSON.parse(encoded.slice(prefix.length));verifyReviewedReadingReassignment(workIds,before,reviews,committed)
 const actual=await capture(db,workIds);full(actual)
 for(const t of SNAPSHOT_TABLES)if(!isDeepStrictEqual(rows(committed[t]),rows(actual[t])))throw Error('READING_REASSIGN_READBACK: actual '+t+' changed')
 return {completed:true,...verifyReviewedReadingReassignment(workIds,before,reviews,actual)}
}
