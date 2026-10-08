import test from 'node:test'
import assert from 'node:assert/strict'
import {reviewCandidate,checkOriginalAuthors,officialEdition,officialAuthorKeys,verifiedSeriesSubsets,officialEditionConflicts} from './series-split-source-check.mjs'
const ids=['9780743273565','9780593098240']
function candidate(){return {signals:['same-title'],warnings:[],works:ids.map((isbn,i)=>({id:String(i),isbns:[isbn],titles:['Same Book'],creators:['Author'],referenceCounts:{},identity:'book/'+isbn}))}}
function facts(){return Object.fromEntries(ids.map(isbn=>[isbn,{isbn,title:'Same Book',workKeys:['/works/OL1W'],authorKeys:['/authors/OL1A'],languages:['/languages/eng'],sourceUrl:'https://openlibrary.org/books/OL1M'}]))}

test('같은 출판사의 하루키 독립 수필집 세 권을 번호만으로 한 원작으로 확정하지 않는다',()=>{
 const isbns=['9788976250094','9788976250124','9788976250162'],titles=['무라카미 하루키 수필집 1:코끼리공장의 해피엔드','무라카미 하루키 수필집 2:세라복을입은 연필','무라카미 하루키 수필집 3']
 const c={signals:['numbered-series'],warnings:[],evidence:[{kind:'numbered-series',stem:'무라카미 하루키 수필집'}],works:isbns.map((isbn,i)=>({id:String(i),identity:'book/'+isbn,isbns:[isbn],titles:[titles[i]],creators:['무라카미 하루키'],referenceCounts:{}}))}
 const f=Object.fromEntries(isbns.map((isbn,i)=>[isbn,{isbn,provider:'kakao_book',title:titles[i],authors:['무라카미 하루키'],publisher:'백암',sourceUrl:'https://search.daum.net/book'}]))
 assert.equal(reviewCandidate(c,f).verdict,'needs_continuity_review')
})
test('동일 제목을 가진 별도 작품은 공식 원작·전체 저자 키가 같을 때만 통합 판정한다',()=>{
 assert.equal(reviewCandidate(candidate(),facts()).verdict,'same_original_confirmed')
 const f=facts();f[ids[1]].workKeys=['/works/OL2W'];assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review')
 f[ids[1]].workKeys=['/works/OL1W'];f[ids[1]].authorKeys=['/authors/OL2A'];assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review')
})
test('독립 조사로 확인한 다른 원작을 느슨한 ISBN 메타가 다시 자동 통합 후보로 올리지 않는다',()=>{
 const c=candidate();c.sourceReview={verdict:'different_originals_confirmed',method:'independent_work_review',sources:['https://publisher.example/toc']}
 const result=reviewCandidate(c,facts());assert.equal(result.verdict,'needs_original_or_scope_review');assert.deepEqual(result.sources,c.sourceReview.sources)
})
test('빠진 ISBN과 같은 원작에 잘못 붙은 다른 언어판·다른 제목·합본을 통합하지 않는다',()=>{
 const c=candidate(),f=facts();c.works[0].isbns.push('9780140328721');assert.equal(reviewCandidate(c,f).verdict,'needs_source_review')
 const d=candidate();d.warnings=['collection_or_set'];assert.equal(reviewCandidate(d,f).verdict,'needs_original_or_scope_review')
 const e=candidate();e.works[0].isbns.push('9788937432118');f['9788937432118']={provider:'kakao_book',title:'다른 한국어 책',authors:['다른 저자']};assert.equal(reviewCandidate(e,f).verdict,'needs_source_review')
})
test('공식 판본의 ISBN 체크 숫자와 레코드 키가 틀리면 근거로 쓰지 않는다',()=>{
 assert.equal(officialEdition(ids[0],{details:{key:'/books/OL1M',isbn_13:[ids[1]]}}),null)
 assert.equal(officialEdition(ids[0],{details:{key:'https://other.example/book',isbn_13:[ids[0]]}}),null)
})
test('언어 누락 ISBN은 같은 원작의 확인된 영어판이 함께 있을 때만 후보 근거로 쓴다',()=>{
 const f=facts();f[ids[1]].languages=[]
 assert.equal(reviewCandidate(candidate(),f).verdict,'same_original_confirmed')
 f[ids[0]].languages=[];assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review')
 f[ids[0]].languages=['/languages/eng'];f[ids[1]].languages=['/languages/fre'];assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review')
})
test('판본 저자가 없을 때 원작 저자 키는 원작 제목이 정확히 같을 때만 보완한다',()=>{
 const b={title:'Book',authorKeys:[],workTitle:'Book',workAuthorKeys:['/authors/OL1A']}
 assert.deepEqual(officialAuthorKeys(b),b.workAuthorKeys)
 assert.deepEqual(officialAuthorKeys({...b,workTitle:'Book and Other Stories'}),[])
 assert.deepEqual(officialAuthorKeys({...b,authorKeys:['/authors/OL2A']}),['/authors/OL2A'])
})
test('원작에 실제 있는 한국어 ISBN만 중복 국내 작품에서 통합한다',()=>{
 const c=candidate(),f=facts(),isbn='9788937432118'
 c.signals.push('shared-isbn');c.works[0].isbns.push(isbn);c.works[0].titles.push('국내 제목');c.works[1]={...c.works[1],isbns:[isbn],titles:['국내 제목']}
 f[isbn]={provider:'kakao_book',title:'국내 제목',authors:['Author'],sourceUrl:'https://search.daum.net/book'}
 const proof=reviewCandidate(c,f);assert.equal(proof.verdict,'same_original_confirmed');assert.equal(proof.preferredKeep,c.works[0].id)
 c.works[1].isbns.push('9788937444869');f['9788937444869']={...f[isbn],title:'국내 제목'}
 assert.equal(reviewCandidate(c,f).verdict,'needs_source_review')
 c.works[1].isbns=[isbn];c.warnings=['collection_or_set'];assert.equal(reviewCandidate(c,f).verdict,'needs_original_or_scope_review')
})
test('확인된 같은 출판사 연속권만 큰 후보에서 분리하며 누락 ISBN·실독·독립 원작은 제외한다',()=>{
 const isbns=['9788937432118','9788937444869','9788937483943']
 const c={signals:['numbered-series'],warnings:[],sharedPeople:[],evidence:[{kind:'numbered-series',stem:'연속 소설'}],works:isbns.map((isbn,i)=>({id:String(i),identity:i===0?null:'book/'+isbn,isbns:[isbn],titles:['연속 소설 '+(i+1)],creators:['저자'],referenceCounts:{},personIds:[]}))}
 c.contentIds=c.works.map(w=>w.id)
 const f=Object.fromEntries(isbns.map((isbn,i)=>[isbn,{isbn,provider:'kakao_book',title:'연속 소설 '+(i+1),authors:['저자'],publisher:i===2?'다른 출판사':'출판사',sourceUrl:'https://search.daum.net/book'}]))
 const s=verifiedSeriesSubsets(c,f);assert.equal(s.length,1);assert.deepEqual(s[0].contentIds,['0','1']);assert.equal(reviewCandidate(s[0],f).verdict,'needs_continuity_review')
 c.sourceReview={verdict:'different_originals_confirmed',method:'independent_work_review',sources:['https://publisher.example/toc']};assert.deepEqual(verifiedSeriesSubsets(c,f),[]);delete c.sourceReview
 c.works[0].referenceCounts.celeb_contents=1;assert.equal(verifiedSeriesSubsets(c,f).length,0)
 c.works[0].referenceCounts={};delete f[isbns[1]];assert.equal(verifiedSeriesSubsets(c,f).length,0)
 c.warnings=['collection_or_set'];assert.equal(verifiedSeriesSubsets(c,f).length,0)
})
test('교정 후 남은 권은 등록 시리즈의 표제로 다시 찾되 모든 ISBN·저자·출판사를 검수한다',()=>{
 const isbns=['9788937432118','9788937444869'],c={signals:['registered-series'],warnings:[],evidence:[{kind:'registered-series',key:'연속 소설'}],works:isbns.map((isbn,i)=>({id:String(i),identity:'book/'+isbn,isbns:[isbn],titles:['연속 소설 '+(i+1)],creators:['저자'],referenceCounts:{}}))}
 const f=Object.fromEntries(isbns.map((isbn,i)=>[isbn,{isbn,provider:'kakao_book',title:'연속 소설 '+(i+1),authors:['저자'],publisher:'출판사',sourceUrl:'https://search.daum.net/book'}]))
 assert.equal(reviewCandidate(c,f).verdict,'needs_continuity_review')
 f[isbns[1]].authors=['다른 저자'];assert.equal(reviewCandidate(c,f).verdict,'needs_source_review')
 f[isbns[1]].authors=['저자'];c.works[1].referenceCounts.celeb_contents=1;assert.equal(reviewCandidate(c,f).verdict,'needs_source_review')
 c.works[1].referenceCounts={};c.warnings=['collection_or_set'];assert.equal(reviewCandidate(c,f).verdict,'needs_original_or_scope_review')
})
test('등록 시리즈의 명시적 세트도 같은 본문인지는 독립 확인해야 한다',()=>{
 const isbns=['9788937432118','9788937444869'],c={signals:['registered-series'],warnings:['collection_or_set'],evidence:[{kind:'registered-series',key:'연속 소설'}],works:isbns.map((isbn,i)=>({id:String(i),identity:'book/'+isbn,isbns:[isbn],titles:[i?'연속 소설 세트(전3권)':'연속 소설 1'],creators:['저자'],referenceCounts:{}}))}
 const f=Object.fromEntries(isbns.map((isbn,i)=>[isbn,{isbn,provider:'kakao_book',title:c.works[i].titles[0],authors:['저자'],publisher:'출판사',sourceUrl:'https://search.daum.net/book'}]))
 assert.equal(reviewCandidate(c,f).verdict,'needs_continuity_review')
 f[isbns[1]].publisher='다른 출판사';assert.equal(reviewCandidate(c,f).verdict,'needs_original_or_scope_review')
 f[isbns[1]].publisher='출판사';c.works[1].referenceCounts.celeb_contents=1;assert.equal(reviewCandidate(c,f).verdict,'needs_original_or_scope_review')
 c.works[1].referenceCounts={};f[isbns[1]].title='연속 소설과 다른 소설 세트';c.works[1].titles=[f[isbns[1]].title];assert.equal(reviewCandidate(c,f).verdict,'needs_original_or_scope_review')
})

test('Cram101·AIPI 학습 요약서는 공식 work 키가 같아도 독립 원작 확인을 요구한다',()=>{
 const candidate={works:[{isbns:['9781428815889']}],warnings:[],evidence:[]};
 const result=reviewCandidate(candidate,{'9781428815889':{publisher:'AIPI',workKeys:['/works/OL3282045W']}})
 assert.equal(result.verdict,'needs_original_or_scope_review');assert.ok(result.reason.includes('study_guide_publisher_requires_independent_work_review'))
})
test('공식 work 저자 보완은 다른 원작 응답을 받아도 판본의 저자를 확정하지 않는다',async()=>{
 const facts={isbn:{workKeys:['/works/OL1W'],authorKeys:[],title:'The Present'}}
 const errors=await checkOriginalAuthors(facts,async()=>({ok:true,json:async()=>({key:'/works/OL2W',title:'Different',authors:[{author:{key:'/authors/OL3A'}}]})}))
 assert.equal(errors.length,1);assert.equal(facts.isbn.workAuthorKeys,undefined)
})

// 실제 동명 총서·분권 사례에서 같은 OpenLibrary 키는 충분한 통합 근거가 아니다.
test('같은 원작 키·저자라도 서로 다른 부제와 권 구성은 통합하지 않는다',()=>{
 const f=facts(); f[ids[0]].subtitle='Business the Jack Welch Way';f[ids[1]].subtitle='Business the Rupert Murdoch Way';
 assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review');
 f[ids[0]].subtitle='Volume I';f[ids[1]].subtitle='Volume II';assert.equal(reviewCandidate(candidate(),f).verdict,'needs_source_review');
});
test('공식 응답의 중복 저자·저작 키는 같은 식별자로만 정규화한다',()=>{
 const item={details:{key:'/books/OL1M',isbn_13:[ids[0]],authors:[{key:'/authors/OL1A'},{key:'/authors/OL1A'}],works:[{key:'/works/OL1W'},{key:'/works/OL1W'}]}};
 const edition=officialEdition(ids[0],item); assert.deepEqual(edition.authorKeys,['/authors/OL1A']); assert.deepEqual(edition.workKeys,['/works/OL1W']);
});

test('같은 OL 키에 몰린 다른 실제 부제·권을 ID·ISBN·출처와 함께 추적한다',()=>{
 const c=candidate();c.contentIds=['0','1'];c.works.forEach((w,i)=>w.editions=[{id:i,content_id:w.id,isbn:ids[i],title:'Generic Series',locale:'en'}]);
 const f=facts();f[ids[0]].subtitle='Helen Keller';f[ids[1]].subtitle='George Washington Carver';
 const conflicts=officialEditionConflicts({candidates:[c]},f); assert.equal(conflicts.length,1);assert.equal(conflicts[0].editions[1].isbn,ids[1]);
 f[ids[1]].subtitle='Helen Keller';assert.deepEqual(officialEditionConflicts({candidates:[c]},f),[]);
});
