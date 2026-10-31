import assert from 'node:assert/strict';
import test from 'node:test';
import {countClaims,compareBookCounts,parsePublicPost,parseReservedPost,selectPersonPosts,readReservedPayload} from './audit-book-counts.mjs';

const title='축구선수 박지성이 읽은 7권의 책 (Park Ji-sung)';
const snapshot=(paragraphs=["박지성 · 전체 감상 도서 7권 · 이 글에서 2권 소개"])=>({title,paragraphs,source:'public'});

test('예약 조회의 요청 제한은 서버 대기 시간을 지킨 뒤 재시도한다',async()=>{
 const waits=[],responses=[{status:429,retryAfter:'45'},{status:200,payload:{isSuccess:true}}];
 const page={evaluate:async()=>responses.shift()};
 assert.deepEqual(await readReservedPayload(page,'123',{sleep:async ms=>waits.push(ms)}),{isSuccess:true});
 assert.deepEqual(waits,[45000]);
});

test('예약 조회 제한이 계속되면 세 번 뒤 실패하며 0권으로 처리하지 않는다',async()=>{
 let calls=0;const waits=[];
 const page={evaluate:async()=>{calls++;return{status:429,retryAfter:null};}};
 await assert.rejects(readReservedPayload(page,'123',{sleep:async ms=>waits.push(ms)}),/HTTP 429/);
 assert.equal(calls,3);assert.deepEqual(waits,[30000,30000]);
});

test('인증 실패는 요청 제한으로 간주해 반복하지 않는다',async()=>{
 let calls=0;const page={evaluate:async()=>{calls++;return{status:403};}};
 await assert.rejects(readReservedPayload(page,'123',{sleep:async()=>assert.fail('Unexpected retry')}),/HTTP 403/);
 assert.equal(calls,1);
});

test('전체 7권과 소개 2권을 구별하고 나머지 5권 안내를 합산한다',()=>{
 const result=compareBookCounts(snapshot(['박지성 · 7권 중 2권 소개',
  '이 글에서 소개한 2권 외에 5권의 도서 기록은 필앤노트에서 확인할 수 있습니다.']),7,title);
 assert.equal(result.status,'match');assert.deepEqual(result.introduced,[2]);
 assert.ok(result.claims.every(c=>c.count===7));
});

test('제목과 본문 각각의 오래된 권수를 검출한다',()=>{
 const result=compareBookCounts({...snapshot(['박지성 · 도서 기록 2권']),title:title.replace('7권','3권')},7,title);
 assert.equal(result.status,'mismatch');
 assert.deepEqual(result.issues.map(c=>[c.field,c.count,c.expected]),[['title',3,7],['body-total',2,7]]);
});

test('옛 전체 권수 안내와 독서 기록 제목, 천 단위 쉼표를 읽는다',()=>{
 assert.equal(countClaims('미국 시인의 독서 기록: 1,013권의 책',['여기까지가 1,013권 가운데 다섯 권입니다.']).totals.length,2);
 assert.equal(countClaims(title,['여기까지가 7권 가운데 다섯 권입니다.']).totals.at(-1).count,7);
});

test('서재 장서 수와 소설의 분권 수는 서비스 전체 권수로 세지 않는다',()=>{
 const result=compareBookCounts(snapshot(['본가 책장에는 300여 권이 있었다.','총 두 권의 소설 중 첫 권이다.']),7,title);
 assert.equal(result.status,'unverified');assert.deepEqual(result.missing,['body-total-not-found']);
 assert.equal(result.issues.length,0);
});

test('실제 글이 정상이어도 관리 목록의 오래된 권수를 별도로 검출한다',()=>{
 const result=compareBookCounts(snapshot(),7,title.replace('7권','2권'));
 assert.equal(result.status,'match');assert.deepEqual(result.recordedTitleCounts,[2]);
});

test('도서가 실제로 0권인 경우와 조회 실패를 구별한다',()=>{
 assert.equal(compareBookCounts(snapshot(),0,title).status,'mismatch');
 assert.throws(()=>compareBookCounts(snapshot(),undefined,title),/Verified service count/);
 assert.throws(()=>parsePublicPost('<html>비공개 글</html>','123'),/identity/);
});

test('공개 글의 글번호·본문·엔티티를 확인한다',()=>{
 const html=`<meta property="og:url" content="https://m.blog.naver.com/dmx777/123">
 <div class="se-main-container"><div class="se-documentTitle"><p class="se-text-paragraph">${title}</p></div>
 <p class="se-text-paragraph">박지성 &amp; 독서 · 7권 중 2권 소개</p></div>`;
 const parsed=parsePublicPost(html,'123');assert.equal(parsed.title,title);
 assert.equal(parsed.paragraphs[0],'박지성 & 독서 · 7권 중 2권 소개');
 assert.equal(compareBookCounts(parsed,7,title).status,'match');
 const desktop=html.replace('https://m.blog.naver.com/dmx777/123','https://blog.naver.com/PostView.naver?blogId=dmx777&amp;logNo=123');
 assert.equal(parsePublicPost(desktop,'123').title,title);
 assert.throws(()=>parsePublicPost(html,'456'),/identity differs/);
});

const paragraph=text=>({'@ctype':'paragraph',nodes:[{'@ctype':'textNode',value:text}]});
function reserved(){return{isSuccess:true,result:{prePostFormView:{postFormMeta:{logNo:123}},documentModel:JSON.stringify({
 documentId:'123',document:{components:[{'@ctype':'documentTitle',title:[paragraph(title)]},
  {'@ctype':'text',value:[paragraph('박지성 · 7권 중 2권 소개')]}]}})}};}

test('예약 글은 현재 예약 목록 제목과 저장된 문서·글번호를 모두 대조한다',()=>{
 const parsed=parseReservedPost(reserved(),'123',title);
 assert.equal(parsed.source,'reserved');assert.equal(compareBookCounts(parsed,7,title).status,'match');
 assert.throws(()=>parseReservedPost(reserved(),'456',title),/identity differs/);
 assert.throws(()=>parseReservedPost(reserved(),'123','다른 제목'),/title differ/);
 assert.throws(()=>parseReservedPost({isSuccess:false},'123',title),/read failed/);
});

test('예약 표시에 의존하지 않고 발행·예약 인물 글을 선택하며 폐기·기관 글은 제외한다',()=>{
 const row={kind:'celeb',logNo:'123',slug:'park-ji-sung',title,link:'ok'};
 const selected=selectPersonPosts([row,{...row,logNo:'456',link:'check'},
  {...row,logNo:'789',link:'deleted'},{...row,logNo:'999',kind:'curated'}]);
 assert.deepEqual(selected.map(r=>r.logNo),['123','456']);
 assert.equal(selectPersonPosts([{...row,slug:null,url:'https://feelandnote.com/celeb/park-ji-sung'}])[0].slug,'park-ji-sung');
 assert.throws(()=>selectPersonPosts([row,{...row}]),/duplicate/);
 assert.throws(()=>selectPersonPosts([{...row,url:'https://feelandnote.com/celeb/other'}]),/Exact service/);
});
