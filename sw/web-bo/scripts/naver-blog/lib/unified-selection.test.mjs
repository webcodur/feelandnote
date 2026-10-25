import test from 'node:test';import assert from 'node:assert/strict';
import {selectionCandidate,assertSelectionReview} from './unified-selection.mjs';
const books=Array.from({length:7},(_,i)=>({content_id:String(i)}));
test('다섯 권 선정은 후보에 속하는 고유 작품만 허용한다',()=>{
 assert.equal(selectionCandidate({selectedContentIds:['0','1','2','3','4']},books).needsReview,false);
 for(const ids of [[],['0','0'],['x'],['0','1','2','3','4','5']])assert.throws(()=>selectionCandidate({selectedContentIds:ids},books));
});
test('적은 권수는 제외 대상 전원에 대한 사유와 별도 검수를 모두 요구한다',()=>{
 const answer={selectedContentIds:['0','1'],reasons:books.slice(2).map(b=>({...b,reason:'실제 감상이 아닌 관련 작품'}))};
 assert.throws(()=>selectionCandidate({...answer,reasons:[]},books));
 const candidate=selectionCandidate(answer,books);assert.equal(candidate.needsReview,true);
 const review={pass:true,noAdditionalEligibleBooks:true,issues:[],selectedContentIds:['0','1'],excludedContentIds:['2','3','4','5','6']};
 assertSelectionReview(candidate,review);
 for(const patch of [{pass:false},{noAdditionalEligibleBooks:false},{issues:['유효한 책이 남음']},{selectedContentIds:['0']},{excludedContentIds:['2']}])assert.throws(()=>assertSelectionReview(candidate,{...review,...patch}));
});
