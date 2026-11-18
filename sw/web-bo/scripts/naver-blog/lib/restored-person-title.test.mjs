import test from 'node:test';import assert from 'node:assert/strict';import {restoredPersonTitle} from './restored-person-title.mjs';
test('기존 대표작·직함을 살리고 실제 전체 권수와 영문 이름을 맞춘다',()=>{
 const person={nickname:'쿠엔틴 타란티노',nickname_en:'Quentin Tarantino',title:'펄프 픽션 감독'};
 const old='『펄프 픽션』 감독 쿠엔틴 타란티노가 읽은 11권의 책 (Quentin Tarantino)',title='『펄프 픽션』 감독 쿠엔틴 타란티노의 추천도서·읽은 책 11권 (Quentin Tarantino)';
 assert.equal(restoredPersonTitle(old,person,11),title);
 assert.equal(restoredPersonTitle(title,person,12),title.replace('11권','12권'));
 assert.equal(restoredPersonTitle('구글 전 CEO, 에릭 슈미트가 직접 추천한 책 7권 (Eric Schmidt)',{nickname:'에릭 슈미트',nickname_en:'Eric Schmidt'},32),'구글 전 CEO, 에릭 슈미트의 추천도서·읽은 책 32권 (Eric Schmidt)');
 assert.throws(()=>restoredPersonTitle(title,person,0));
});
