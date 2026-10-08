/** 전수 후보 ISBN의 공식 메타를 묶음 조회하고 판정에 필요한 사실만 남긴다. */
import { readFileSync,writeFileSync } from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {toIsbn13} from '../../../../packages/content-search/src/book-isbn.ts'
import {pickKakaoBookIsbn} from '../../../../packages/content-search/src/kakao-books.ts'
import {requiresIndependentBookWorkReview} from '../../../../packages/content-search/src/book-work-risk.ts'
import {normalizeAuditText,numberedTitle,seriesSetTitle} from './lib/series-audit.mjs'
import {auditCurrentBooks} from './series-split-audit.mjs'
const norm=value=>normalizeAuditText(value).replace(/[\p{P}\p{Z}]/gu,'')
const korean=isbn=>/^(97889|97911)/.test(isbn)
const userAgent='FeelAndNote book-data-audit (https://feelandnote.com)'
export const officialAuthorKeys=book=>book?.authorKeys?.length?book.authorKeys:book?.workTitle&&norm(book.workTitle)===norm(book.title)?book.workAuthorKeys??[]:[]

export function officialEdition(isbn,item) {
  const row=item?.details
  if(!/^\/books\/OL\d+M$/.test(row?.key??'')||![...(row.isbn_13??[]),...(row.isbn_10??[])].some(id=>toIsbn13(String(id))===isbn))return null
  return {isbn,title:row.title,subtitle:row.subtitle??null,volume:row.volume??null,
    authorKeys:[...new Set((row.authors??[]).map(a=>a.key).filter(Boolean))].sort(),authors:(row.authors??[]).map(a=>a.name).filter(Boolean).sort(),
    workKeys:[...new Set((row.works??[]).map(w=>w.key).filter(Boolean))].sort(),languages:(row.languages??[]).map(l=>l.key),
    sourceUrl:'https://openlibrary.org'+row.key,publisher:(row.publishers??[]).join(', ')}
}

/** 같은 OL work에 연결돼도 실제 ISBN의 부제·권·내용이 다르면 별도 서지 검수를 요구한다. */
export function officialEditionConflicts(report, facts) {
 return report.candidates.flatMap(candidate => {
  const editions=candidate.works.flatMap(work=>work.editions ?? [])
    .filter(edition=>edition.locale==='en' && facts[edition.isbn]?.workKeys?.length===1)
    .map(edition=>({contentId:edition.content_id,editionId:edition.id ?? edition.editionId,isbn:edition.isbn,
      catalogTitle:edition.title,officialTitle:facts[edition.isbn].title,subtitle:facts[edition.isbn].subtitle,
      volume:facts[edition.isbn].volume,workKey:facts[edition.isbn].workKeys[0],sourceUrl:facts[edition.isbn].sourceUrl}))
  if (editions.length<2 || new Set(editions.map(edition=>edition.workKey)).size!==1
    || new Set(editions.map(edition=>norm(edition.subtitle)+':'+norm(edition.volume))).size<2) return []
  return [{contentIds:candidate.contentIds,reason:'same_openlibrary_work_has_different_edition_subtitles_or_volumes',editions}]
 })
}

/** 미확인 ISBN·다른 출판사 행 때문에 큰 후보가 막혀도, 검증된 같은 판의 연속권은 따로 확인한다. */
export function verifiedSeriesSubsets(candidate,facts) {
  if(candidate.sourceReview?.verdict==='different_originals_confirmed'&&candidate.sourceReview.method==='independent_work_review')return []
  if(candidate.warnings.some(w=>['different_original_work_identities','different_originals_or_qids','independent_editing_or_commentary','collection_or_set','generic_creator'].includes(w)))return []
  const stem=candidate.evidence.find(e=>e.kind==='numbered-series')?.stem??candidate.evidence.find(e=>e.kind==='registered-series')?.key
  if(!stem||!/[가-힣]/u.test(stem))return []
  const groups=new Map()
  for(const work of candidate.works) {
    if(work.identity&&!work.identity.startsWith('book/')||work.referenceCounts.member_contents||work.referenceCounts.celeb_contents||!work.isbns.length)continue
    const books=work.isbns.map(i=>facts[i])
    if(!books.every(b=>b?.provider==='kakao_book'&&/^(97889|97911)/.test(b.isbn)&&b.authors.length&&norm(numberedTitle(b.title)?.stem??b.title)===norm(stem)&&work.creators.some(c=>c.split(/[,，]/).map(norm).sort().join('|')===b.authors.map(norm).sort().join('|'))))continue
    const keys=new Set(books.map(b=>norm(b.publisher)+'|'+b.authors.map(norm).sort().join('|')))
    if(keys.size!==1)continue
    const key=[...keys][0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(work)
  }
  return [...groups.values()].filter(works=>works.length>1&&works.length<candidate.works.length).map(works=>({
    ...candidate,contentIds:works.map(w=>w.id),works,sharedPeople:candidate.sharedPeople.filter(p=>works.every(w=>w.personIds.includes(p.id))),sourceReview:undefined,repair:undefined,
    sourceSubsetOf:candidate.contentIds
  }))
}

export function reviewCandidate(candidate,facts) {
  if(candidate.sourceReview?.verdict==='different_originals_confirmed'&&candidate.sourceReview.method==='independent_work_review')return {verdict:'needs_original_or_scope_review',reason:['independently_confirmed_different_originals'],sources:candidate.sourceReview.sources}
  if(candidate.sourceReview?.verdict==='series_split_confirmed'&&candidate.sourceReview.method==='independent_series_review')return {verdict:'previously_source_reviewed'}
  if(candidate.works.some(w=>w.isbns.some(i=>requiresIndependentBookWorkReview(facts[i]?.publisher))))return {verdict:'needs_original_or_scope_review',reason:['study_guide_publisher_requires_independent_work_review']}
  const conflicts=['different_original_work_identities','different_originals_or_qids','independent_editing_or_commentary','collection_or_set']
  // 이미 확인한 연속권의 동일 출판사 세트. 원작·실독 충돌이나 개별 권과 다른 표제는 이 경로로 통합하지 않는다.
  const registered=candidate.evidence?.find(e=>e.kind==='registered-series')?.key
  if(registered&&!candidate.warnings.some(w=>['different_original_work_identities','different_originals_or_qids','independent_editing_or_commentary','generic_creator'].includes(w))
   &&candidate.works.every(w=>(!w.identity||w.identity.startsWith('book/'))&&!w.referenceCounts.member_contents&&!w.referenceCounts.celeb_contents&&w.isbns.length&&w.isbns.every(korean))) {
   const books=candidate.works.flatMap(w=>w.isbns.map(isbn=>({b:facts[isbn],w})))
   if(books.every(({b,w})=>b?.provider==='kakao_book'&&b.authors.length&&w.titles.some(t=>norm(t)===norm(b.title))&&w.creators.some(c=>c.split(/[,，]/).map(norm).sort().join('|')===b.authors.map(norm).sort().join('|'))
    &&norm(numberedTitle(b.title)?.stem??seriesSetTitle(b.title)?.stem??b.title)===norm(registered))
    &&new Set(books.map(({b})=>norm(b.publisher))).size===1&&books.every(({b})=>norm(b.publisher))
    &&new Set(books.map(({b})=>b.authors.map(norm).sort().join('|'))).size===1
    &&books.some(({b})=>seriesSetTitle(b.title))&&books.some(({b})=>numberedTitle(b.title))) {
    return {verdict:'needs_continuity_review',title:registered,authors:books[0].b.authors,sources:[...new Set(books.map(({b})=>b.sourceUrl))],method:'kakao_isbn_series_metadata'}
   }
  }
  if(candidate.warnings.some(w=>conflicts.includes(w)))return {verdict:'needs_original_or_scope_review',reason:candidate.warnings.filter(w=>conflicts.includes(w))}
  const perWork=candidate.works.map(w=>w.isbns.filter(i=>!korean(i)).map(i=>facts[i]))
  const completeForeignProof=perWork.every(rows=>rows.length&&rows.every(f=>f?.workKeys?.length===1&&(!f.languages?.length||f.languages.includes('/languages/eng'))))
    &&perWork.flat().some(f=>f?.languages?.includes('/languages/eng'))
  const matchesCreator=(work,authors)=>work.creators.some(value=>value.split(/[,，]/).map(norm).sort().join('|')===authors.map(norm).sort().join('|'))
  const completeDomesticProof=candidate.works.every(w=>w.isbns.filter(korean).every(i=>{
    const book=facts[i]
    return book?.provider==='kakao_book'&&w.titles.some(title=>norm(title)===norm(book.title))&&matchesCreator(w,book.authors)
  }))
  const sharedDomesticIsbn=new Set(candidate.works.flatMap(w=>w.isbns))
  if(candidate.signals.includes('shared-isbn')&&sharedDomesticIsbn.size===1&&completeDomesticProof&&candidate.works.every(w=>w.isbns.length&&w.isbns.every(korean))) {
    return {verdict:'same_edition_confirmed',sources:[facts[[...sharedDomesticIsbn][0]].sourceUrl],method:'kakao_exact_shared_isbn'}
  }
  // 원작 대표에 이미 있는 한국어 ISBN만 별도 국내 작품으로 중복 등록된 경우.
  // 제목이 같은 다른 번역·선집은 ISBN 포함 관계가 없으므로 이 판정에 들어오지 않는다.
  if(candidate.signals.includes('shared-isbn')&&completeDomesticProof&&!candidate.warnings.includes('generic_creator')) {
    const originals=candidate.works.filter(w=>w.isbns.some(i=>!korean(i)))
    if(originals.length===1) {
      const original=originals[0],books=original.isbns.filter(i=>!korean(i)).map(i=>facts[i])
      const keys=new Set(books.flatMap(b=>b?.workKeys??[])),authors=new Set(books.map(b=>officialAuthorKeys(b).join('|')))
      const copies=candidate.works.filter(w=>w!==original)
      if(books.length&&books.every(b=>b?.workKeys?.length===1&&officialAuthorKeys(b).length&&(!b.languages?.length||b.languages.includes('/languages/eng'))&&original.titles.some(t=>norm(t)===norm(b.title)||norm(t)===norm([b.title,b.subtitle].filter(Boolean).join(': '))))
        &&books.some(b=>b.languages?.includes('/languages/eng'))&&keys.size===1&&authors.size===1
        &&copies.length&&copies.every(w=>w.isbns.length&&w.isbns.every(i=>korean(i)&&original.isbns.includes(i)))) {
        return {verdict:'same_original_confirmed',workKey:[...keys][0],authorKeys:officialAuthorKeys(books[0]),preferredKeep:original.id,method:'existing_original_exact_isbn_copy',sources:[...new Set(candidate.works.flatMap(w=>w.isbns).map(i=>facts[i].sourceUrl))]}
      }
    }
  }
  // 1개 ISBN만 우연히 같은 저작에 붙은 혼합 작품을 통합하지 않는다.
  if(candidate.signals.some(s=>['same-title','work-identity'].includes(s))&&completeForeignProof&&completeDomesticProof) {
    const books=perWork.flat(),keys=new Set(books.flatMap(row=>row.workKeys)),authors=new Set(books.map(row=>officialAuthorKeys(row).join('|')))
    const editions=new Set(books.map(row=>norm(row.title)+':'+norm(row.subtitle)+':'+norm(row.volume)))
    if(keys.size===1&&authors.size===1&&books.every(row=>officialAuthorKeys(row).length)&&editions.size===1) {
      return {verdict:'same_original_confirmed',workKey:[...keys][0],authorKeys:officialAuthorKeys(books[0]),sources:[...new Set(books.flatMap(b=>[b.sourceUrl,...(!b.authorKeys.length&&b.workSourceUrl?[b.workSourceUrl]:[])]))]}
    }
  }
  if(candidate.signals.some(s=>['numbered-series','registered-series'].includes(s))&&candidate.works.every(w=>(!w.identity||w.identity.startsWith('book/'))&&!w.referenceCounts.member_contents&&!w.referenceCounts.celeb_contents)) {
    const stem=candidate.evidence.find(e=>e.kind==='numbered-series')?.stem??candidate.evidence.find(e=>e.kind==='registered-series')?.key
    const perWork=candidate.works.map(w=>w.isbns.filter(korean).map(i=>facts[i]))
    if(stem&&/[가-힣]/u.test(stem)&&candidate.works.every(w=>w.isbns.every(korean))&&perWork.every((rows,index)=>rows.length&&rows.every(book=>book?.provider==='kakao_book'&&matchesCreator(candidate.works[index],book.authors)))) {
      const books=perWork.flat(),sameRoot=books.every(b=>norm(numberedTitle(b.title)?.stem??b.title)===norm(stem))
      const authors=new Set(books.map(b=>b.authors.map(norm).sort().join('|')))
      const publishers=new Set(books.map(b=>norm(b.publisher)))
      if(sameRoot&&authors.size===1&&books.every(b=>b.authors.length)&&publishers.size===1) {
        return {verdict:'needs_continuity_review',title:stem,authors:books[0].authors,sources:[...new Set(books.map(b=>b.sourceUrl))],method:'kakao_isbn_series_metadata'}
      }
    }
  }
  return {verdict:'needs_source_review'}
}

/** ISBN 서지에서 빠진 원저자 키도 같은 공식 work의 현재 응답에서 확인한다. */
export async function checkOriginalAuthors(facts,fetcher=fetch) {
 const needs=Object.values(facts).filter(f=>f?.workKeys?.length===1&&!f.authorKeys?.length)
 const keys=[...new Set(needs.map(f=>f.workKeys[0]))],errors=[]
 for(let i=0;i<keys.length;i+=3)await Promise.all(keys.slice(i,i+3).map(async key=>{
  try {
   if(!/^\/works\/OL\d+W$/.test(key))throw Error('공식 원작 키 형식 오류')
   const response=await fetcher('https://openlibrary.org'+key+'.json',{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(15000)})
   if(!response.ok)throw Error('HTTP '+response.status)
   const work=await response.json()
   if(work.key!==key||!work.title)throw Error('원작 키·표제 불일치')
   const authors=(work.authors??[]).map(a=>a.author?.key).filter(k=>/^\/authors\/OL\d+A$/.test(k??'')).sort()
   for(const fact of needs.filter(f=>f.workKeys[0]===key)){fact.workTitle=work.title;fact.workAuthorKeys=authors;fact.workSourceUrl='https://openlibrary.org'+key}
  }catch(error){errors.push({provider:'openlibrary_work',key,error:error.message})}
 }))
 return errors
}

export async function checkSources(report,output=null) {
  const isbns=[...new Set([...report.candidates.flatMap(c=>c.works.flatMap(w=>w.isbns)),...(report.editionAttributionRisks??[]).map(r=>r.isbn).filter(Boolean)])].sort()
  if(process.argv.includes('--missing-only')&&!output)throw Error('--missing-only에는 명시적인 --out=<임시 파일>이 필요합니다')
  const previous=process.argv.includes('--missing-only')?JSON.parse(readFileSync(output,'utf8')):null
  const facts=previous?.facts??{},errors=[],missing=isbns.filter(i=>!Object.hasOwn(facts,i)),foreign=missing.filter(i=>!korean(i)),domestic=missing.filter(korean)
  const result=()=>({checkedAt:new Date().toISOString(),isbnCount:isbns.length,facts,errors,
    reviews:report.candidates.map(c=>({contentIds:c.contentIds,...reviewCandidate(c,facts)})),
    officialEditionConflicts:officialEditionConflicts(report,facts),
    attributionReviews:(report.editionAttributionRisks??[]).map(r=>({...r,officialEdition:r.isbn?facts[r.isbn]??null:null}))})
  const save=()=>{if(output)writeFileSync(output,JSON.stringify(result(),null,2)+'\n','utf8')}
  for(let start=0;start<foreign.length;start+=40) {
    const batch=foreign.slice(start,start+40),params=new URLSearchParams({bibkeys:batch.map(i=>'ISBN:'+i).join(','),format:'json',jscmd:'details'})
    try{
      const response=await fetch('https://openlibrary.org/api/books?'+params,{headers:{'User-Agent':userAgent},signal:AbortSignal.timeout(30000)})
      if(!response.ok)throw Error('HTTP '+response.status)
      const data=await response.json()
      for(const isbn of batch)facts[isbn]=officialEdition(isbn,data['ISBN:'+isbn])
    }catch(error){errors.push({provider:'openlibrary',isbns:batch,error:error.message})}
    if(start%400===0){save();console.log(JSON.stringify({provider:'openlibrary',checked:Math.min(start+40,foreign.length),total:foreign.length,errors:errors.length}))}
  }
  const key=process.env.KAKAO_REST_API_KEY
  if(!key)throw Error('KAKAO_REST_API_KEY 필요')
  for(let start=0;start<domestic.length;start+=4) {
    await Promise.all(domestic.slice(start,start+4).map(async isbn=>{
      try{
        const params=new URLSearchParams({query:isbn,size:'3',target:'isbn'})
        const response=await fetch('https://dapi.kakao.com/v3/search/book?'+params,{headers:{Authorization:'KakaoAK '+key},signal:AbortSignal.timeout(15000)})
        if(!response.ok)throw Error('HTTP '+response.status)
        const data=await response.json(),book=(data.documents??[]).find(b=>pickKakaoBookIsbn(b.isbn)===isbn)
        facts[isbn]=book?{isbn,provider:'kakao_book',title:book.title,authors:book.authors??[],publisher:book.publisher,sourceUrl:book.url}:null
      }catch(error){errors.push({provider:'kakao_book',isbns:[isbn],error:error.message})}
    }))
    if(start%200===0){save();console.log(JSON.stringify({provider:'kakao_book',checked:Math.min(start+4,domestic.length),total:domestic.length,errors:errors.length}))}
  }
  errors.push(...await checkOriginalAuthors(facts))
  save()
  const reviews=report.candidates.map(c=>reviewCandidate(c,facts))
  console.log(JSON.stringify({complete:true,isbnCount:isbns.length,errors:errors.length,verdicts:Object.fromEntries([...new Set(reviews.map(r=>r.verdict))].map(v=>[v,reviews.filter(r=>r.verdict===v).length]))}))
  const checked=result()
  if(process.argv.includes('--all')) {
    for(const review of checked.reviews)console.log(JSON.stringify(review))
    for(const conflict of checked.officialEditionConflicts)console.log(JSON.stringify({officialEditionConflict:conflict}))
    for(const risk of checked.attributionReviews)console.log(JSON.stringify({editionAttributionRisk:risk}))
  }
  return checked
}
export async function main(){
  const file=process.argv.find(a=>a.startsWith('--file='))?.slice(7),output=process.argv.find(a=>a.startsWith('--out='))?.slice(6)
  return checkSources(file?JSON.parse(readFileSync(resolve(file),'utf8')):auditCurrentBooks(),output?resolve(output):null)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1})
