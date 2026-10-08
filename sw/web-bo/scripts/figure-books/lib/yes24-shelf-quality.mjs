import {toIsbn13} from '../../../../../packages/content-search/src/book-isbn.ts'
import {excludedBookEditionReason} from '../../../../../packages/content-search/src/book-edition-policy.ts'

const clean=value=>String(value??'').replace(/<[^>]+>/gu,' ').replace(/&nbsp;|&#160;/gu,' ').replace(/&amp;/gu,'&').replace(/\s+/gu,' ').trim()
const number=value=>value===undefined?null:Number(value.replaceAll(',',''))
export const SHELF_QUALITY_AUDIT = Object.freeze({concurrency:4,requestTimeoutMs:20000,requestSpacingMs:150,poorRating:4})

/** 다른 상품이나 추천 상품의 점수를 현재 ISBN의 평가로 가져오지 않는다. */
export function parseYes24ShelfQuality(html,url,expectedIsbn) {
 const source=new URL(url)
 if(source.hostname!=='www.yes24.com'||!/^\/product\/goods\/\d+\/?$/iu.test(source.pathname))throw Error('YES24 product URL required')
 const isbn=html.match(/<th\b[^>]*>\s*ISBN13\s*<\/th>\s*<td\b[^>]*>\s*(\d{13})\s*<\/td>/iu)?.[1]
 if(!toIsbn13(expectedIsbn)||isbn!==toIsbn13(expectedIsbn))return {isbn:expectedIsbn,url,verified:false,error:'isbn_mismatch'}
 const top=html.match(/<div\b[^>]*class="[^"]*\bgd_infoTop\b[^"]*"[^>]*>([\s\S]*?)(?=<div\b[^>]*class="[^"]*\bgd_infoBot\b)/iu)?.[1]??''
 const rating=number(top.match(/id="spanGdRating"[\s\S]*?<em\b[^>]*class="yes_b"[^>]*>\s*([\d.]+)\s*<\/em>/iu)?.[1])
 const reviewCount=number(top.match(/class="gd_reviewCount[^"\n]*"[\s\S]*?<em\b[^>]*>\s*([\d,]+)\s*<\/em>/iu)?.[1])
 const salesIndex=number(top.match(/class="gd_sellNum"[\s\S]*?판매지수\s*([\d,]+)/u)?.[1])
 const title=clean(html.match(/<h2\b[^>]*class="gd_name"[^>]*>([\s\S]*?)<\/h2>/iu)?.[1])
 const authors=clean(top.match(/<span\b[^>]*class="gd_auth"[^>]*>([\s\S]*?)<\/span>/iu)?.[1])
 const publisherText=[...html.matchAll(/<div\b[^>]*id="infoset_(?:introduce|pubReivew)"[^>]*>[\s\S]*?<textarea\b[^>]*>([\s\S]*?)<\/textarea>/giu)].map(match=>clean(match[1])).join(' ')
 const policyReason=excludedBookEditionReason({locale:'ko',title:[title,clean(top)].join(' '),isbn,providerDescription:publisherText})
 return {isbn,url,verified:true,title,authors,rating:rating>0&&rating<=10?rating:null,reviewCount,salesIndex,policyReason}
}

export function needsShelfQualityReview(result) {
 return result.verified&&result.rating!==null&&result.reviewCount>0&&result.rating<=SHELF_QUALITY_AUDIT.poorRating
}

/** 서점 수치는 검수 후보를 찾는 단서다. 이 도구는 관계·판본을 자동 삭제하지 않는다. */
export function createYes24ShelfQualityLoader(apiKey,fetcher=fetch) {
 const cache=new Map()
 let nextSearchAt=0
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
 const read=async(url,headers)=>{
  for(let attempt=0;attempt<4;attempt++){
   if(headers){const now=Date.now(),wait=Math.max(0,nextSearchAt-now);nextSearchAt=Math.max(now,nextSearchAt)+SHELF_QUALITY_AUDIT.requestSpacingMs;if(wait)await sleep(wait)}
   let response
   try{response=await fetcher(url,{headers,signal:AbortSignal.timeout(SHELF_QUALITY_AUDIT.requestTimeoutMs)})}catch(error){if(attempt===3)throw error;await sleep(1000*(attempt+1));continue}
   if((response.status===429||response.status>=500)&&attempt<3){
    const reset=Number(response.headers.get('x-ratelimit-reset-second'))*1000-Date.now()
    await sleep(Math.max(1000,Math.min(10000,reset||0))+attempt*1000);continue
   }
   if(!response.ok)throw Error('HTTP '+response.status)
   return response
  }
 }
 return async edition=>{
  const isbn=toIsbn13(edition.isbn??'')
  if(!isbn)return {verified:false,error:'invalid_isbn'}
  if(!cache.has(isbn))cache.set(isbn,(async()=>{
   const response=await read('https://apis.yes24.com/v1/goods/itemList?'+new URLSearchParams({query:isbn,category:'BOOK',pageSize:'20'}),{'X-Api-Key':apiKey})
   const payload=await response.json()
   if(payload.success!==true||!Array.isArray(payload.data?.items))throw Error('Invalid YES24 search response')
   const items=payload.data.items.filter(item=>toIsbn13(item.isbn13??'')===isbn&&item.goodsType==='도서')
   if(!items.length)return {isbn,verified:false,error:'isbn_not_found'}
   const item=items[0],url='https://www.yes24.com/product/goods/'+item.itemId
   const html=await (await read(url)).text()
   const result=parseYes24ShelfQuality(html,url,isbn)
   return {...result,title:result.title||item.title,authors:result.authors||item.author,publisher:item.publisher,status:item.itemStatus,publishDate:item.publishDate}
  })().catch(error=>({isbn,verified:false,error:error.message})))
  // HTML에서 잘린 문자열이 큰 원문 버퍼를 붙잡지 않도록 작은 결과만 보관한다.
  const result=JSON.parse(JSON.stringify(await cache.get(isbn)))
  cache.set(isbn,Promise.resolve(result))
  if(cache.size>256)cache.delete(cache.keys().next().value)
  return result
 }
}
