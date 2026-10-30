import test from 'node:test';import assert from 'node:assert/strict';import {sameReservation} from './same-reservation.mjs';
test('신규 발행 패널과 예약 목록의 날짜 공백만 다른 경우 같은 예약이다',()=>{
 const expected={row:'게임 유튜버 퓨디파이\n2026. 11. 14 09:00',count:76};
 assert.equal(sameReservation({row:'게임 유튜버 퓨디파이\n2026.11.14 09:00',count:76},expected),true);
 assert.equal(sameReservation({row:'게임 유튜버 퓨디파이\n2026.11.15 09:00',count:76},expected),false);
 assert.equal(sameReservation({row:'다른 제목\n2026.11.14 09:00',count:76},expected),false);
});
test('다른 글의 예약 발행은 허용하되 대상의 제목·예약 시각 변경과 예약 해제는 검출한다',()=>{
 const original={row:'제목\n2026.11.17 09:00',count:76};
 assert.equal(sameReservation({...original,count:75},original),true);
 for(const changed of [null,{...original,row:'제목\n2026.11.17 10:00'},{...original,row:'다른 제목\n2026.11.17 09:00'},{...original,count:0},{...original,count:1,unknown:true}])assert.equal(sameReservation(changed,original),false);
 assert.equal(sameReservation(null,null),true);
});
