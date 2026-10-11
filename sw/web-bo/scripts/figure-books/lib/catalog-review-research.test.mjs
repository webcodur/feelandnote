import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'

const helper=new URL('./catalog-review-research.mjs',import.meta.url).href
const kakao=new URL('../../../../../packages/content-search/src/kakao-books.ts',import.meta.url).href
// 매번 독립 프로세스에서 환경변수 캡처를 검증한다. fetch는 전부 대체하며 실제 API를 호출하지 않는다.
function isolated(source){
 const previous=process.env.KAKAO_REST_API_KEY
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',`
 import assert from 'node:assert/strict';
 import {createCatalogReviewResearch} from ${JSON.stringify(helper)};
 const isbn='9780141439518';
 const env={KAKAO_REST_API_KEY:'test-production',KAKAO_RESEARCH_REST_API_KEY:'test-research'};
 globalThis.fetch=async()=>{throw Error('Unexpected unmocked fetch')};
 ${source}
 `],{encoding:'utf8',timeout:15000})
 assert.equal(result.status,0,result.stderr||result.stdout)
 assert.equal(process.env.KAKAO_REST_API_KEY,previous)
}

test('import has no side effects; missing and production research keys fail before fetch/import binding',()=>isolated(`
 process.env.KAKAO_REST_API_KEY='test-production';
 await assert.rejects(createCatalogReviewResearch({env:{KAKAO_REST_API_KEY:'test-production'}}),/KAKAO_RESEARCH_REST_API_KEY required/);
 await assert.rejects(createCatalogReviewResearch({env:{...env,KAKAO_RESEARCH_REST_API_KEY:'test-production'}}),/must differ/);
 await assert.rejects(createCatalogReviewResearch({env:{KAKAO_RESEARCH_REST_API_KEY:'test-production'}}),/must differ/);
 assert.equal(process.env.KAKAO_REST_API_KEY,'test-production');
`))

test('Kakao uses a fresh research-bound module even after a production module import and later env mutation',()=>isolated(`
 process.env.KAKAO_REST_API_KEY='test-production';
 await import(${JSON.stringify(kakao)});
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,authorization:options.headers.Authorization});
  return {ok:true,json:async()=>({documents:[
   {title:'Other',isbn:'9780141439587',authors:['Other'],translators:[],thumbnail:'',contents:''},
   {title:'Pride and Prejudice',isbn,authors:['Jane Austen'],translators:['역자'],publisher:'Penguin',datetime:'2003-01-01',thumbnail:'',contents:'Text',url:'https://search.daum.net/search?bookId=1',status:'정상판매'}
  ],meta:{is_end:true}})};
 };
 const research=await createCatalogReviewResearch({env});
 assert.equal(process.env.KAKAO_REST_API_KEY,'test-research');
 process.env.KAKAO_REST_API_KEY='test-production';
 const rows=await research.collect('kakao',[isbn,'0-14-143951-3']);
 assert.equal(rows.length,1);
 assert.equal(rows[0].data.externalSource,'kakao_book');
 assert.equal(rows[0].data.creator,'Jane Austen');
 assert.deepEqual(rows[0].data.metadata.translators,['역자']);
 assert.equal(calls.length,1);
 assert.equal(calls[0].authorization,'KakaoAK test-research');
 assert.equal(new URL(calls[0].url).searchParams.get('target'),'isbn');
 await assert.rejects(research.collect('kakao',['invalid']),/Valid ISBN/);
 await assert.rejects(research.collect('other',[isbn]),/Unsupported/);
 assert.equal(calls.length,1);
`))

test('English ISBN research reuses official batch details/data and validates language',()=>isolated(`
 const calls=[],other='9780141439587';
 globalThis.fetch=async(url)=>{
  calls.push(url);const command=new URL(url).searchParams.get('jscmd');
  const entry=command==='details'?{details:{key:'/books/OL123M',isbn_13:[isbn],title:'Pride and Prejudice',languages:[{key:'/languages/eng'}],works:[{key:'/works/OL123W'}],publishers:['Penguin']}}:{authors:[{name:'Jane Austen',url:'https://openlibrary.org/authors/OL123A'}]};
  const nonEnglish=command==='details'?{details:{key:'/books/OL124M',isbn_13:[other],title:'Other Book',languages:[{key:'/languages/fre'}]}}:entry;
  return {ok:true,json:async()=>({['ISBN:'+isbn]:entry,['ISBN:'+other]:nonEnglish})};
 };
 const research=await createCatalogReviewResearch({env});
 const rows=await research.collect('openlibrary',[isbn,isbn,other]);
 assert.equal(rows.length,2);assert.equal(rows[0].data.isbn,isbn);
 assert.equal(rows[1].data.error,'english_language_not_confirmed');
 assert.equal(rows[0].data.sourceUrl,'https://openlibrary.org/books/OL123M');
 assert.deepEqual(rows[0].data.workKeys,['/works/OL123W']);
 assert.equal(rows[0].data.creator,'Jane Austen');
 assert.equal(calls.length,2);
 assert.deepEqual(calls.map(url=>new URL(url).searchParams.get('jscmd')),['details','data']);
`))

test('YES24 refuses missing audit keys and production primary/secondary keys',()=>{
 for(const [keys,pattern] of [
  [{},'YES24_AUDIT_API_KEY required'],
  [{YES24_AUDIT_API_KEY:'test-web-production'},'must differ'],
  [{YES24_AUDIT_API_KEY:'test-audit',YES24_AUDIT_SECONDARY_API_KEY:'test-web-production'},'must differ'],
 ])isolated(`
  const research=await createCatalogReviewResearch({env:{...env,...${JSON.stringify(keys)}},webYes24ApiKey:'test-web-production'});
  await assert.rejects(research.researchShelfEdition({isbn}),new RegExp(${JSON.stringify(pattern)}));
 `)
})

test('YES24 shares existing cache and switches only on confirmed daily quota exhaustion',()=>isolated(`
 const calls=[],switches=[];
 globalThis.fetch=async(url,options)=>{
  const apiKey=options.headers?.['X-Api-Key'];calls.push({url,apiKey});
  if(apiKey==='test-audit')return {ok:false,status:429,headers:new Headers({'x-ratelimit-remaining-day':'0','x-ratelimit-reset-day':'tomorrow'})};
  if(apiKey)return {ok:true,json:async()=>({success:true,data:{items:[{isbn13:isbn,goodsType:'도서',itemId:'123',title:'Book',author:'Author'}]}})};
  return {ok:true,text:async()=>'<h2 class="gd_name">Book</h2><div class="gd_infoTop"><span class="gd_reviewCount"><a>첫 번째 리뷰어가 되어 주세요.</a></span><div class="gd_infoBot"><th>ISBN13</th><td>'+isbn+'</td>'};
 };
 const research=await createCatalogReviewResearch({env:{...env,YES24_AUDIT_API_KEY:'test-audit',YES24_AUDIT_SECONDARY_API_KEY:'test-secondary'},webYes24ApiKey:'test-web-production',onYes24Switch:event=>switches.push(event)});
 const results=await Promise.all([research.researchShelfEdition({isbn}),research.researchShelfEdition({isbn})]);
 assert.equal(results[0].verified,true);assert.deepEqual(results[0],results[1]);
 assert.equal(switches.length,1);assert.equal(switches[0].reason,'YES24_DAILY_QUOTA_EXHAUSTED');
 assert.deepEqual(calls.filter(call=>call.apiKey).map(call=>call.apiKey),['test-audit','test-secondary']);
 await research.researchShelfEdition({isbn});assert.equal(calls.length,3);
`))

test('YES24 nonquota failures do not consume the secondary key',()=>isolated(`
 const keys=[];globalThis.fetch=async(url,options)=>{keys.push(options.headers?.['X-Api-Key']);return {ok:false,status:400,headers:new Headers()}};
 const research=await createCatalogReviewResearch({env:{...env,YES24_AUDIT_API_KEY:'test-audit',YES24_AUDIT_SECONDARY_API_KEY:'test-secondary'},webYes24ApiKey:'test-web-production'});
 const result=await research.researchShelfEdition({isbn});assert.equal(result.verified,false);assert.equal(result.error,'HTTP 400');
 assert.deepEqual(keys,['test-audit']);
`))
