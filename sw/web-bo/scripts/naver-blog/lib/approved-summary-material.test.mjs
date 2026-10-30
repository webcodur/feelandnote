import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {withApprovedSummaries} from './approved-summary-material.mjs';
const fixture=()=>{const book={content_id:'b',title:'제목',creator:'작가',isbn:'123',description:'원자료',review:'감상 원문',source_url:'https://example.com'},lines=['첫 문장.','둘째 문장.','셋째 문장.','넷째 문장.'];return{material:{books:[book],selection:{method:'existing-reviewed-selection'}},cache:{b:{...book,lines,text:lines.join(' '),sourceHash:'original-input',sourceDescriptionHash:crypto.createHash('sha256').update(JSON.stringify(book.description)).digest('hex'),model:'prepared-model',preparedAt:'today',review:{pass:true,sourceSupported:true,newSummary:true,naturalKorean:true,issues:[]}}}};};
test('승인된 책 요약만 넣고 원본 재료와 감상은 바꾸지 않는다',()=>{const {material,cache}=fixture(),result=withApprovedSummaries(material,cache);assert.equal(material.books[0].introduction,undefined);assert.equal(result.books[0].review,material.books[0].review);assert.equal(result.books[0].introduction,cache.b.text);assert.equal(result.books[0].introductionSource,'agm-agy:b:original-input');});
test('모델이 검수 불리언 대신 배열이나 문자열을 반환하면 승인으로 해석하지 않는다',()=>{
 for(const key of ['pass','sourceSupported','newSummary','naturalKorean'])for(const value of [['요약 문장'],'true',1]){
  const f=fixture();f.cache.b.review[key]=value;assert.throws(()=>withApprovedSummaries(f.material,f.cache));
 }
 const f=fixture();delete f.cache.b.review.issues;assert.throws(()=>withApprovedSummaries(f.material,f.cache));
});
test('작품·소개 원자료·검수 뒤 문장이 바뀌거나 검수에 실패하면 준비 완료로 넘기지 않는다',()=>{for(const mutate of [f=>f.material.books[0].creator='다른 작가',f=>f.material.books[0].description='새 원자료',f=>f.cache.b.review.sourceSupported=false,f=>f.cache.b.text+='수정',f=>f.cache.b.review.issues.push('오류'),f=>f.material.selection.method='pending']){const f=fixture();mutate(f);assert.throws(()=>withApprovedSummaries(f.material,f.cache));}});
