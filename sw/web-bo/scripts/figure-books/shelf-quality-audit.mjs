/** 현재 공개 책장에 연결된 한국어 판본을 ISBN으로 전수 조회한다. 파일·DB에 원장을 쓰지 않는다. */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {dbClient,allRows} from './lib/figure-work.mjs'
import {excludedBookEditionReason} from '../../../../packages/content-search/src/book-edition-policy.ts'
import {createYes24ShelfQualityLoader,needsShelfQualityReview,SHELF_QUALITY_AUDIT,YES24_DAILY_QUOTA_EXHAUSTED} from './lib/yes24-shelf-quality.mjs'

export async function loadPublicShelfEditions(catalog,db) {
 const active=new Set(catalog.people.filter(p=>p.publication_status==='active').map(p=>p.id))
 const ids=new Set([...catalog.relations,...catalog.readings].filter(r=>active.has(r.celeb_id)).map(r=>r.content_id))
 const [professions,themes]=await Promise.all([
  allRows('profession shelves',(a,b)=>db.from('profession_book_picks').select('content_id').order('content_id').range(a,b)),
  allRows('theme shelves',(a,b)=>db.from('faction_lv2').select('id,theme_book_ids').order('id').range(a,b))])
 for(const row of professions)ids.add(row.content_id)
 for(const row of themes)for(const id of row.theme_book_ids??[])ids.add(id)
 return catalog.editions.filter(row=>row.locale==='ko'&&ids.has(row.content_id)&&!excludedBookEditionReason({...row,editionKind:row.edition_kind,textScope:row.text_scope}))
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
   const record={...result,editionIds:rows.map(r=>r.id),contentIds:[...new Set(rows.map(r=>r.content_id))]};results.push(record)
   if(needsShelfQualityReview(result)){review.push(record);progress({qualityReview:record})}
   if(result.verified&&result.policyReason){editionReview.push(record);progress({qualityEditionReview:record})}
   if(checked%100===0||checked===total-offset)progress({qualityProgress:{checked,total,offset,verified,unconfirmed:checked-verified,review:review.length,errors}})
  }
 }))
 return {checked,total,offset,verified,unconfirmed:checked-verified,stopped,review:review.sort((a,b)=>a.rating-b.rating||(a.salesIndex??Infinity)-(b.salesIndex??Infinity)),editionReview,errors,results}
}

async function main(){
 const args=process.argv.slice(2)
 if(args.some(arg=>!/^--offset=\d+$/u.test(arg))||args.length>1)throw Error('Usage: shelf-quality-audit.mjs [--offset=N] (read-only; no output file)')
 const offset=Number(args[0]?.split('=')[1]??0)
 const env=readFileSync(fileURLToPath(new URL('../../../../sw/web/.env',import.meta.url)),'utf8')
 const key=process.env.YES24_API_KEY??env.split(/\r?\n/u).find(line=>line.startsWith('YES24_API_KEY='))?.slice('YES24_API_KEY='.length).trim().replace(/^["']|["']$/gu,'')
 if(!key)throw Error('YES24_API_KEY required')
 const editions=await loadPublicShelfEditions(loadSeriesAuditCatalog(),dbClient())
 console.log(JSON.stringify({publicShelfEditionAudit:{editions:editions.length,uniqueIsbns:new Set(editions.map(e=>e.isbn)).size}}))
 const report=await auditShelfQuality(editions,createYes24ShelfQualityLoader(key),result=>console.log(JSON.stringify(result)),offset)
 const summary={checked:report.checked,total:report.total,offset:report.offset,verified:report.verified,unconfirmed:report.unconfirmed,review:report.review.length,editionReview:report.editionReview.length,errors:report.errors}
 console.log(JSON.stringify(report.stopped?{qualityAuditStopped:{...summary,...report.stopped}}:{qualityAuditComplete:summary}))
 if(report.stopped)process.exitCode=2
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main()
