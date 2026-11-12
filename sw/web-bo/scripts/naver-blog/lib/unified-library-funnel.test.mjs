import assert from 'node:assert/strict';
import test from 'node:test';
import {libraryFunnel} from './unified-library-funnel.mjs';

test('머리 줄은 이름만 쓰고 전체 감상 7권과 소개 2권은 끝 안내가 구분한다',()=>{
 const result=libraryFunnel({kind:'celeb',libraryFunnel:true,subject:{name:'박지성'},selection:{totalServiceBooks:7},books:[{},{}]});
 assert.equal(result.heading,'박지성');
 assert.ok(result.footer.includes('5권'));
});

test('모두 소개한 글도 이름 머리 줄을 쓰며 잘못된 총권수를 거부한다',()=>{
 const material={kind:'celeb',libraryFunnel:true,subject:{name:'인물'},selection:{totalServiceBooks:2},books:[{},{}]};
 assert.equal(libraryFunnel(material).heading,'인물');
 material.selection.totalServiceBooks=1;
 assert.throws(()=>libraryFunnel(material),/count/);
});
