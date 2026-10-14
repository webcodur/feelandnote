import test from 'node:test'
import assert from 'node:assert/strict'
import {parseYes24ShelfQuality,needsShelfQualityReview,createYes24ShelfQualityLoader,YES24_DAILY_QUOTA_EXHAUSTED,SHELF_QUALITY_AUDIT} from './lib/yes24-shelf-quality.mjs'
import {auditShelfQuality,shelfQualityAuditKey,createShelfQualityResearchLoader,detectShelfCatalogGaps,loadPublicShelfAuditCatalog} from './shelf-quality-audit.mjs'

test('공개 작품에 판본이 없으면 ISBN 점검에서 빠지지 않고 원문 검수 후보로 남긴다',()=>{
 const catalog={contents:[{id:'fragment',external_id:'480121107100',metadata:{workIdentity:'book/480121107100'},referenceCounts:{}},{id:'private'}],
  locales:[{content_id:'fragment',locale:'ko',title:'삼국연의 1회 2회',isbn:null,sources:{primary:'none'}}]}
 const report=detectShelfCatalogGaps(catalog,new Set(['fragment']),[])
 assert.equal(report.length,1);assert.equal(report[0].reason,'no_physical_edition')
 assert.equal(report[0].externalId,'480121107100');assert.equal(report[0].locales[0].title,'삼국연의 1회 2회')
 assert.deepEqual(report[0].editionIds,[]);assert.equal(catalog.contents.length,2)
})

test('ISBN 없는 판본도 별도 검수하며 정상 영문 원서만 있는 작품은 결손으로 취급하지 않는다',()=>{
 const catalog={contents:[{id:'invalid'},{id:'english'}],locales:[]}
 const result=detectShelfCatalogGaps(catalog,new Set(['invalid','english']),[
  {id:1,content_id:'invalid',locale:'ko',isbn:'480121107100'},
  {id:2,content_id:'english',locale:'en',isbn:'9780520224780'}])
 assert.deepEqual(result.map(row=>[row.contentId,row.reason,row.editionIds]),[['invalid','no_valid_edition_isbn',[1]]])
})

test('판본 없는 직군·테마 책장 작품도 공개 인물 관계와 함께 추적한다',async()=>{
 const catalog={people:[{id:'active',publication_status:'active'},{id:'draft',publication_status:'draft'}],
  relations:[{celeb_id:'active',content_id:'appearance'},{celeb_id:'draft',content_id:'hidden'}],
  readings:[{celeb_id:'active',content_id:'public-reading',visibility:'public'},{celeb_id:'active',content_id:'private-reading',visibility:'private'},
   {celeb_id:'draft',content_id:'draft-reading',visibility:'public'},{celeb_id:'active',content_id:'appearance',visibility:'private'}],
  contents:['appearance','profession','theme','hidden','public-reading','private-reading','draft-reading'].map(id=>({id})),locales:[],editions:[]}
 const db={from:table=>{const query={select:()=>query,order:()=>query,range:async()=>({data:table==='profession_book_picks'?[{content_id:'profession'}]:[{id:'theme-shelf',theme_book_ids:['theme']}],error:null})};return query}}
 const result=await loadPublicShelfAuditCatalog(catalog,db)
 assert.deepEqual(result.editions,[])
 assert.deepEqual(result.catalogReview.map(row=>row.contentId),['appearance','profession','public-reading','theme'])
})

test('감상 책장은 정상 언어 카드만으로도 표시하므로 판본 테이블 행을 요구하지 않는다',()=>{
 const catalog={contents:[{id:'reading',catalog:false},{id:'figure',catalog:true}],locales:[
  {content_id:'reading',locale:'ko',isbn:'9791130321561',sources:{primary:'kakao_book'}},
  {content_id:'figure',locale:'ko',isbn:'9791130321561',sources:{primary:'kakao_book'}}]}
 assert.deepEqual(detectShelfCatalogGaps(catalog,new Set(['reading','figure']),[]).map(row=>row.contentId),['figure'])
})

test('대량 점검은 운영 키로 폴백하지 않고 동일한 키도 거부한다',()=>{
 assert.throws(()=>shelfQualityAuditKey({YES24_API_KEY:'production'},'production'),/YES24_AUDIT_API_KEY required/)
 assert.throws(()=>shelfQualityAuditKey({YES24_AUDIT_API_KEY:'production'},'production'),/must differ/)
 assert.throws(()=>shelfQualityAuditKey({YES24_AUDIT_API_KEY:'inherited',YES24_API_KEY:'inherited'},'production'),/must differ/)
 assert.equal(shelfQualityAuditKey({YES24_AUDIT_API_KEY:'audit'},'production'),'audit')
})
const isbn='9791130321561',url='https://www.yes24.com/product/goods/161408465'
test('연구용 보조 키도 운영 키와 같으면 호출 전에 거부한다',()=>{
 for(const secondary of ['production','local-production'])assert.throws(()=>createShelfQualityResearchLoader({YES24_AUDIT_API_KEY:'research',YES24_AUDIT_SECONDARY_API_KEY:secondary,YES24_API_KEY:'local-production'},'production'),/secondary key must differ/)
})
test('동시 소진 응답은 보조 연구 키로 한 번 전환하고 이후에도 보조 키를 쓴다',async()=>{
 const requests=[],switches=[]
 const loader=createShelfQualityResearchLoader({YES24_AUDIT_API_KEY:'primary',YES24_AUDIT_SECONDARY_API_KEY:'secondary'},'production',async(_url,{headers})=>{
  requests.push(headers['X-Api-Key'])
  return headers['X-Api-Key']==='primary'?new Response('',{status:429,headers:{'x-ratelimit-remaining-day':'0'}}):new Response(JSON.stringify({success:true,data:{items:[]}}),{status:200})
 },result=>switches.push(result))
 const results=await Promise.all([loader({isbn}),loader({isbn:'9788934971016'})])
 assert.ok(results.every(result=>result.error==='isbn_not_found'))
 await loader({isbn:'9780231129695'})
 assert.deepEqual(switches,[{researchKeyPosition:2,reason:YES24_DAILY_QUOTA_EXHAUSTED}])
 assert.equal(requests.at(-1),'secondary');assert.ok(!requests.includes('production'))
})
test('일반 조회 실패에는 키를 전환하지 않고 연구 키가 모두 소진되면 멈춘다',async()=>{
 const requests=[]
 const env={YES24_AUDIT_API_KEY:'primary',YES24_AUDIT_SECONDARY_API_KEY:'secondary'}
 const missing=createShelfQualityResearchLoader(env,'production',async(_url,{headers})=>{requests.push(headers['X-Api-Key']);return new Response('',{status:404})})
 assert.equal((await missing({isbn})).error,'HTTP 404');assert.deepEqual(requests,['primary'])
 const exhausted=createShelfQualityResearchLoader(env,'production',async(_url,{headers})=>{requests.push(headers['X-Api-Key']);return new Response('',{status:429,headers:{'x-ratelimit-remaining-day':'0'}})})
 await assert.rejects(exhausted({isbn}),error=>error.code===YES24_DAILY_QUOTA_EXHAUSTED)
 await assert.rejects(exhausted({isbn:'9788934971016'}),error=>error.code===YES24_DAILY_QUOTA_EXHAUSTED)
 assert.deepEqual(requests,['primary','primary','secondary'])
})
const html=(rating='2.0',count='1',sales='216')=>'<h2 class="gd_name">실제 책</h2><div class="gd_infoTop"><span id="spanGdRating"><em class="yes_b">'+rating+'</em></span><span class="gd_reviewCount moreRating"><em>'+count+'</em></span><span class="gd_sellNum">판매지수 '+sales+'</span></div><div class="gd_infoBot"></div><th class="txt">ISBN13</th><td class="txt lastCol">'+isbn+'</td>'
test('같은 ISBN 상품의 평점·리뷰 수·판매지수를 읽는다',()=>{
 const r=parseYes24ShelfQuality(html(),url,isbn)
 assert.equal(r.verified,true);assert.equal(r.rating,2);assert.equal(r.reviewCount,1);assert.equal(r.salesIndex,216);assert.equal(needsShelfQualityReview(r),true)
 assert.equal(parseYes24ShelfQuality(html('9.8','1,230','12,300'),url,isbn).salesIndex,12300)
})
test('다른 ISBN의 평점으로 현재 책을 폐기 후보로 만들지 않는다',()=>{
 const r=parseYes24ShelfQuality(html(),url,'9788934971016');assert.equal(r.verified,false);assert.equal(needsShelfQualityReview(r),false)
})

test('한줄평만 있는 상품은 합계와 회원리뷰 수를 구분해 LLM 검수 후보로 전달한다',()=>{
 const page=html('10','1','216')+'<em class="txt_num" id="scroll_bar_count" data-review-count="0" data-onecomment-count="1">(0/1)</em>'
 const result=parseYes24ShelfQuality(page,url,isbn)
 assert.equal(result.reviewCount,1);assert.equal(result.writtenReviewCount,0);assert.equal(result.oneLineReviewCount,1)
 assert.equal(needsShelfQualityReview(result),true)
 assert.equal(parseYes24ShelfQuality(page,url,'9788934971016').verified,false)
})

test('회원리뷰 카운터 누락을 0으로 만들거나 추천 상품의 카운터를 섞지 않는다',()=>{
 const page=html('9.8','10','216')+'<em id="recommended_review_count" data-review-count="0" data-onecomment-count="10">(0/10)</em>'
 const result=parseYes24ShelfQuality(page,url,isbn)
 assert.equal(result.writtenReviewCount,null);assert.equal(result.oneLineReviewCount,null);assert.equal(needsShelfQualityReview(result),false)
 const actual=parseYes24ShelfQuality(page+"<em data-onecomment-count='9' id='scroll_bar_count' data-review-count='1'>(1/9)</em>",url,isbn)
 assert.equal(actual.writtenReviewCount,1);assert.equal(actual.oneLineReviewCount,9);assert.equal(needsShelfQualityReview(actual),false)
})
test('리뷰 0건은 검수 후보이며 누락·조회 실패를 0건으로 해석하지 않는다',()=>{
 const unrated=parseYes24ShelfQuality(html('0','0','0'),url,isbn)
 assert.equal(unrated.rating,null);assert.equal(unrated.reviewCount,0);assert.equal(needsShelfQualityReview(unrated),true)
 const r=parseYes24ShelfQuality('<th>ISBN13</th><td>'+isbn+'</td>',url,isbn)
 assert.equal(r.rating,null);assert.equal(r.reviewCount,null);assert.equal(r.salesIndex,null);assert.equal(needsShelfQualityReview(r),false)
 assert.equal(needsShelfQualityReview({verified:false,reviewCount:0,rating:null}),false)
 assert.equal(needsShelfQualityReview(parseYes24ShelfQuality(html('9.8','1','216'),url,isbn)),false)
})
test('리뷰 0건도 초벌 후보로 전달하며 DB 변경은 수행하지 않는다',async()=>{
 const report=await auditShelfQuality([{id:1,content_id:'a',isbn}],async()=>({verified:true,isbn,rating:null,reviewCount:0,salesIndex:200}))
 assert.equal(report.review.length,1);assert.equal(report.review[0].reviewCount,0);assert.equal(report.review[0].rating,null)
})

test('ISBN이 같아도 카탈로그와 다른 제목이면 평점과 무관하게 검수 후보로 남긴다',async()=>{
 const rows=[{id:1,content_id:'literature',isbn:'9788979140019',title:'상허 이태준 문학연구'}]
 const report=await auditShelfQuality(rows,async()=>({verified:true,isbn:'9788979140019',title:'파워업! 한글 파워포인트 97',rating:9.8,reviewCount:100,reviewSignals:[]}))
 assert.equal(report.review.length,1)
 assert.deepEqual(report.review[0].reviewSignals,['catalog_title_mismatch'])
 assert.deepEqual(report.review[0].catalogTitles,['상허 이태준 문학연구'])
 assert.equal(rows[0].title,'상허 이태준 문학연구')
})

test('제목의 부제·띄어쓰기 차이나 조회 실패만으로 서명 충돌을 확정하지 않는다',async()=>{
 const rows=[{id:1,content_id:'book',isbn,title:'상앙: 이목지신을 지킨 아이언 맨'}]
 const result={verified:true,isbn,title:'상앙',rating:9.8,reviewCount:100,reviewSignals:[]}
 assert.equal((await auditShelfQuality(rows,async()=>result)).review.length,0)
 assert.equal((await auditShelfQuality(rows,async()=>({...result,title:'상앙, 이목지신을 지킨 아이언맨'}))).review.length,0)
 const missing=await auditShelfQuality(rows,async()=>({verified:false,error:'HTTP 404'}))
 assert.equal(missing.review.length,0);assert.deepEqual(missing.results[0].reviewSignals,[])
})
test('실제 무리뷰 화면의 첫번째 리뷰어 안내는 0건으로 읽는다',()=>{
 const empty='<span class="gd_reviewCount"><a href="javascript:void(0);" onclick="fnFirstReview();">첫번째 리뷰어가 되어주세요.</a></span>'
 const page=html().replace('<span class="gd_reviewCount moreRating"><em>1</em></span>',empty)
 const result=parseYes24ShelfQuality(page,url,isbn)
 assert.equal(result.reviewCount,0);assert.equal(needsShelfQualityReview(result),true)
 const absent=html().replace('<span class="gd_reviewCount moreRating"><em>1</em></span>','')+empty
 assert.equal(parseYes24ShelfQuality(absent,url,isbn).reviewCount,null)
})
test('다른 추천 상품의 평점을 현재 상품 정보 밖에서 가져오지 않는다',()=>{
 const page=html().replace('<span id="spanGdRating"><em class="yes_b">2.0</em></span>','')+'<span id="spanGdRating"><em class="yes_b">1.0</em></span>'
 assert.equal(parseYes24ShelfQuality(page,url,isbn).rating,null)
 assert.equal(parseYes24ShelfQuality('<th>ISBN13</th><td>'+isbn+'</td><span id="spanGdRating"><em class="yes_b">1.0</em></span>',url,isbn).rating,null)
})
test('점수가 높아도 현재 상품의 출판사 소개가 축역본이면 판본 검수 후보가 된다',()=>{
 const page=html('9.8','10','500')+'<div id="infoset_pubReivew"><textarea>세계문학 축역본의 정본 컬렉션 제40권</textarea></div>'
 assert.equal(parseYes24ShelfQuality(page,url,isbn).policyReason,'abridged')
 assert.equal(parseYes24ShelfQuality(html()+'<div id="userReview"><textarea>세계문학 축역본의 정본</textarea></div>',url,isbn).policyReason,null)
})
test('어린이 분류는 높은 평점과 별개로 LLM 검수 후보에 전달한다',()=>{
 const page=html('9.8','120','4000')+'<div id="infoset_goodsCate">국내도서 &gt; 어린이 &gt; 인물이야기</div><div id="infoset_introduce">어린이를 위한 만화 위인전</div><div id="infoset_reivew">사용자 리뷰</div>'
 const r=parseYes24ShelfQuality(page,url,isbn)
 assert.deepEqual(r.reviewSignals,['children_category']);assert.equal(needsShelfQualityReview(r),true)
 assert.equal(r.policyReason,null)
 const recommendation=html('9.8','120','4000')+'<div id="recommendedGoods">국내도서 &gt; 어린이 &gt; 인물이야기</div>'
 assert.deepEqual(parseYes24ShelfQuality(recommendation,url,isbn).reviewSignals,[])
 assert.equal(parseYes24ShelfQuality(page,url,'9788934971016').verified,false)
})
test('현재 출판사 소개의 본문을 읽고 다른 구획의 발췌본 안내는 섞지 않는다',()=>{
 const page=html('9.8','10','500')+'<div id="infoset_introduce">정상 완역본</div><div id="infoset_reivew"><textarea>세계문학 축역본의 정본</textarea></div>'
 assert.equal(parseYes24ShelfQuality(page,url,isbn).policyReason,null)
 assert.equal(parseYes24ShelfQuality(html()+'<div id="infoset_pubReivew">세계문학 축역본의 정본</div>',url,isbn).policyReason,'abridged')
})
test('ISBN 검색의 다른 결과와 전자책은 물리 판본으로 대체하지 않는다',async()=>{
 let requests=0
 const loader=createYes24ShelfQualityLoader('test',async()=>{requests++;return new Response(JSON.stringify({success:true,data:{items:[{isbn13:'9788934971016',goodsType:'도서'},{isbn13:isbn,goodsType:'eBook'}]}}),{status:200})})
 const r=await loader({isbn});assert.equal(r.error,'isbn_not_found');assert.equal(requests,1)
})
test('여러 작품이 공유하는 ISBN은 한 번 조회하고 모든 소유자를 보존한다',async()=>{
 let calls=0
 const report=await auditShelfQuality([{id:1,content_id:'a',isbn},{id:2,content_id:'b',isbn}],async()=>{calls++;return {verified:true,isbn,rating:2,reviewCount:1,salesIndex:216}})
 assert.equal(calls,1);assert.equal(report.total,1);assert.deepEqual(report.review[0].contentIds,['a','b'])
})
test('조회 실패는 미확인으로 집계하며 정상 검수로 보고하지 않는다',async()=>{
 const r=await auditShelfQuality([{id:1,content_id:'a',isbn}],async()=>({verified:false,error:'HTTP 429'}))
 assert.equal(r.verified,0);assert.equal(r.unconfirmed,1);assert.deepEqual(r.errors,{'HTTP 429':1})
})
test('일일 할당량 소진은 재시도·후속 API 호출을 멈추고 전수 완료로 보고하지 않는다',async()=>{
 let calls=0
 const loader=createYes24ShelfQualityLoader('test',async()=>{calls++;return new Response('',{status:429,headers:{'x-ratelimit-remaining-day':'0','x-ratelimit-reset-day':'1791558000'}})})
 await assert.rejects(loader({isbn}),error=>error.code===YES24_DAILY_QUOTA_EXHAUSTED)
 await assert.rejects(loader({isbn:'9788934971016'}),error=>error.code===YES24_DAILY_QUOTA_EXHAUSTED)
 assert.equal(calls,1)
 let auditCalls=0
 const report=await auditShelfQuality(Array.from({length:20},(_,i)=>({id:i,isbn:String(i)})),async()=>{auditCalls++;throw Object.assign(Error('quota'),{code:YES24_DAILY_QUOTA_EXHAUSTED})})
 assert.equal(report.stopped.reason,YES24_DAILY_QUOTA_EXHAUSTED);assert.equal(report.checked,0);assert.equal(report.unconfirmed,0)
 assert.ok(auditCalls<=SHELF_QUALITY_AUDIT.concurrency)
})
test('재개 위치 이전 ISBN은 다시 조회하지 않는다',async()=>{
 const calls=[]
 const r=await auditShelfQuality([{id:1,isbn:'a'},{id:2,isbn:'b'},{id:3,isbn:'c'}],async row=>{calls.push(row.isbn);return {verified:true,rating:null}},()=>{},1)
 assert.deepEqual(calls,['b','c']);assert.equal(r.checked,2);assert.equal(r.offset,1)
})

test('같은 우선순위의 ISBN 재개 순서는 DB 반환 순서가 바뀌어도 같다',async()=>{
 const rows=[{id:2,isbn:'b'},{id:1,isbn:'a'},{id:3,isbn:'c'}],calls=[]
 await auditShelfQuality(rows,async row=>{calls.push(row.isbn);return {verified:true,rating:null}},()=>{},1)
 assert.deepEqual(calls,['b','c'])
})
test('공급자 일시 오류는 재시도하고 확정 404는 미확인으로 남긴다',async()=>{
 let attempts=0;const retry=createYes24ShelfQualityLoader('test',async()=>++attempts===1?new Response('',{status:500}):new Response(JSON.stringify({success:true,data:{items:[]}}),{status:200}))
 assert.equal((await retry({isbn})).error,'isbn_not_found');assert.equal(attempts,2)
 let missingCalls=0;const missing=createYes24ShelfQualityLoader('test',async()=>{missingCalls++;return new Response('',{status:404})})
 assert.equal((await missing({isbn})).error,'HTTP 404');assert.equal(missingCalls,1)
})
