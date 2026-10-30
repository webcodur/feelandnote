import test from 'node:test';import assert from 'node:assert/strict';import {restoredPersonTitle} from './restored-person-title.mjs';
test('기존 대표작·직함을 살리고 실제 전체 권수와 영문 이름을 맞춘다',()=>{
 const person={nickname:'쿠엔틴 타란티노',nickname_en:'Quentin Tarantino',title:'펄프 픽션 감독'};
 const title='『펄프 픽션』 감독 쿠엔틴 타란티노가 읽은 11권의 책 (Quentin Tarantino)';
 assert.equal(restoredPersonTitle(title,person,11),title);
 assert.equal(restoredPersonTitle('구글 전 CEO, 에릭 슈미트가 직접 추천한 책 7권 (Eric Schmidt)',{nickname:'에릭 슈미트',nickname_en:'Eric Schmidt'},32),'구글 전 CEO, 에릭 슈미트가 읽은 32권의 책 (Eric Schmidt)');
 assert.throws(()=>restoredPersonTitle(title,person,0));
});
