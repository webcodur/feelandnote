/** 조사 전용 프로세스의 공식 서지 조회. 운영 키로 대체하지 않으며 응답은 호출자 메모리에만 둔다. */
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'

function researchKakaoKey(env) {
 const key=env.KAKAO_RESEARCH_REST_API_KEY?.trim()
 if(!key)throw Error('KAKAO_RESEARCH_REST_API_KEY required; production key is not used for research')
 if([env.KAKAO_REST_API_KEY,process.env.KAKAO_REST_API_KEY].some(value=>value?.trim()===key))throw Error('Kakao research key must differ from the production KAKAO_REST_API_KEY')
 return key
}

function webYes24Key() {
 const source=readFileSync(new URL('../../../../web/.env',import.meta.url),'utf8')
 return source.split(/\r?\n/u).find(line=>line.startsWith('YES24_API_KEY='))?.slice('YES24_API_KEY='.length).trim().replace(/^["']|["']$/gu,'')
}

/** 이 팩토리는 중앙 조사 수집기에서 한 번만 만든다. API import 전에 프로세스 안에서만 연구 키를 묶는다. */
export async function createCatalogReviewResearch({env=process.env,webYes24ApiKey,onYes24Switch=()=>{}}={}) {
 const key=researchKakaoKey(env)
 // env가 별도 설정 객체여도 실제 모듈이 읽는 곳은 이 프로세스의 process.env다.
 process.env.KAKAO_REST_API_KEY=key
 // 운영 키로 먼저 import된 canonical 모듈의 키 캡처를 재사용하지 않는다. URL에는 비밀값을 넣지 않는다.
 const kakaoUrl=new URL('../../../../../packages/content-search/src/kakao-books.ts',import.meta.url)
 kakaoUrl.searchParams.set('catalog-review-research',randomUUID())
 const kakao=await import(kakaoUrl.href)
 const [{toIsbn13},{auditEnglishProviders}]=await Promise.all([
  import('../../../../../packages/content-search/src/book-isbn.ts'),
  import('./edition-provider-audit.mjs'),
 ])
 const yes24Env={YES24_API_KEY:env.YES24_API_KEY,YES24_AUDIT_API_KEY:env.YES24_AUDIT_API_KEY,YES24_AUDIT_SECONDARY_API_KEY:env.YES24_AUDIT_SECONDARY_API_KEY}
 let yes24Loader

 const validIsbn=raw=>{
  const isbn=toIsbn13(String(raw??''))
  if(!isbn)throw Error('Valid ISBN required for catalog research')
  return isbn
 }
 const researchKoreanIsbn=async raw=>kakao.getKakaoBookByIsbn(validIsbn(raw))
 const researchEnglishIsbns=async rawIsbns=>{
  if(!Array.isArray(rawIsbns))throw Error('ISBN array required for catalog research')
  const isbns=[...new Set(rawIsbns.map(validIsbn))]
  const catalog={editions:[],locales:isbns.map(isbn=>({locale:'en',isbn}))}
  return (await auditEnglishProviders(catalog)).officialByIsbn
 }
 const researchShelfEdition=async edition=>{
  const isbn=validIsbn(edition?.isbn)
  // 처음부터 Promise 하나를 공유해 동시 호출이 감사 로더와 캐시를 복제하지 않는다.
  yes24Loader??=import('../shelf-quality-audit.mjs').then(({createShelfQualityResearchLoader})=>
   createShelfQualityResearchLoader(yes24Env,webYes24ApiKey??webYes24Key(),fetch,onYes24Switch))
  return (await yes24Loader)({...edition,isbn})
 }
 const collect=async(provider,rawIsbns)=>{
  if(!['kakao','openlibrary','yes24'].includes(provider))throw Error('Unsupported catalog research provider')
  if(!Array.isArray(rawIsbns))throw Error('ISBN array required for catalog research')
  const isbns=[...new Set(rawIsbns.map(validIsbn))]
  if(provider==='openlibrary'){
   const byIsbn=await researchEnglishIsbns(isbns)
   return isbns.map(isbn=>({isbn,data:byIsbn.get(isbn)}))
  }
  const results=[]
  for(const isbn of isbns)results.push({isbn,data:provider==='kakao'?await researchKoreanIsbn(isbn):await researchShelfEdition({isbn})})
  return results
 }
 return {researchKoreanIsbn,researchEnglishIsbns,researchShelfEdition,collect}
}
