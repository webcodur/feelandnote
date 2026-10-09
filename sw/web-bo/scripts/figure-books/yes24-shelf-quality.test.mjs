import test from 'node:test'
import assert from 'node:assert/strict'
import {parseYes24ShelfQuality,needsShelfQualityReview,createYes24ShelfQualityLoader,YES24_DAILY_QUOTA_EXHAUSTED,SHELF_QUALITY_AUDIT} from './lib/yes24-shelf-quality.mjs'
import {auditShelfQuality,shelfQualityAuditKey} from './shelf-quality-audit.mjs'

test('대량 점검은 운영 키로 폴백하지 않고 동일한 키도 거부한다',()=>{
 assert.throws(()=>shelfQualityAuditKey({YES24_API_KEY:'production'},'production'),/YES24_AUDIT_API_KEY required/)
 assert.throws(()=>shelfQualityAuditKey({YES24_AUDIT_API_KEY:'production'},'production'),/must differ/)
 assert.throws(()=>shelfQualityAuditKey({YES24_AUDIT_API_KEY:'inherited',YES24_API_KEY:'inherited'},'production'),/must differ/)
 assert.equal(shelfQualityAuditKey({YES24_AUDIT_API_KEY:'audit'},'production'),'audit')
})
const isbn='9791130321561',url='https://www.yes24.com/product/goods/161408465'
const html=(rating='2.0',count='1',sales='216')=>'<h2 class="gd_name">실제 책</h2><div class="gd_infoTop"><span id="spanGdRating"><em class="yes_b">'+rating+'</em></span><span class="gd_reviewCount moreRating"><em>'+count+'</em></span><span class="gd_sellNum">판매지수 '+sales+'</span></div><div class="gd_infoBot"></div><th class="txt">ISBN13</th><td class="txt lastCol">'+isbn+'</td>'
test('같은 ISBN 상품의 평점·리뷰 수·판매지수를 읽는다',()=>{
 const r=parseYes24ShelfQuality(html(),url,isbn)
 assert.equal(r.verified,true);assert.equal(r.rating,2);assert.equal(r.reviewCount,1);assert.equal(r.salesIndex,216);assert.equal(needsShelfQualityReview(r),true)
 assert.equal(parseYes24ShelfQuality(html('9.8','1,230','12,300'),url,isbn).salesIndex,12300)
})
test('다른 ISBN의 평점으로 현재 책을 폐기 후보로 만들지 않는다',()=>{
 const r=parseYes24ShelfQuality(html(),url,'9788934971016');assert.equal(r.verified,false);assert.equal(needsShelfQualityReview(r),false)
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
