/** 국내 ISBN을 공식 카카오 응답과 대조한다. 조회 실패와 서지 미등록을 구별한다. */
import {getKakaoBookByIsbn} from '../../../../../packages/content-search/src/kakao-books.ts'
import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {bookEditionTitleKey} from '../../../../../packages/content-search/src/book-series.ts'

export const KAKAO_EDITION_AUDIT_LIMITS=Object.freeze({concurrency:4,pauseMs:150,retries:3})
const key=value=>bookEditionTitleKey(String(value??''))
function daumId(url){try{const u=new URL(url);return ['search.daum.net','m.search.daum.net'].includes(u.hostname)&&u.pathname==='/search'?u.searchParams.get('bookId'):null}catch{return null}}
export function compareKakaoEdition(row,official){
  if(!official)return {error:'kakao_isbn_not_found'}
  if(toIsbn13(row.isbn??'')!==toIsbn13(official.metadata?.isbn??''))return {error:'kakao_isbn_mismatch'}
  if(!official.title?.trim()||!official.creator?.trim())return {error:'kakao_title_or_creator_missing'}
  const sources=row.sources??{},officialId=daumId(official.metadata.link)
  const bound=!!officialId&&sources.primary==='kakao_book'&&[sources.title,sources.isbn].some(url=>daumId(url)===officialId)
    &&!sources.edition_work_evidence?.length&&!sources.work_attribution
  const fields={}
  if(row.title!==official.title)fields.title=official.title
  if(row.creator!==official.creator)fields.creator=official.creator
  if(!row.publisher&&official.metadata.publisher)fields.publisher=official.metadata.publisher
  // 실제 서지 URL이 일치해도 제목이 달라졌으면 작품 오귀속을 먼저 검토한다.
  return {bound:bound&&key(row.title)===key(official.title),fields,official,expected:{title:row.title,creator:row.creator,publisher:row.publisher}}
}
export async function auditKakaoEditions(catalog,{lookup=getKakaoBookByIsbn,progress=()=>{}}={}){
  const rows=[...catalog.editions.map(row=>({...row,table:'figure_book_editions'})),...catalog.locales.map(row=>({...row,table:'content_locales'}))].filter(row=>row.locale==='ko'&&toIsbn13(row.isbn??''))
  const isbns=[...new Set(rows.map(row=>toIsbn13(row.isbn)))],officialByIsbn=new Map();let next=0,done=0,failure
  await Promise.all(Array.from({length:KAKAO_EDITION_AUDIT_LIMITS.concurrency},async()=>{
    while(next<isbns.length&&!failure){const isbn=isbns[next++];let book,loaded=false
      for(let attempt=0;attempt<KAKAO_EDITION_AUDIT_LIMITS.retries;attempt++){
        await new Promise(resolve=>setTimeout(resolve,attempt?5000*(attempt+1):KAKAO_EDITION_AUDIT_LIMITS.pauseMs))
        try{book=await lookup(isbn);loaded=true;break}catch(error){if(attempt===KAKAO_EDITION_AUDIT_LIMITS.retries-1)failure=error;else progress({retry:isbn,attempt:attempt+1,error:error.message})}
      }
      if(!loaded)break
      officialByIsbn.set(isbn,book);progress({checked:++done,total:isbns.length})
    }
  }))
  if(failure)throw failure
  const differences=[],errors=[]
  for(const row of rows){const diff=compareKakaoEdition(row,officialByIsbn.get(toIsbn13(row.isbn)))
    if(diff.error)errors.push({table:row.table,id:row.id,contentId:row.content_id,isbn:row.isbn,error:diff.error})
    else if(Object.keys(diff.fields).length)differences.push({table:row.table,id:row.id,contentId:row.content_id,isbn:row.isbn,...diff})
  }
  return {officialByIsbn,differences,errors}
}
