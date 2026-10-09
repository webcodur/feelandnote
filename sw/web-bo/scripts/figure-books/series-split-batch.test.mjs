import test from 'node:test'
import assert from 'node:assert/strict'
import {validateOriginalEditions,originalKeepScore,previousIndependentReview,batchCandidateReview} from './series-split-batch.mjs'

test('기계가 같은 원작이라고 판정했어도 독립 출처 검수가 없으면 반영 대상에서 제외한다',()=>{
 for(const method of ['openlibrary_work_review','kakao_isbn_series_review',undefined]) {
  assert.equal(batchCandidateReview({sourceReview:{verdict:'same_original_confirmed',method,sources:['https://publisher.example/book']}},{},true),null)
 }
 assert.equal(batchCandidateReview({},{},true),null)
})

test('LLM이 확인한 원작·시리즈 판정을 기계 매칭 결과로 덮어쓰지 않는다',()=>{
 for(const [verdict,method] of [['same_original_confirmed','independent_work_review'],['same_edition_confirmed','independent_work_review'],['series_split_confirmed','independent_series_review']]) {
  const review={verdict,method,sources:['https://publisher.example/toc'],title:'검수한 원작',preferredKeep:'reviewed-work',editions:{isbn:{title:'실제 판본'}}}
  assert.equal(batchCandidateReview({sourceReview:review},{},true),review)
  for(const sources of [[],[''],['http://publisher.example/toc'],undefined])assert.equal(batchCandidateReview({sourceReview:{...review,sources}},{},true),null)
 }
 assert.equal(batchCandidateReview({sourceReview:{verdict:'different_originals_confirmed',method:'independent_work_review',sources:['https://publisher.example/toc']}},{},true),null)
})
test('현재 판본 전부를 공식 ISBN·원작·저자·언어·제목과 다시 대조한다',()=>{
 const isbn='9780743273565',proof={workKey:'/works/OL1W',authorKeys:['/authors/OL1A']}
const fact={title:'Book',workKeys:[proof.workKey],authorKeys:proof.authorKeys}
 const edition={isbn,title:'Book',creator:'Author',locale:'en'}
 assert.doesNotThrow(()=>validateOriginalEditions([edition],proof,{[isbn]:fact}))
 for(const bad of [{...edition,title:'Other'},{...edition,locale:'ko'},{...edition,isbn:'9780593098240'}])assert.throws(()=>validateOriginalEditions([bad],proof,{[isbn]:fact}))
 assert.throws(()=>validateOriginalEditions([edition],proof,{[isbn]:{...fact,workKeys:['/works/OL2W']}}))
 assert.throws(()=>validateOriginalEditions([edition],proof,{[isbn]:{...fact,authorKeys:['/authors/OL2A']}}))
 assert.throws(()=>validateOriginalEditions([edition,{title:'Other Work',creator:'Other Author',isbn:null,sources:{primary:'kakao_title_search'}}],proof,{[isbn]:fact}))
})

test('원작 메타가 없는 일반 도서도 Remotion 참조 ID를 대표로 보존한다',()=>{
 const referenced={id:'z',metadata:{}},other={id:'a',metadata:{}},candidate={sourceReview:{preferredKeep:'a'}};
 const options={protectedIds:['z'],readings:[{content_id:'a'}]};
 assert.ok(Number.isFinite(originalKeepScore(referenced,candidate,options)));
 assert.ok(Number.isFinite(originalKeepScore(other,candidate,options)));
 assert.ok(originalKeepScore(referenced,candidate,options)>originalKeepScore(other,candidate,options));
 assert.equal([other,referenced].sort((a,b)=>originalKeepScore(b,candidate,options)-originalKeepScore(a,candidate,options)||a.id.localeCompare(b.id))[0].id,'z');
});

test('시 본문 통합 뒤 찾아보기와의 독립 작품 판정을 재탐지 후보에 보존한다',()=>{
 const review={verdict:'different_originals_confirmed',method:'independent_work_review',sources:['https://publisher.example/toc']}
 const candidates=[{contentIds:['poems','volume6','index'],sourceReview:review},{contentIds:['poems','volume6'],repair:{completed:true,keep:'poems',mergedContentIds:['volume6']}}]
 assert.equal(previousIndependentReview({contentIds:['poems','index']},candidates),review)
 assert.equal(previousIndependentReview({contentIds:['poems','other']},candidates),undefined)
})
