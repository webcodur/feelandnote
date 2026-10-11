/** 소개 후보와 실제 출처 본문을 검수용 RAM 객체로 모은다. DB 반영·본문 생성은 하지 않는다. */
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {forLocale} from '../../../../../packages/content-search/src/book-introduction.ts'
import {isBookIntroductionSource} from '../../../../../packages/content-search/src/book-introduction-contract.ts'
import {bookEditionTitleKey} from '../../../../../packages/content-search/src/book-series.ts'
import {canUseBookWorkIntroduction} from '../../../../../packages/content-search/src/book-original-authors.ts'
import {excludedBookEditionReason} from '../../../../../packages/content-search/src/book-edition-policy.ts'
import {getOpenLibraryBookUrl,requestOpenLibraryBookBatch} from '../../../../../packages/content-search/src/openlibrary.ts'
import {requestOpenLibrary} from '../../../../../packages/content-search/src/openlibrary-request.ts'

const text=value=>typeof value==='string'?value.trim():''
const description=value=>typeof value==='string'?value:text(value?.value)
const sourceUrl=row=>typeof row.sources?.description==='string'&&/^https:\/\//u.test(row.sources.description)?row.sources.description:null
function issue(row) {
 const value=text(row.description)
 if(!value)return 'empty_introduction'
 if(isBookIntroductionSource(value))return (row.locale==='en')===(value==='OPEN')?null:'wrong_locale_source_marker'
 return forLocale(value,row.locale)?null:'introduction_language_review'
}

/** 정상 출처 예약값은 후보에 넣지 않는다. locale 행도 조사할 때만 includeLocales를 지정한다. */
export function extractCatalogIntroductionCandidates(catalog,{includeLocales=false}={}) {
 const works=new Map(catalog.contents.map(work=>[work.id,work]))
 const cards=new Map(catalog.locales.map(row=>[row.content_id+'|'+row.locale,row]))
 const rows=[...catalog.editions.map(row=>({...row,editionId:row.id})),...(includeLocales?catalog.locales.map(row=>({...row,editionId:null})):[])]
 return rows.flatMap(row=>{
  if(!['ko','en'].includes(row.locale))return []
  const reason=issue(row);if(!reason)return []
  const isbn=toIsbn13(row.isbn??''),work=works.get(row.content_id),card=cards.get(row.content_id+'|'+row.locale)
  const reuse=isbn&&card&&toIsbn13(card.isbn??'')===isbn&&!isBookIntroductionSource(text(card.description))?forLocale(card.description,row.locale):null
  return [{contentId:row.content_id,editionId:row.editionId,locale:row.locale,isbn,title:row.title??'',creator:row.creator??'',oldIntro:row.description??null,
   sourceIntro:reuse,sourceUrl:reuse?sourceUrl(card):null,sourceMethod:reuse?'exact_locale_reuse':null,officialTitle:null,officialCreator:null,
   scopeWarnings:isbn?[]:['invalid_or_missing_isbn'],reason,editionKind:row.edition_kind??null,textScope:row.text_scope??null,
   originalTitle:work?.figureBook?.originalTitle??null,workTitle:work?.figureBook?.workTitle??null}]
 })
}

/** 호출자가 이 어댑터를 전달할 때만 OL 원작 JSON을 읽는다. 기존 프로세스별 요청 간격을 공유한다. */
export async function readOpenLibraryIntroductionWork(rawUrl) {
 let url=getOpenLibraryBookUrl(rawUrl)
 if(!url||!/^\/works\/OL\d+W$/u.test(new URL(url).pathname))throw Error('Official OpenLibrary work URL required')
 for(let redirects=0;redirects<=3;redirects++){
  const response=await requestOpenLibrary(url+'.json','manual',60000)
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location'),next=location&&getOpenLibraryBookUrl(new URL(location,url).href)
   if(!next||!/^\/works\/OL\d+W$/u.test(new URL(next).pathname))throw Error('Invalid OpenLibrary work redirect')
   url=next;continue
  }
  if(response.status===404)return null
  if(!response.ok)throw Error('OpenLibrary work HTTP '+response.status)
  return {data:await response.json(),sourceUrl:url}
 }
 throw Error('Too many OpenLibrary work redirects')
}

/** collect는 중앙 조사 수집기다. 원작 읽기는 선택 사항이며 ISBN·원작 키당 한 번만 읽는다. */
export function createCatalogIntroductionResearch({collect,readOpenLibraryWork=null,readDaumDescription=null}={}) {
 if(typeof collect!=='function')throw Error('Central research collector required')
 const officialCache=new Map(),workCache=new Map(),daumCache=new Map()
 async function officials(provider,isbns) {
  const missing=[...new Set(isbns)].filter(isbn=>!officialCache.has(provider+'|'+isbn))
  for(let start=0;start<missing.length;start+=20){
   const batch=missing.slice(start,start+20)
   const request=Promise.resolve().then(()=>collect(provider,batch)).then(result=>new Map((Array.isArray(result)?result:result.results).map(row=>[row.isbn,row.data])))
   for(const isbn of batch){
    const cacheKey=provider+'|'+isbn,lookup=request.then(rows=>rows.get(isbn)??null)
    officialCache.set(cacheKey,lookup)
    lookup.catch(()=>{if(officialCache.get(cacheKey)===lookup)officialCache.delete(cacheKey)})
   }
  }
 }
 const once=(cache,key,read)=>{if(!cache.has(key)){const lookup=Promise.resolve().then(read);cache.set(key,lookup);lookup.catch(()=>{if(cache.get(key)===lookup)cache.delete(key)})}return cache.get(key)}
 async function prefetch(candidates) {
  const pending=candidates.filter(row=>!row.sourceIntro&&row.isbn)
  await Promise.all(['ko','en'].map(locale=>officials(locale==='ko'?'kakao':'openlibrary',pending.filter(row=>row.locale===locale).map(row=>row.isbn))))
  const artifacts=[]
  for(const candidate of candidates){
   const row={...candidate,scopeWarnings:[...candidate.scopeWarnings],sourceCandidates:[]}
   if(row.sourceIntro||!row.isbn){artifacts.push(row);continue}
   const official=await officialCache.get((row.locale==='ko'?'kakao':'openlibrary')+'|'+row.isbn)
   if(!official||official.error){row.scopeWarnings.push(official?.error??'official_isbn_not_found');artifacts.push(row);continue}
   row.officialTitle=official.title??null;row.officialCreator=official.creator??null
   row.officialBinding={isbn:official.isbn??official.metadata?.isbn??null,editionIsbns:official.editionIsbns??[],languageKeys:official.languageKeys??[],editionAuthorKeys:official.editionAuthorKeys??[],workKeys:official.workKeys??[]}
   const offered=description(row.locale==='ko'?official.metadata?.description:official.description)
   if(offered&&!isBookIntroductionSource(offered))row.sourceCandidates.push({text:offered,sourceUrl:row.locale==='ko'?'https://dapi.kakao.com/v3/search/book?'+new URLSearchParams({target:'isbn',query:row.isbn}):official.sourceUrl,sourceMethod:row.locale==='ko'?'kakao_isbn':'openlibrary_edition',title:official.title??null,creator:official.creator??null})
   if(![official.title,official.mainTitle].filter(Boolean).some(title=>bookEditionTitleKey(row.title)===bookEditionTitleKey(title)))row.scopeWarnings.push('stored_and_official_title_differ')
   if(bookEditionTitleKey(row.creator)!==bookEditionTitleKey(official.creator))row.scopeWarnings.push('stored_and_official_creator_differ')
   if(row.locale==='ko'){
    if(toIsbn13(official.metadata?.isbn??'')!==row.isbn){row.scopeWarnings.push('official_isbn_mismatch');artifacts.push(row);continue}
    row.sourceIntro=forLocale(official.metadata.description,'ko');row.sourceUrl='https://dapi.kakao.com/v3/search/book?'+new URLSearchParams({target:'isbn',query:row.isbn});row.sourceMethod='kakao_isbn'
    const daumUrl=official.metadata.link
    if(!row.sourceIntro&&readDaumDescription&&daumUrl){row.sourceIntro=forLocale(await once(daumCache,daumUrl,()=>readDaumDescription(daumUrl)),'ko');row.sourceUrl=daumUrl;row.sourceMethod='daum_official_isbn'}
    if(!row.sourceIntro)row.scopeWarnings.push('source_introduction_missing')
   }else{
    if(official.isbn!==row.isbn||!official.editionIsbns?.includes(row.isbn)){row.scopeWarnings.push('official_isbn_binding_missing');artifacts.push(row);continue}
    if(!official.languageKeys?.includes('/languages/eng')){row.scopeWarnings.push('english_language_not_confirmed');artifacts.push(row);continue}
    row.sourceIntro=forLocale(description(official.description),'en');row.sourceUrl=official.sourceUrl;row.sourceMethod='openlibrary_edition'
    if(!row.sourceIntro){
     if(['selection','retelling','adaptation','volume'].includes(row.editionKind)){
      row.scopeWarnings.push('partial_or_changed_text_cannot_use_original_intro');artifacts.push(row);continue
     }
     const keys=official.workKeys??[]
     if(keys.length!==1){row.scopeWarnings.push('single_original_work_not_confirmed');artifacts.push(row);continue}
     const workUrl='https://openlibrary.org'+keys[0]
     row.neededWorkDescription=workUrl
     if(!readOpenLibraryWork){row.scopeWarnings.push('work_description_requires_lookup');artifacts.push(row);continue}
     const loaded=await once(workCache,keys[0],()=>readOpenLibraryWork(workUrl)),work=loaded?.data??loaded
     const authors=(work?.authors??[]).map(author=>author.author?.key).filter(Boolean)
     row.originalWorkBinding={key:work?.key??null,title:work?.title??null,authorKeys:authors}
     const proposed=description(work?.description)
     if(proposed&&!isBookIntroductionSource(proposed))row.sourceCandidates.push({text:proposed,sourceUrl:loaded?.sourceUrl??workUrl,sourceMethod:'openlibrary_candidate_work',title:work?.title??null,authorKeys:authors})
     const workTitle=text(work?.title),boundTitle=[row.originalTitle,row.workTitle,row.title].filter(Boolean).some(title=>bookEditionTitleKey(title)===bookEditionTitleKey(workTitle))
     const excluded=excludedBookEditionReason({locale:'en',title:row.title,isbn:row.isbn,editionKind:row.editionKind,textScope:row.textScope})
     const editionTitleMatches=[official.title,official.mainTitle].filter(Boolean).some(title=>bookEditionTitleKey(row.title)===bookEditionTitleKey(title))
     const creatorMatches=bookEditionTitleKey(row.creator)===bookEditionTitleKey(official.creator)
     if(!work||work.key!==keys[0]||!boundTitle||!editionTitleMatches||!creatorMatches||excluded||!canUseBookWorkIntroduction(official.title,official.editionAuthorKeys??[],workTitle,authors)){
      row.scopeWarnings.push('original_work_title_author_or_scope_mismatch');artifacts.push(row);continue
     }
     row.sourceIntro=forLocale(description(work.description),'en');row.sourceUrl=loaded?.sourceUrl??workUrl;row.sourceMethod='openlibrary_bound_work'
     if(row.sourceIntro)delete row.neededWorkDescription
    }
    if(!row.sourceIntro)row.scopeWarnings.push('source_introduction_missing_or_language_review')
   }
   artifacts.push(row)
  }
  return artifacts
 }
 return {prefetch}
}

/** 언어 검증에서 보류된 ISBN의 원자료만 다시 읽는다. 승인 메타와 구분해 전달한다. */
export async function readOpenLibraryEditionContext(isbn) {
 const response=await requestOpenLibraryBookBatch([isbn],'details')
 if(!response.ok)throw Error('OpenLibrary edition context HTTP '+response.status)
 const detail=(await response.json())['ISBN:'+isbn]?.details
 const ids=[...(detail?.isbn_13??[]),...(detail?.isbn_10??[])].map(toIsbn13).filter(Boolean)
 if(!/^\/books\/OL\d+M$/u.test(detail?.key??'')||!ids.includes(isbn))return null
 const context=Object.fromEntries(['key','title','subtitle','authors','author','languages','description','notes','table_of_contents','subjects','physical_format','number_of_pages','publishers','publish_date','isbn_13','isbn_10','works'].filter(key=>detail[key]!==undefined).map(key=>[key,detail[key]]))
 return {detail:context,binding:{isbn,editionIsbns:[...new Set(ids)],languageKeys:(detail.languages??[]).map(x=>x.key).filter(Boolean),editionAuthorKeys:(detail.authors??[]).map(x=>x.key).filter(x=>/^\/authors\/OL\d+A$/u.test(x??'')),workKeys:[...new Set((detail.works??[]).map(x=>x.key).filter(x=>/^\/works\/OL\d+W$/u.test(x??'')))]}}
}

/** 공식 판본의 언어 표기가 빠져도 원작 본문은 LLM 검수 자료로 읽는다. 소개 승인·DB 쓰기는 하지 않는다. */
export function createUnboundOriginalContextResearch({readOpenLibraryWork=readOpenLibraryIntroductionWork,readOpenLibraryEdition=readOpenLibraryEditionContext}={}) {
 const cache=new Map(),editions=new Map(),pending=[];let active=0
 const advance=()=>{while(active<2&&pending.length){active++;const {read,resolve,reject}=pending.shift();Promise.resolve().then(read).then(resolve,reject).finally(()=>{active--;advance()})}}
 function original(key){
  if(!cache.has(key)){
   const lookup=new Promise((resolve,reject)=>{pending.push({read:()=>readOpenLibraryWork('https://openlibrary.org'+key),resolve,reject});advance()})
   cache.set(key,lookup);lookup.catch(()=>{if(cache.get(key)===lookup)cache.delete(key)})
  }
  return cache.get(key)
 }
 async function enrich(artifacts){
  if(!Array.isArray(artifacts))throw Error('Introduction artifact rows required')
  const rows=structuredClone(artifacts)
  await Promise.all(rows.map(async row=>{
   const isbn=toIsbn13(row.isbn??'')
   if(row.locale!=='en'||row.sourceIntro||!isbn)return
   if(!row.officialBinding&&row.scopeWarnings?.some(warning=>['english_language_not_confirmed','english_title_not_confirmed','english_creator_not_confirmed','unapproved_official_edition_context'].includes(warning))){
    try{
     if(!editions.has(isbn)){
      const lookup=new Promise((resolve,reject)=>{pending.push({read:()=>readOpenLibraryEdition(isbn),resolve,reject});advance()})
      editions.set(isbn,lookup);lookup.catch(()=>{if(editions.get(isbn)===lookup)editions.delete(isbn)})
     }
     const raw=await editions.get(isbn)
     if(raw){row.officialBinding=raw.binding;row.unapprovedEditionContext={...raw.detail,sourceUrl:'https://openlibrary.org'+raw.detail.key}}
    }catch{row.scopeWarnings=[...new Set([...(row.scopeWarnings??[]),'edition_context_lookup_failed'])];return}
   }
   const binding=row.officialBinding,keys=binding?.workKeys
   if(row.locale!=='en'||row.sourceIntro||!isbn||!binding?.editionIsbns?.includes(isbn)
    ||!Array.isArray(keys)||keys.length!==1||!/^\/works\/OL\d+W$/u.test(keys[0])
    ||row.sourceCandidates?.some(source=>source.sourceMethod==='openlibrary_candidate_work'))return
   try{
    const loaded=await original(keys[0]),work=loaded?.data??loaded
    if(!work)return
    if(work.key!==keys[0])throw Error('Original work key mismatch')
    const authors=(work.authors??[]).map(author=>author.author?.key).filter(Boolean),proposed=description(work.description)
    row.originalWorkBinding={key:work.key,title:work.title??null,authorKeys:authors}
    if(proposed&&!isBookIntroductionSource(proposed)){
     row.sourceCandidates??=[]
     row.sourceCandidates.push({text:proposed,sourceUrl:'https://openlibrary.org'+keys[0],sourceMethod:'openlibrary_candidate_work',title:work.title??null,authorKeys:authors})
     row.scopeWarnings=[...new Set([...(row.scopeWarnings??[]),'original_context_requires_llm_edition_review'])]
    }
   }catch{row.scopeWarnings=[...new Set([...(row.scopeWarnings??[]),'original_context_lookup_failed'])]}
  }))
  return rows
 }
 return {enrich}
}
