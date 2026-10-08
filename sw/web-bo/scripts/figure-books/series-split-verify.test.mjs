import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyRepairs,verifyCurrentCatalog} from './series-split-verify.mjs'
const isbn='9788937432118'

test('위키데이터의 작품 표제와 중간 권의 잘못된 완본 범위를 실재 판본으로 통과시키지 않는다',()=>{
 const catalog={contents:[{id:'work',figureBook:{series:{title:'작품',creator:'작가',locale:'ko',sourceUrl:'https://publisher.example/series'}}}],
  editions:[{id:1,content_id:'work',locale:'en',title:'Work',isbn:null,sources:{primary:'wikidata'}},
   {id:2,content_id:'work',locale:'ko',title:'작품 41',creator:'작가',publisher:'출판사',isbn,edition_kind:'full',text_scope:'complete',sources:{primary:'kakao_book'}}],relations:[],readings:[]}
 assert.equal(verifyCurrentCatalog(catalog).errors.length,2)
 catalog.editions[0].sources.primary='openlibrary'
 catalog.editions[1].edition_kind='volume';catalog.editions[1].text_scope='volume/41'
 assert.deepEqual(verifyCurrentCatalog(catalog).errors,[])
})
test('DB JSON 객체의 키 순서만 달라져도 같은 검수 메타로 인정한다',()=>{
 const report={candidates:[],variantCorrections:[{contentId:'work',sourceUrl:'https://publisher.example/book',figureBook:{series:{title:'Series',creator:'Author',locale:'ko'}}}]}
 const catalog={contents:[{id:'work',figureBook:{series:{locale:'ko',creator:'Author',title:'Series'}}}],editions:[],locales:[],relations:[],readings:[]}
 assert.deepEqual(verifyRepairs(report,catalog).errors,[])
 catalog.contents[0].figureBook.series.creator='Other';assert.equal(verifyRepairs(report,catalog).errors[0].error,'원작 메타 교정 변경')
})
test('잘못 변환한 ISBN 교정은 작품 통합 뒤에도 판본 ID와 실제 ISBN으로 검사한다',()=>{
 const report={candidates:[{contentIds:['keep','drop'],works:[],repair:{completed:true,keep:'keep',mergedContentIds:['drop']}}],isbnCorrections:[{contentId:'drop',editionId:1,fromIsbn:'9781127238255',toIsbn:'9791127238254',sourceUrl:'https://search.daum.net/book'}]}
 const catalog={contents:[{id:'keep'}],editions:[{id:1,content_id:'keep',isbn:'9791127238254'}],locales:[],relations:[],readings:[]}
 assert.deepEqual(verifyRepairs(report,catalog).errors,[])
 catalog.editions[0].isbn='9781127238255';assert.equal(verifyRepairs(report,catalog).errors[0].error,'ISBN 교정 값·기존 오등록 잔존')
})
test('언어 교정한 판본과 ISBN 없는 표시 카드를 재검증하고 캐시에 포함한다',()=>{
 const report={candidates:[],variantCorrections:[{contentId:'work',sourceUrl:'https://publisher.example/book',figureBook:{workTitle:'Original'},editions:[{id:1,isbn,locale:'en',text_scope:'volume/1'}],cards:[{locale:'ko',title:'표시 제목',isbn:null}]}]}
 const catalog={contents:[{id:'work',figureBook:{workTitle:'Original'}}],editions:[{id:1,content_id:'work',isbn,locale:'en',text_scope:'volume/1'}],locales:[{content_id:'work',locale:'ko',title:'표시 제목',isbn:null}],relations:[],readings:[{content_id:'work',celeb_id:'person'}]}
 const result=verifyRepairs(report,catalog);assert.deepEqual(result.errors,[]);assert.deepEqual(result.affectedIds,['work']);assert.deepEqual(result.affectedPeople,['person']);assert.deepEqual(result.isbns,[isbn])
 catalog.editions[0].locale='ko';assert.equal(verifyRepairs(report,catalog).errors[0].error,'판본 언어·범위 교정 변경')
 catalog.editions[0].locale='en';catalog.locales[0].isbn=isbn;assert.equal(verifyRepairs(report,catalog).errors[0].error,'대표 제목·ISBN 교정 변경')
 catalog.locales[0].isbn=null;catalog.contents[0].figureBook.workTitle='Wrong';assert.equal(verifyRepairs(report,catalog).errors[0].error,'원작 메타 교정 변경')
})
function fixture(){return {report:{candidates:[{contentIds:['keep','drop'],sourceReview:{verdict:'same_original_confirmed'},works:[{isbns:[isbn],personIds:['person'],editions:[{editionId:1,locale:'ko',isbn,title:'Book'}]}],repair:{completed:true,keep:'keep',mergedContentIds:['drop']}}]},catalog:{contents:[{id:'keep'}],locales:[{content_id:'keep',locale:'ko',isbn,title:'Display Title'}],editions:[{id:1,content_id:'keep',locale:'ko',isbn,title:'Book'}],relations:[{content_id:'keep',celeb_id:'person'}],readings:[]}}}
test('표시 카드 제목과 실제 판본 제목을 구별해 판본 ID·ISBN·인물 관계를 검증한다',()=>{
 const {report,catalog}=fixture();assert.deepEqual(verifyRepairs(report,catalog).errors,[])
 catalog.editions[0].title='Wrong';assert.equal(verifyRepairs(report,catalog).errors[0].error,'보존 판본 제목·ISBN 변경')
 catalog.editions[0].title='Book';catalog.relations=[];assert.equal(verifyRepairs(report,catalog).errors[0].error,'인물 관계 소실')
 catalog.relations=[{content_id:'keep',celeb_id:'person'}];catalog.contents.push({id:'drop'});assert.equal(verifyRepairs(report,catalog).errors[0].error,'중복 작품 잔존')
})
test('동일 ISBN 판본 통합은 허용하되 ISBN·동등 판본 소실은 검증 오류다',()=>{
 const {report,catalog}=fixture();catalog.editions[0].id=2;assert.deepEqual(verifyRepairs(report,catalog).errors,[])
 catalog.editions=[];catalog.locales=[];assert.equal(verifyRepairs(report,catalog).errors.length,2)
})
test('오귀속으로 옮긴 판본도 실제 새 소유 작품의 ID·ISBN·제목을 검사한다',()=>{
 const {report,catalog}=fixture();report.candidates[0].works[0].id='drop'
 report.attributionCorrections=[{contentId:'drop',isbn,correctContentId:'actual',sourceUrl:'https://publisher.example/book'}]
 catalog.contents.push({id:'actual'});catalog.editions[0].content_id='actual';catalog.locales=[]
 const result=verifyRepairs(report,catalog);assert.deepEqual(result.errors,[]);assert.ok(result.affectedIds.includes('actual'))
 catalog.editions[0].title='Wrong';assert.ok(verifyRepairs(report,catalog).errors.some(e=>e.error==='보존 판본 제목·ISBN 변경'))
 catalog.editions=[];assert.equal(verifyRepairs(report,catalog).errors.length,3)
})
test('통합하지 않은 독립 오귀속 교정도 ISBN 재등장·실제 원작 소실을 검사하고 캐시에 포함한다',()=>{
 const report={candidates:[],attributionCorrections:[{contentId:'original',correctContentId:'actual',isbn,sourceUrl:'https://publisher.example/book'}]}
 const catalog={contents:[{id:'original'},{id:'actual'}],locales:[],editions:[{id:1,content_id:'actual',isbn}],relations:[],readings:[{content_id:'original',celeb_id:'person'}]}
 const result=verifyRepairs(report,catalog);assert.deepEqual(result.errors,[]);assert.deepEqual(result.affectedIds,['original','actual']);assert.deepEqual(result.affectedPeople,['person']);assert.deepEqual(result.isbns,[isbn])
 catalog.locales.push({content_id:'original',isbn});assert.equal(verifyRepairs(report,catalog).errors[0].error,'오귀속 ISBN 잔존')
 catalog.locales=[];catalog.editions=[];assert.equal(verifyRepairs(report,catalog).errors[0].error,'독립 오귀속 실제 ISBN 소실')
})
test('검수한 합본도 현재 저자·범위가 바뀌면 오류로 되돌리고 모든 원작 캐시를 갱신한다',()=>{
 const ids=['first','second'],contents=ids.map(id=>({id,figureBook:{workTitle:id,workCreator:'Author',workIdentity:'author/'+id}}))
 const contained=contents.map(w=>({content_id:w.id,title:w.id,creator:'Author',work_identity:w.figureBook.workIdentity,text_scope:'works/'+w.id}))
 const editions=contents.map(w=>({content_id:w.id,locale:'en',title:'Collected Works',creator:'Author',isbn,edition_kind:'selection',text_scope:'works/'+w.id,sources:{edition_work_evidence:[{method:'independent_omnibus_review',content_id:w.id,locale:'en',isbn,edition_title:'Collected Works',edition_creator:'Author',original_title:w.id,original_creator:'Author',work_identity:w.figureBook.workIdentity,edition_kind:'selection',text_scope:'works/'+w.id,source_url:'https://publisher.example/toc',toc_source_url:'https://publisher.example/toc',reviewed_at:'2026-10-07T00:00:00Z',owner_content_ids:ids,contained_originals:contained}]}}))
 const report={candidates:[],omnibusReviews:[{contentIds:ids,isbn,sourceUrl:'https://publisher.example/toc'}]},catalog={contents,editions,locales:[],readings:[],relations:[{content_id:'second',celeb_id:'person'}]}
 const result=verifyRepairs(report,catalog);assert.deepEqual(result.errors,[]);assert.deepEqual(result.affectedIds,ids);assert.deepEqual(result.affectedPeople,['person'])
 editions[0].text_scope='wrong';assert.equal(verifyRepairs(report,catalog).errors[0].error,'합본의 현재 원작·수록 범위 근거 불일치')
 editions[0].text_scope='works/first';contents[1].figureBook.workCreator='Editor';assert.equal(verifyRepairs(report,catalog).errors.length,1)
})

test('독립 저작 복원 뒤 시리즈 메타 재등장과 다른 권 인물의 잔존을 검출한다',()=>{
 const report={candidates:[],variantCorrections:[{contentId:'work',sourceUrl:'https://publisher.example/book',forbiddenFigureBookFields:['series'],personIds:['author'],forbiddenPersonIds:['other']}]}
 const catalog={contents:[{id:'work',figureBook:{}}],editions:[],locales:[],readings:[],relations:[{content_id:'work',celeb_id:'author'}]}
 assert.deepEqual(verifyRepairs(report,catalog).errors,[])
 catalog.contents[0].figureBook.series={title:'Wrong'};assert.ok(verifyRepairs(report,catalog).errors.some(e=>e.error==='제거한 원작 메타 잔존'))
 delete catalog.contents[0].figureBook.series;catalog.relations.push({content_id:'work',celeb_id:'other'});assert.ok(verifyRepairs(report,catalog).errors.some(e=>e.error==='다른 독립 저작의 인물 관계 잔존'))
 catalog.relations=[];assert.ok(verifyRepairs(report,catalog).errors.some(e=>e.error==='복원한 인물 관계 소실'))
})

test('현재 DB 검증은 원장 없이 판본의 실제 원작·범위와 저장된 독립 근거를 비교한다',()=>{
 const proof={method:'independent_work_review',content_id:'keep',locale:'en',isbn:'9780307719546',edition_title:'The Present',edition_creator:'Spencer Johnson',edition_kind:'full',text_scope:'complete',original_title:'The Present',original_creator:'Spencer Johnson',work_identity:'spencer/the-present',source_url:'https://publisher.example/present'}
 const catalog={contents:[{id:'keep',figureBook:{workTitle:proof.original_title,workCreator:proof.original_creator,workIdentity:proof.work_identity}}],editions:[{id:1,content_id:'keep',locale:'en',isbn:proof.isbn,title:proof.edition_title,creator:proof.edition_creator,edition_kind:'full',text_scope:'complete',sources:{edition_work_evidence:[proof]}}],relations:[{content_id:'keep',celeb_id:'reader'}],readings:[]}
 assert.equal(verifyCurrentCatalog(catalog).checkedEditions,1);assert.deepEqual(verifyCurrentCatalog(catalog).errors,[])
 catalog.editions[0].text_scope='volume/1';assert.equal(verifyCurrentCatalog(catalog).errors.length,1)
 catalog.editions[0].text_scope='complete';catalog.editions[0].sources.edition_work_evidence[0].content_id='other';assert.equal(verifyCurrentCatalog(catalog).errors.length,1)
})
test('현재 DB 검증은 메타가 없는 이전 형식 근거를 새 검수 성공으로 세지 않는다',()=>{
 const catalog={contents:[{id:'keep',figureBook:{}}],editions:[{id:1,content_id:'keep',sources:{edition_work_evidence:[{method:'official_exact_title_and_full_author'}]}}],relations:[],readings:[]}
 const result=verifyCurrentCatalog(catalog);assert.equal(result.legacyEvidence,1);assert.equal(result.checkedEditions,0);assert.deepEqual(result.errors,[])
})
