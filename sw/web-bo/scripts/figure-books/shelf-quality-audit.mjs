/** 공개 책장의 ISBN 조회와 판본 없는 작품 후보 추출. 읽기 전용이며 파일·DB에 원장을 쓰지 않는다. */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {dbClient,allRows} from './lib/figure-work.mjs'
import {excludedBookEditionReason} from '../../../../packages/content-search/src/book-edition-policy.ts'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'
import {createYes24ShelfQualityLoader,needsShelfQualityReview,SHELF_QUALITY_AUDIT,YES24_DAILY_QUOTA_EXHAUSTED} from './lib/yes24-shelf-quality.mjs'

/** 대량 점검은 운영 조회용 키를 빌려 쓰지 않는다. */
export function shelfQualityAuditKey(env,webApiKey) {
 const key=env.YES24_AUDIT_API_KEY?.trim()
 if(!key)throw Error('YES24_AUDIT_API_KEY required; production YES24_API_KEY is not used for bulk audits')
 if([env.YES24_API_KEY,webApiKey].some(value=>value?.trim()===key))throw Error('Bulk audit key must differ from the production YES24_API_KEY')
 return key
}

/** 연구용 키만 순서대로 사용하며 일일 할당량 소진이 확인된 경우에만 전환한다. */
export function createShelfQualityResearchLoader(env,webApiKey,fetcher=fetch,onSwitch=()=>{}) {
 const primary=shelfQualityAuditKey(env,webApiKey)
 const secondary=env.YES24_AUDIT_SECONDARY_API_KEY?.trim()
 if(secondary&&[env.YES24_API_KEY,webApiKey].some(value=>value?.trim()===secondary))throw Error('Bulk audit secondary key must differ from the production YES24_API_KEY')
 const keys=[primary,...(secondary&&secondary!==primary?[secondary]:[])]
 const loaders=keys.map(key=>createYes24ShelfQualityLoader(key,fetcher))
 let current=0
 return async edition=>{
  for(;;){
   const attempted=current
   try{return await loaders[attempted](edition)}catch(error){
    if(error.code!==YES24_DAILY_QUOTA_EXHAUSTED)throw error
    // 병렬 요청의 같은 소진 응답이 다음 연구 키까지 건너뛰지 않게 한다.
    if(current!==attempted)continue
    if(current+1>=loaders.length)throw error
    current++
    onSwitch({researchKeyPosition:current+1,reason:YES24_DAILY_QUOTA_EXHAUSTED})
   }
  }
 }
}

export function detectShelfCatalogGaps(catalog,publicIds,editions) {
 const byWork=new Map()
 for(const edition of editions){const rows=byWork.get(edition.content_id)??[];rows.push(edition);byWork.set(edition.content_id,rows)}
 const locales=new Map()
 for(const card of catalog.locales){const rows=locales.get(card.content_id)??[];rows.push(card);locales.set(card.content_id,rows)}
 return catalog.contents.filter(work=>publicIds.has(work.id)&&!(byWork.get(work.id)??[]).some(row=>toIsbn13(row.isbn??''))
  &&(work.catalog||(byWork.get(work.id)?.length??0)>0||!(locales.get(work.id)??[]).some(card=>card.sources?.primary!=='none'&&toIsbn13(card.isbn??''))))
  .map(work=>({contentId:work.id,reason:(byWork.get(work.id)?.length??0)>0?'no_valid_edition_isbn':'no_physical_edition',
   externalId:work.external_id,workIdentity:work.figureBook?.workIdentity??work.metadata?.workIdentity??null,
   referenceCounts:work.referenceCounts,locales:locales.get(work.id)??[],editionIds:(byWork.get(work.id)??[]).map(row=>row.id)}))
  .sort((a,b)=>a.contentId.localeCompare(b.contentId))
}

export async function loadPublicShelfAuditCatalog(catalog,db) {
 const active=new Set(catalog.people.filter(p=>p.publication_status==='active').map(p=>p.id))
 const ids=new Set([...catalog.relations,...catalog.readings].filter(r=>active.has(r.celeb_id)).map(r=>r.content_id))
 const [professions,themes]=await Promise.all([
  allRows('profession shelves',(a,b)=>db.from('profession_book_picks').select('content_id').order('content_id').range(a,b)),
  allRows('theme shelves',(a,b)=>db.from('faction_lv2').select('id,theme_book_ids').order('id').range(a,b))])
 for(const row of professions)ids.add(row.content_id)
 for(const row of themes)for(const id of row.theme_book_ids??[])ids.add(id)
 const editions=catalog.editions.filter(row=>ids.has(row.content_id)&&!excludedBookEditionReason({...row,editionKind:row.edition_kind,textScope:row.text_scope}))
 return {editions:editions.filter(row=>row.locale==='ko'),catalogReview:detectShelfCatalogGaps(catalog,ids,editions)}
}

export async function loadPublicShelfEditions(catalog,db) {
 return (await loadPublicShelfAuditCatalog(catalog,db)).editions
}

export async function auditShelfQuality(editions,loader,progress=()=>{},offset=0) {
 const byIsbn=new Map()
 for(const edition of editions){const rows=byIsbn.get(edition.isbn)??[];rows.push(edition);byIsbn.set(edition.isbn,rows)}
 const groups=[...byIsbn.values()].sort((a,b)=>Number(/부크크|유페이퍼|퍼플|삼국지/iu.test(b[0].publisher+' '+b[0].title))-Number(/부크크|유페이퍼|퍼플|삼국지/iu.test(a[0].publisher+' '+a[0].title))||String(a[0].isbn??'').localeCompare(String(b[0].isbn??'')))
 const results=[],errors={},review=[],editionReview=[],total=groups.length;let cursor=offset,checked=0,verified=0,stopped=null
 await Promise.all(Array.from({length:SHELF_QUALITY_AUDIT.concurrency},async()=>{
  while(cursor<total&&!stopped){
   const rows=groups[cursor++];let result
   try{result=await loader(rows[0])}catch(error){
    if(error.code!==YES24_DAILY_QUOTA_EXHAUSTED)throw error
    if(!stopped){stopped={reason:error.code,retryAt:error.retryAt??null};progress({qualityStopped:stopped})}
    break
   }
   checked++
   if(result.verified)verified++;else errors[result.error]=(errors[result.error]??0)+1
   const catalogTitles=[...new Set(rows.map(row=>row.title).filter(Boolean))]
   const normalizeTitle=title=>String(title??'').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'')
   const sourceTitle=normalizeTitle(result.title)
   const titleConflict=result.verified&&sourceTitle&&catalogTitles.length>0&&!catalogTitles.some(title=>{
    const catalogTitle=normalizeTitle(title)
    return catalogTitle&&(catalogTitle.includes(sourceTitle)||sourceTitle.includes(catalogTitle))
   })
   const record={...result,catalogTitles,reviewSignals:[...(result.reviewSignals??[]),...(titleConflict?['catalog_title_mismatch']:[])],editionIds:rows.map(r=>r.id),contentIds:[...new Set(rows.map(r=>r.content_id))]};results.push(record)
   if(needsShelfQualityReview(record)){review.push(record);progress({qualityReview:record})}
   if(result.verified&&result.policyReason){editionReview.push(record);progress({qualityEditionReview:record})}
   if(checked%100===0||checked===total-offset)progress({qualityProgress:{checked,total,offset,verified,unconfirmed:checked-verified,review:review.length,errors}})
  }
 }))
 return {checked,total,offset,verified,unconfirmed:checked-verified,stopped,review:review.sort((a,b)=>a.rating-b.rating||(a.salesIndex??Infinity)-(b.salesIndex??Infinity)),editionReview,errors,results}
}

async function main(){
 const args=process.argv.slice(2)
 if(args.some(arg=>arg!=='--catalog-only'&&!/^--offset=\d+$/u.test(arg))||args.filter(arg=>arg==='--catalog-only').length>1||args.filter(arg=>arg.startsWith('--offset=')).length>1)throw Error('Usage: shelf-quality-audit.mjs [--offset=N] [--catalog-only] (read-only; no output file)')
 const offset=Number(args.find(arg=>arg.startsWith('--offset='))?.split('=')[1]??0)
 const {editions,catalogReview}=await loadPublicShelfAuditCatalog(loadSeriesAuditCatalog(),dbClient())
 console.log(JSON.stringify({publicShelfCatalogAudit:{unconfirmedWorks:catalogReview.length}}))
 if(args.includes('--catalog-only')){
  for(const candidate of catalogReview)console.log(JSON.stringify({qualityCatalogReview:candidate}))
  return
 }
 const env=readFileSync(fileURLToPath(new URL('../../../../sw/web/.env',import.meta.url)),'utf8')
 const webApiKey=env.split(/\r?\n/u).find(line=>line.startsWith('YES24_API_KEY='))?.slice('YES24_API_KEY='.length).trim().replace(/^["']|["']$/gu,'')
 const loader=createShelfQualityResearchLoader(process.env,webApiKey,fetch,result=>console.log(JSON.stringify({qualityResearchKeySwitched:result})))
 console.log(JSON.stringify({publicShelfEditionAudit:{editions:editions.length,uniqueIsbns:new Set(editions.map(e=>e.isbn)).size}}))
 const report=await auditShelfQuality(editions,loader,result=>{
  const kind=result.qualityReview?'qualityReview':result.qualityEditionReview?'qualityEditionReview':null
  if(!kind){console.log(JSON.stringify(result));return}
  // 출처 본문은 LLM이 상품 페이지에서 읽는다. 긴 분류 원문으로 검수 후보 출력이 잘리지 않게 한다.
  const {categories,...review}=result[kind]
  console.log(JSON.stringify({[kind]:review}))
 },offset)
 const summary={checked:report.checked,total:report.total,offset:report.offset,verified:report.verified,unconfirmed:report.unconfirmed,review:report.review.length,editionReview:report.editionReview.length,errors:report.errors}
 console.log(JSON.stringify(report.stopped?{qualityAuditStopped:{...summary,...report.stopped}}:{qualityAuditComplete:summary}))
 if(report.stopped)process.exitCode=2
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main()
