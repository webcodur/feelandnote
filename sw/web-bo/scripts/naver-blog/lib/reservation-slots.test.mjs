import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReservationSlots } from './reservation-slots.mjs';
const dates = slots => slots.map(slot => new Date(slot.getTime() + 9 * 3600000).toISOString().slice(0, 10));
test('가까운 빈 날짜를 쓰고 다른 시간의 예약도 피해 간다', () => {
  const slots = buildReservationSlots({ count: 3, start: '2026-10-04', time: '09:00', now: Date.parse('2026-10-04T18:00:00+09:00'), occupied: ['2026. 10. 07 20:00', '2027. 02. 21 09:00'] });
  assert.deepEqual(dates(slots), ['2026-10-05', '2026-10-06', '2026-10-08']);
});
test('한국 날짜가 바뀐 직후에도 오늘의 미래 시각을 배정한다', () => {
  assert.deepEqual(dates(buildReservationSlots({ count: 1, start: '2026-10-05', time: '09:00', now: Date.parse('2026-10-05T00:01:00+09:00') })), ['2026-10-05']);
});
test('명시한 요일에도 기존 예약을 건너뛴다', () => {
  assert.deepEqual(dates(buildReservationSlots({ count: 1, start: '2026-10-04', time: '09:00', now: Date.parse('2026-10-04T00:00:00+09:00'), dows: [7], occupied: ['2026.10.04 09:00'] })), ['2026-10-11']);
});
test('잘못된 날짜와 시각을 거부한다', () => {
  for (const extra of [{ start: '2026-02-30' }, { time: '24:00' }, { time: '09:05' }, { dows: [0] }]) {
    assert.throws(() => buildReservationSlots({ count: 1, start: '2026-10-04', time: '09:00', ...extra }));
  }
});
