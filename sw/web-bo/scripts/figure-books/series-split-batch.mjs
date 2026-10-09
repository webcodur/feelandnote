/** 기계 대조는 초벌이며, LLM의 독립 출처 검수가 있는 후보만 기존 통합기로 반영한다. */
import {readFileSync,writeFileSync} from 'node:fs'
import {fork} from 'node:child_process'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {dbClient} from './lib/figure-work.mjs'
import {normalizeAuditText} from './lib/series-audit.mjs'
import {reviewCandidate,officialAuthorKeys,verifiedSeriesSubsets} from './series-split-source-check.mjs'
import {repairSeries} from './series-split-repair.mjs'
import {applyOne,captureDatabaseSnapshot,checkFixedReferences,executeTemporaryMergeSql} from './merge-works.mjs'
import {sqlLiteral} from './lib/merge-work-sql.mjs'
import {randomUUID} from 'node:crypto'
import {auditCurrentBooks} from './series-split-audit.mjs'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'
const file=process.argv.find(a=>a.startsWith('--file='))?.slice(7)
const evidenceFile=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11)
const norm=value=>normalizeAuditText(value).replace(/[\p{P}\p{Z}]/gu,'')
const read=async(db,table,ids)=>{const r=await db.from(table).select('*').in(table==='contents'?'id':'content_id',ids);if(r.error)throw Error(table+': '+r.error.message);return r.data}

export function validateOriginalEditions(editions,proof,facts) {
  if(editions.some(e=>!e.isbn&&e.sources?.primary!=='none'))throw Error('ISBN 없는 실제 판본은 독립 귀속 검수 필요')
  const actual=editions.filter(e=>e.isbn)
  if(!actual.length)throw Error('현재 실제 판본 없음')
  for(const edition of actual) {
    const isbn=toIsbn13(edition.isbn),book=facts[isbn]
    if(!book)throw Error('현재 ISBN 출처 누락: '+isbn)
    if(book.provider==='kakao_book') {
      if(norm(book.title)!==norm(edition.title)||book.authors.map(norm).sort().join('|')!==edition.creator?.split(/[,，]/).map(norm).sort().join('|'))throw Error('현재 국내 판본과 출처 불일치: '+isbn)
    }else if(book.workKeys.length!==1||book.workKeys[0]!==proof.workKey||officialAuthorKeys(book).join('|')!==proof.authorKeys.join('|')||edition.locale!=='en'||![norm(book.title),norm([book.title,book.subtitle].filter(Boolean).join(': '))].includes(norm(edition.title)))throw Error('현재 원서와 공식 원작·저자·제목 불일치: '+isbn)
  }
}

export function originalKeepScore(c,candidate,{protectedIds=[],members=[],readings=[],locales=[]}={}) {
  return Number(protectedIds.includes(c.id))*1e9+Number(candidate.sourceReview?.preferredKeep===c.id)*1e8+Number(!!(c.metadata?.figureBook?.workIdentity&&!c.metadata.figureBook.workIdentity.startsWith('book/')))*1e7+Number(!!c.metadata?.workKey)*1e6+members.filter(r=>r.content_id===c.id).length*1000+readings.filter(r=>r.content_id===c.id).length*100+locales.filter(r=>r.content_id===c.id).length
}

/** 일부 작품을 통합한 뒤 재탐지해도, 독립 작품이라는 검수 결정을 보존한다. */
export function previousIndependentReview(candidate,candidates) {
 const mapping=new Map()
 for(const c of candidates.filter(c=>c.repair?.completed))for(const id of c.repair.mergedContentIds??[])mapping.set(id,c.repair.keep)
 const mapped=id=>{const seen=new Set();while(mapping.has(id)){if(seen.has(id))throw Error('검수 대표 ID 순환');seen.add(id);id=mapping.get(id)}return id}
 const key=ids=>[...new Set(ids.map(mapped))].sort().join('|'),target=key(candidate.contentIds)
 return candidates.find(c=>c.sourceReview?.verdict==='different_originals_confirmed'&&c.sourceReview.method==='independent_work_review'&&key(c.contentIds)===target)?.sourceReview
}

export function batchCandidateReview(candidate,facts,apply) {
 if(!apply)return reviewCandidate(candidate,facts)
 const review=candidate.sourceReview
 if(!['same_original_confirmed','same_edition_confirmed','series_split_confirmed'].includes(review?.verdict))return null
 const method=review.verdict==='series_split_confirmed'?'independent_series_review':'independent_work_review'
 if(review.method!==method||!Array.isArray(review.sources)||!review.sources.length||review.sources.some(url=>typeof url!=='string'||!/^https:\/\//u.test(url)))return null
 return review
}

async function repairOriginal(db,candidate,facts,apply) {
  const [contents,editions,locales,members,readings]=await Promise.all(['contents','figure_book_editions','content_locales','member_contents','celeb_contents'].map(t=>read(db,t,candidate.contentIds)))
  if(!contents.length)throw Error('기존 ID가 모두 이동됨: 현재 대표 추적 필요')
  validateOriginalEditions([...editions,...locales.filter(l=>l.isbn&&!editions.some(e=>e.content_id===l.content_id&&e.locale===l.locale&&e.isbn===l.isbn))],candidate.sourceReview,facts)
  if(candidate.sourceReview.workKey&&contents.some(c=>c.metadata?.workKey&&c.metadata.workKey!==candidate.sourceReview.workKey))throw Error('현재 작품 원작 키와 공식 원작 키 충돌')
  const protectedIds=contents.filter(c=>{try{checkFixedReferences({drop:c.id});return false}catch{return true}}).map(c=>c.id)
  if(protectedIds.length>1)throw Error('둘 이상의 작품에 고정 코드·Remotion 참조')
  contents.sort((a,b)=>originalKeepScore(b,candidate,{protectedIds,members,readings,locales})-originalKeepScore(a,candidate,{protectedIds,members,readings,locales})||a.id.localeCompare(b.id))
  const keep=contents[0].id,drops=contents.slice(1).map(c=>c.id),merged=[]
  if(!apply)return {keep,drops,editionCount:editions.length,dryRun:true}
  for(const drop of drops) {
    const result=await applyOne(db,{keep,drop},{capture:captureDatabaseSnapshot})
    if(!result.completed)throw Error(drop+': '+result.skip)
    merged.push(drop)
    process.send?.({type:'pair',keep,drop})
  }
  const after=await read(db,'figure_book_editions',[keep])
  for(const before of editions)if(before.isbn&&!after.some(e=>e.isbn===before.isbn&&e.locale===before.locale))throw Error('판본 ISBN 재조회 불일치: '+before.isbn)
  const current=await read(db,'contents',[keep])
  if(!current[0])throw Error('대표 작품 재조회 실패')
  const existing=current[0].metadata?.workKey
  if(candidate.sourceReview.workKey&&existing&&existing!==candidate.sourceReview.workKey)throw Error('기존 원작 키와 충돌: '+existing)
  if(candidate.sourceReview.workKey&&!existing) {
    const before=current[0].metadata,after={...before,workKey:candidate.sourceReview.workKey}
    // 대형 기존 메타를 URL 필터에 넣으면 프록시 길이 제한에 걸린다. 잠근 행을 그대로 비교한다.
    executeTemporaryMergeSql(`\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout='5s';\nDO $work_key$ BEGIN\nPERFORM 1 FROM public.contents WHERE id=${sqlLiteral(keep)} FOR UPDATE;\nIF (SELECT metadata FROM public.contents WHERE id=${sqlLiteral(keep)}) IS DISTINCT FROM ${sqlLiteral(JSON.stringify(before))}::jsonb THEN RAISE EXCEPTION 'Concurrent original metadata'; END IF;\nUPDATE public.contents SET metadata=${sqlLiteral(JSON.stringify(after))}::jsonb WHERE id=${sqlLiteral(keep)};\nEND; $work_key$;\nCOMMIT;\nSELECT 'MERGE_COMMITTED';\n`,randomUUID())
    const verified=await read(db,'contents',[keep])
    if(verified[0]?.metadata?.workKey!==candidate.sourceReview.workKey)throw Error('대표 원작 키 저장·재조회 실패')
  }
  return {keep,mergedContentIds:merged,editionCount:after.length,completed:true}
}

async function worker() {
  if(!file||!evidenceFile)throw Error('--file=<검수한 임시 후보 파일> --evidence=<임시 ISBN 근거 파일>이 필요합니다')
  const db=dbClient(),facts=JSON.parse(readFileSync(evidenceFile,'utf8')).facts
  const log=console.log
  console.log=value=>{try{const p=JSON.parse(value);if(p.series&&p.drop&&p.completed){process.send?.({type:'pair',keep:p.keep,drop:p.drop});return}}catch{}log(value)}
  process.on('message',async job=>{
    try {
      const candidate=job.candidate
      if(job.apply&&!batchCandidateReview(candidate,facts,true))throw Error('LLM의 독립 출처 검수 없는 후보는 반영할 수 없습니다')
      const result=candidate.sourceReview.verdict==='series_split_confirmed'?await repairSeries(db,candidate,job.apply):await repairOriginal(db,candidate,facts,job.apply)
      const {editionSources,...compact}=result
      process.send({type:'result',index:job.index,result:{...compact,mergedContentIds:result.completed?candidate.contentIds.filter(id=>id!==result.keep):result.mergedContentIds??result.drops,checkedAt:new Date().toISOString()}})
    }catch(error){process.send({type:'result',index:job.index,result:{completed:false,error:error.message,checkedAt:new Date().toISOString()}})}
  })
}

async function main() {
  if(!file||!evidenceFile)throw Error('--file=<검수한 임시 후보 파일> --evidence=<임시 ISBN 근거 파일>이 필요합니다')
  const report=JSON.parse(readFileSync(file,'utf8')),facts=JSON.parse(readFileSync(evidenceFile,'utf8')).facts,apply=process.argv.includes('--apply')
  const sets=new Set(report.candidates.map(c=>[...c.contentIds].sort().join('|')))
  if(process.argv.includes('--rescan')) {
    const fresh=auditCurrentBooks();let added=0
    for(const candidate of fresh.candidates){const key=[...candidate.contentIds].sort().join('|');if(!sets.has(key)){sets.add(key);const review=previousIndependentReview(candidate,report.candidates);if(review)candidate.sourceReview=review;report.candidates.push(candidate);added++}}
    report.lastScan={observedAt:fresh.observedAt,counts:fresh.counts,candidates:fresh.candidates.length,bySignal:fresh.bySignal}
    console.log(JSON.stringify({rescanned:true,newCandidates:added,...report.lastScan}))
  }
  for(const candidate of [...report.candidates].filter(c=>!apply&&!c.repair?.completed&&!c.sourceSubsetOf))for(const subset of verifiedSeriesSubsets(candidate,facts)) {
    const key=[...subset.contentIds].sort().join('|')
    if(!sets.has(key)){sets.add(key);report.candidates.push(subset)}
  }
  const mapping=new Map(),pending=[],busy=new Set(),workers=[],stats={completed:0,failed:0,pairs:0}
  const mapped=id=>{const seen=new Set();while(mapping.has(id)&&!seen.has(id)){seen.add(id);id=mapping.get(id)}return id}
  for(const c of report.candidates)if(c.repair?.completed)for(const id of c.repair.mergedContentIds??[])mapping.set(id,c.repair.keep)
  for(const [index,c] of report.candidates.entries()) {
    const review=batchCandidateReview(c,facts,apply)
    if(c.repair?.completed||!review||!['same_original_confirmed','same_edition_confirmed','series_split_confirmed'].includes(review.verdict))continue
    if(!apply)c.sourceReview={...review,checkedAt:new Date().toISOString(),...(review.verdict==='series_split_confirmed'?{editions:Object.fromEntries(c.works.flatMap(w=>w.isbns).filter(i=>facts[i]).map(i=>[i,facts[i]]))}:{})}
    pending.push(index)
  }
  if(apply)writeFileSync(file,JSON.stringify(report,null,2)+'\n','utf8')
  console.log(JSON.stringify({apply,jobs:pending.length,processes:4}))
  await new Promise((resolve,reject)=>{
    let active=0
    const dispatch=child=>{
      const position=pending.findIndex(i=>report.candidates[i].contentIds.map(mapped).every(id=>!busy.has(id)))
      if(position<0){if(!active&&!pending.length){for(const w of workers)w.disconnect();resolve()}return}
      const index=pending.splice(position,1)[0],candidate=report.candidates[index],ids=[...new Set(candidate.contentIds.map(mapped))]
      ids.forEach(id=>busy.add(id));active++;child.job={index,ids}
      child.send({index,candidate:{...candidate,contentIds:ids},apply})
    }
    for(let n=0;n<4;n++) {
      const child=fork(fileURLToPath(import.meta.url),['--worker','--file='+file,'--evidence='+evidenceFile],{execArgv:process.execArgv,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true})
      workers.push(child)
      child.stdout.on('data',data=>process.stdout.write(data))
      child.stderr.on('data',data=>process.stderr.write(data))
      child.on('error',reject)
      child.on('exit',(code,signal)=>{if(child.job)reject(Error('작업 프로세스 종료: '+child.job.index+' ('+(signal??code)+'). 현재 DB를 다시 조회해 재개하십시오.'))})
      child.on('message',message=>{
        if(message.type==='pair'){stats.pairs++;mapping.set(message.drop,message.keep);if(stats.pairs%25===0)console.log(JSON.stringify({pairs:stats.pairs,completed:stats.completed,pending:pending.length+active}));return}
        if(message.type!=='result')return
        const candidate=report.candidates[message.index],result=message.result
        child.job.ids.forEach(id=>busy.delete(id));child.job=null;active--
        if(result.completed){stats.completed++;for(const id of result.mergedContentIds??[])mapping.set(id,result.keep)}else if(!result.dryRun)stats.failed++
        candidate.repair=result
        if(apply)writeFileSync(file,JSON.stringify(report,null,2)+'\n','utf8')
        console.log(JSON.stringify({index:message.index,title:candidate.sourceReview.title??candidate.works[0].titles[0],keep:result.keep,merged:result.mergedContentIds?.length,completed:result.completed,error:result.error,progress:stats,left:pending.length+active}))
        for(const w of workers)if(!w.job)dispatch(w)
      })
      dispatch(child)
    }
  })
  console.log(JSON.stringify({finished:true,...stats}))
}
if(process.argv.includes('--worker'))worker().catch(e=>{console.error(e.message);process.exitCode=1})
else if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
