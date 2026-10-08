/** 반영된 작품 통합을 현재 DB에서 검증하고, 그 작품·인물의 상세 캐시만 갱신한다. */
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {isDeepStrictEqual} from 'node:util'
import {loadSeriesAuditCatalog} from './series-split-audit.mjs'
import {normalizeAuditText} from './lib/series-audit.mjs'
import {seriesVolumeInfo} from '../../../../packages/content-search/src/book-series.ts'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'
import {CACHE_TAGS,bulkTag,itemTag,isAllowedCacheTag,revalidationApiPathForTags,isCompleteCacheRevalidationResponse} from '../../../../packages/shared/src/constants/cache-tags.ts'
import bookEditionWork from '../../src/lib/book-edition-work.ts'
const {verifiedOmnibusIsbn}=bookEditionWork

export function verifyRepairs(report,catalog) {
 const completed=report.candidates.filter(c=>c.repair?.completed),mapping=new Map()
 for(const c of completed)for(const id of c.repair.mergedContentIds??[])if(id!==c.repair.keep)mapping.set(id,c.repair.keep)
 const mapped=id=>{const seen=new Set();while(mapping.has(id)){if(seen.has(id))throw Error('대표 ID 추적 순환: '+id);seen.add(id);id=mapping.get(id)}return id}
 const works=new Map(catalog.contents.map(w=>[w.id,w])),variants=new Map(),people=new Map()
 for(const row of [...catalog.locales,...catalog.editions]){if(!variants.has(row.content_id))variants.set(row.content_id,[]);variants.get(row.content_id).push(row)}
 for(const row of [...catalog.relations,...catalog.readings]){if(!people.has(row.content_id))people.set(row.content_id,new Set());people.get(row.content_id).add(row.celeb_id)}
 const errors=[],roots=new Set(),removed=new Set(),affectedIds=new Set(),affectedPeople=new Set(),isbns=new Set()
 for(const c of completed) {
  const keep=mapped(c.repair.keep),actual=variants.get(keep)??[],work=works.get(keep);roots.add(keep)
  c.contentIds.forEach(id=>affectedIds.add(id));affectedIds.add(keep)
  if(!work){errors.push({keep,error:'대표 작품 없음'});continue}
  for(const id of c.repair.mergedContentIds??[]){removed.add(id);if(works.has(id))errors.push({keep,id,error:'중복 작품 잔존'})}
  for(const before of c.works) {
   const correctedOwner=isbn=>report.attributionCorrections?.find(p=>p.contentId===before.id&&p.isbn===isbn)
   for(const isbn of before.isbns){
    isbns.add(isbn);const correction=correctedOwner(isbn),owner=correction?mapped(correction.correctContentId):keep,owned=variants.get(owner)??[]
    if(correction){affectedIds.add(owner);if(!/^https:\/\//.test(correction.sourceUrl??'')||owner===keep)errors.push({keep,isbn,error:'오귀속 교정 근거 불일치'})}
    if(!owned.some(e=>toIsbn13(e.isbn??'')===isbn))errors.push({keep,owner,isbn,error:'실제 ISBN 소실'})
   }
   for(const personId of before.personIds){affectedPeople.add(personId);if(!people.get(keep)?.has(personId))errors.push({keep,personId,error:'인물 관계 소실'})}
   for(const edition of before.editions) {
    if(!edition.isbn)continue
    const correction=correctedOwner(edition.isbn),owned=correction?variants.get(mapped(correction.correctContentId))??[]:actual
    const row=owned.find(e=>e.id===edition.editionId)
    if(row&&(toIsbn13(row.isbn??'')!==edition.isbn||row.title!==edition.title))errors.push({keep,editionId:edition.editionId,error:'보존 판본 제목·ISBN 변경'})
    // 동일 ISBN 중복 판본은 통합기가 상품 참조를 보존하며 기존 판본 하나로 정리한다.
    if(!row&&!owned.some(e=>e.locale===edition.locale&&toIsbn13(e.isbn??'')===edition.isbn))errors.push({keep,editionId:edition.editionId,error:'판본 ID와 동등한 ISBN 모두 소실'})
   }
  }
  if(c.sourceReview?.verdict==='series_split_confirmed'&&!work.figureBook?.series)errors.push({keep,error:'검수 시리즈 메타 없음'})
 }
 // 원작을 합치지 않은 오귀속 교정도 매번 현재 DB에서 확인한다.
 for(const correction of report.attributionCorrections??[]) {
  const original=mapped(correction.contentId),owner=mapped(correction.correctContentId),owned=variants.get(owner)??[]
  affectedIds.add(original);affectedIds.add(owner);isbns.add(correction.isbn)
  if(!/^https:\/\//.test(correction.sourceUrl??'')||original===owner||!works.has(owner))errors.push({owner,isbn:correction.isbn,error:'독립 오귀속 교정 근거·실제 원작 불일치'})
  if(!owned.some(e=>toIsbn13(e.isbn??'')===correction.isbn))errors.push({owner,isbn:correction.isbn,error:'독립 오귀속 실제 ISBN 소실'})
  if((variants.get(original)??[]).some(e=>toIsbn13(e.isbn??'')===correction.isbn))errors.push({original,isbn:correction.isbn,error:'오귀속 ISBN 잔존'})
  for(const id of [original,owner])for(const person of people.get(id)??[])affectedPeople.add(person)
 }
 for(const review of report.omnibusReviews??[]) {
  const ids=review.contentIds.map(mapped),owners=ids.map(id=>works.get(id)).filter(Boolean).map(w=>({...w,type:'BOOK',metadata:{...w.metadata,figureBook:w.figureBook}}))
  const editions=catalog.editions.filter(e=>ids.includes(e.content_id)&&toIsbn13(e.isbn??'')===review.isbn)
  if(!/^https:\/\//.test(review.sourceUrl??'')||!verifiedOmnibusIsbn(review.isbn,ids,owners,catalog.locales.filter(c=>ids.includes(c.content_id)),editions))errors.push({isbn:review.isbn,error:'합본의 현재 원작·수록 범위 근거 불일치'})
  isbns.add(review.isbn)
  for(const id of ids){affectedIds.add(id);for(const person of people.get(id)??[])affectedPeople.add(person)}
 }
 // 같은 원작을 유지한 언어·표시 교정도 현재 값과 출처를 다시 확인한다.
 for(const correction of report.isbnCorrections??[]) {
  const id=mapped(correction.contentId),row=catalog.editions.find(e=>e.id===correction.editionId)
  affectedIds.add(id);isbns.add(correction.fromIsbn);isbns.add(correction.toIsbn);for(const person of people.get(id)??[])affectedPeople.add(person)
  if(!/^https:\/\//.test(correction.sourceUrl??'')||!row||row.content_id!==id||row.isbn!==correction.toIsbn||(variants.get(id)??[]).some(e=>e.isbn===correction.fromIsbn))errors.push({id,editionId:correction.editionId,error:'ISBN 교정 값·기존 오등록 잔존'})
 }
 for(const correction of report.variantCorrections??[]) {
  const id=mapped(correction.contentId),work=works.get(id)
  affectedIds.add(id);for(const person of people.get(id)??[])affectedPeople.add(person)
  if(!work||!/^https:\/\//.test(correction.sourceUrl??'')){errors.push({id,error:'판본 교정 원작·출처 없음'});continue}
  for(const [key,value] of Object.entries(correction.figureBook??{}))if(!isDeepStrictEqual(work.figureBook?.[key],value))errors.push({id,key,error:'원작 메타 교정 변경'})
  for(const key of correction.forbiddenFigureBookFields??[])if(Object.hasOwn(work.figureBook??{},key))errors.push({id,key,error:'제거한 원작 메타 잔존'})
  for(const personId of correction.personIds??[])if(!people.get(id)?.has(personId))errors.push({id,personId,error:'복원한 인물 관계 소실'})
  for(const personId of correction.forbiddenPersonIds??[])if(people.get(id)?.has(personId))errors.push({id,personId,error:'다른 독립 저작의 인물 관계 잔존'})
  for(const expected of correction.editions??[]) {
   const row=catalog.editions.find(e=>e.id===expected.id&&e.content_id===id)
   if(!row||Object.entries(expected).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))errors.push({id,editionId:expected.id,error:'판본 언어·범위 교정 변경'})
   if(expected.isbn)isbns.add(expected.isbn)
  }
  for(const expected of correction.cards??[]) {
   const row=catalog.locales.find(c=>c.content_id===id&&c.locale===expected.locale)
   if(!row||Object.entries(expected).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))errors.push({id,locale:expected.locale,error:'대표 제목·ISBN 교정 변경'})
  }
 }
 return {observedAt:catalog.observedAt,completedGroups:completed.length,representativeWorks:roots.size,removedDuplicateWorks:removed.size,verifiedOmnibuses:(report.omnibusReviews??[]).length,errors,affectedIds:[...affectedIds],affectedPeople:[...affectedPeople],isbns:[...isbns]}
}

/** 완료 원장 없이 현재 DB에 남긴 독립 검수 근거와 실제 판본 소유자를 대조한다. */
export function verifyCurrentCatalog(catalog) {
 const norm=v=>normalizeAuditText(v??'').replace(/[\p{P}\p{Z}]/gu,'')
 const works=new Map(catalog.contents.map(w=>[w.id,w])),errors=[],reviewed=new Set(),affectedIds=new Set(),isbns=new Set()
 let checkedEditions=0,legacyEvidence=0
 for(const edition of catalog.editions) {
  const work=works.get(edition.content_id)
  if(!work){errors.push({editionId:edition.id,error:'판본 원작 없음'});continue}
  if(!edition.isbn&&edition.sources?.primary==='wikidata'){
   errors.push({editionId:edition.id,error:'작품 이름만 있는 위키데이터 행을 실제 판본으로 등록'});continue
  }
  const numbered=edition.edition_kind==='full'&&seriesVolumeInfo(work.figureBook?.series,{
   ...edition,editionKind:null,textScope:null,translator:Array.isArray(edition.sources?.translators)?edition.sources.translators.join(', '):null})
  if(numbered&&numbered.number>1)errors.push({editionId:edition.id,error:'시리즈 중간 권에 전권 완본 범위 표시'})
  const evidence=edition.sources?.edition_work_evidence??[]
  if(!Array.isArray(evidence)){errors.push({editionId:edition.id,error:'판본 검수 근거 형식 오류'});continue}
  const structured=evidence.filter(p=>p.method==='independent_work_review'&&Object.hasOwn(p,'edition_creator')&&Object.hasOwn(p,'text_scope'))
  if(!structured.length){if(evidence.length)legacyEvidence++;continue}
  const current=structured.filter(p=>p.content_id===edition.content_id)
  const matches=p=>p.locale===edition.locale&&(p.isbn??null)===(edition.isbn??null)&&norm(p.edition_title)===norm(edition.title)&&norm(p.edition_creator)===norm(edition.creator)
    &&(p.edition_kind??null)===(edition.edition_kind??null)&&(p.text_scope??null)===(edition.text_scope??null)
    &&/^https:\/\//.test(p.source_url??'')&&p.work_identity===work.figureBook?.workIdentity
    &&norm(p.original_title)===norm(work.figureBook?.workTitle??work.figureBook?.originalTitle)&&norm(p.original_creator)===norm(work.figureBook?.workCreator??work.figureBook?.originalCreator)
  if(!current.some(matches))errors.push({editionId:edition.id,contentId:edition.content_id,error:'현재 판본과 독립 검수 근거 불일치'})
  else{checkedEditions++;reviewed.add(edition.content_id);affectedIds.add(edition.content_id);if(edition.isbn)isbns.add(edition.isbn)}
 }
 const affectedPeople=new Set([...catalog.relations,...catalog.readings].filter(r=>affectedIds.has(r.content_id)).map(r=>r.celeb_id))
 return {observedAt:catalog.observedAt,currentDatabase:true,reviewedWorks:reviewed.size,checkedEditions,legacyEvidence,errors,
  affectedIds:[...affectedIds],affectedPeople:[...affectedPeople],isbns:[...isbns]}
}

async function revalidate(result,catalog) {
 if(!process.env.CRON_SECRET)throw Error('CRON_SECRET 필요')
 const ids=new Set(result.affectedIds),people=new Set(result.affectedPeople)
 for(const r of [...catalog.relations,...catalog.readings])if(ids.has(r.content_id))people.add(r.celeb_id)
 const tags=new Set([...ids,...result.isbns].map(id=>itemTag(CACHE_TAGS.CONTENTS,id)))
 for(const row of catalog.contents.filter(w=>ids.has(w.id)))if(row.external_id)tags.add(itemTag(CACHE_TAGS.CONTENTS,row.external_id))
 for(const person of catalog.people.filter(p=>people.has(p.id)))for(const id of [person.id,person.slug].filter(Boolean))for(const domain of [CACHE_TAGS.CELEBS,CACHE_TAGS.FIGURE_BOOKS])tags.add(itemTag(domain,id))
 // DB 전수 확인은 상세 전량 태그 하나로 끝낸다. 임의의 외부 식별자를 공개 경로로 보내지 않는다.
 if(result.currentDatabase){tags.clear();for(const tag of [bulkTag(CACHE_TAGS.CONTENTS),CACHE_TAGS.CONTENTS,CACHE_TAGS.CELEBS,CACHE_TAGS.FIGURE_BOOKS])tags.add(tag)}
 for(const tag of tags)if(!isAllowedCacheTag(tag))throw Error('허용되지 않는 상세 캐시 태그: '+tag)
 const all=[...tags],endpoints=process.argv.includes('--production-only')?['https://feelandnote.com']:['http://localhost:3000','https://feelandnote.com']
 for(const endpoint of endpoints) {
  let complete=0
  for(let start=0;start<all.length;start+=30) {
   const batch=all.slice(start,start+30)
   let failure
   for(let attempt=0;attempt<4;attempt++) {
    if(attempt)await new Promise(resolve=>setTimeout(resolve,1000*attempt))
    try {
     const response=await fetch(endpoint+revalidationApiPathForTags(batch),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag:batch,secret:process.env.CRON_SECRET}),signal:AbortSignal.timeout(45000)})
     const data=await response.json()
     if(response.ok&&isCompleteCacheRevalidationResponse(data,batch)){failure=null;break}
     failure='HTTP '+response.status+' '+JSON.stringify({error:data.error,cloudflareStatus:data.cloudflare?.status,failedBatches:data.cloudflare?.failedBatches})
    }catch(error){failure=error.message}
   }
   if(failure)throw Error('상세 캐시 갱신 미완료: '+endpoint+' batch '+start+' '+failure)
   complete+=batch.length
   if(start%300===0)console.log(JSON.stringify({endpoint,completedTags:complete,totalTags:all.length}))
  }
  console.log(JSON.stringify({endpoint,complete:true,tags:complete,totalTags:all.length,people:people.size}))
 }
}
async function main() {
 const file=process.argv.find(a=>a.startsWith('--file='))?.slice(7),catalog=loadSeriesAuditCatalog()
 const result=file?verifyRepairs(JSON.parse(readFileSync(resolve(file),'utf8')),catalog):verifyCurrentCatalog(catalog)
 const {affectedIds,affectedPeople,isbns,errors,...summary}=result;console.log(JSON.stringify({...summary,errorCount:errors.length,errors:errors.slice(0,10)}))
 if(result.errors.length)throw Error('현재 DB 재검증 실패: '+result.errors.length)
 if(process.argv.includes('--revalidate'))await revalidate(result,catalog)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1})
