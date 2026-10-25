import test from 'node:test';import assert from 'node:assert/strict';
import {isDeferrableBeforeSave} from './unified-writer-failures.mjs';
import {coverGeometryChange} from './unified-cover-preflight.mjs';
test('저장 전 개별 표·사진 검증 오류만 보류하고 저장 후·세션 오류는 중단한다',()=>{
 const f={saved:false,step:'typography',error:'Error: Unified image identity, geometry, alignment or representative differs'};
 assert.equal(isDeferrableBeforeSave(f),true);
 for(const patch of [{saved:true},{saved:undefined},{step:'reopen'},{error:'TimeoutError: editor unavailable'}])assert.equal(isDeferrableBeforeSave({...f,...patch}),false);
});
test('가로형 전집의 표시 크기를 편집 전에 준비하고 일반 표지는 원고를 바꾸지 않는다',()=>{
 const book={coverUrl:'https://example.com/set.jpg'},g={url:book.coverUrl,width:458,height:73,sourceSha256:'a'.repeat(64)};
 assert.deepEqual(coverGeometryChange(book,g),g);
 assert.equal(coverGeometryChange({...book,coverGeometry:g},g),undefined);
 const normal={...g,height:680};assert.equal(coverGeometryChange(book,normal),undefined);
 assert.equal(coverGeometryChange({...book,coverGeometry:g},normal),null);
 assert.throws(()=>coverGeometryChange(book,{...g,height:1}),/panoramic/);
});
