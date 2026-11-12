import test from 'node:test';import assert from 'node:assert/strict';
import {contractedCopula,expandCopula,firstSentence} from './plain-style.mjs';
test('flags a noun with a bare 다 and leaves normal endings alone',()=>{
 for(const s of ['경영 안내서다.','아버지의 삶을 기록한 전기다.','관계를 탐구한 이야기다.'])assert.equal(contractedCopula(s),true,s);
 for(const s of ['철학서이다.','철학서.','소설이 아니다.','고전으로 유명하다.','시대를 다룬다.','방식이 다르다.','두 권으로 나뉘었다.'])assert.equal(contractedCopula(s),false,s);
 assert.equal(expandCopula('경영 안내서다.'),'경영 안내서이다.');
 assert.equal(firstSentence('첫 문장이다. 둘째 문장이다.'),'첫 문장이다.');
});
