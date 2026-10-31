import assert from 'node:assert/strict';
import test from 'node:test';
import {libraryFunnel} from './unified-library-funnel.mjs';

test('전체 감상 7권과 블로그 소개 2권을 명시적으로 구분한다',()=>{
 const result=libraryFunnel({kind:'celeb',libraryFunnel:true,subject:{name:'박지성'},selection:{totalServiceBooks:7},books:[{},{}]});
 assert.equal(result.heading,'박지성 · 전체 감상 도서 7권 · 이 글에서 2권 소개');
 assert.ok(result.footer.includes('5권'));
});

test('모두 소개한 글도 전체 권수를 표시하며 잘못된 총권수를 거부한다',()=>{
 const material={kind:'celeb',libraryFunnel:true,subject:{name:'인물'},selection:{totalServiceBooks:2},books:[{},{}]};
 assert.equal(libraryFunnel(material).heading,'인물 · 전체 감상 도서 2권');
 material.selection.totalServiceBooks=1;
 assert.throws(()=>libraryFunnel(material),/count/);
});
