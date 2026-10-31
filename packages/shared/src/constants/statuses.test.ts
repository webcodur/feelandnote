import assert from 'node:assert/strict'
import test from 'node:test'
import { STATUS_OPTIONS, CELEB_STATUS_OPTIONS, isContentStatus, statusAfterReview } from './statuses'

test('회원과 셀럽은 감상함·감상 안함 두 상태만 사용한다', () => {
  assert.deepEqual(STATUS_OPTIONS.map(({ value, label }) => ({ value, label })), [
    { value: 'WANT', label: '감상 안함' }, { value: 'FINISHED', label: '감상함' },
  ])
  assert.equal(CELEB_STATUS_OPTIONS, STATUS_OPTIONS)
  for (const value of ['WATCHING', 'DROPPED', 'RECOMMENDED', 'NOT_RECOMMENDED', '', null]) {
    assert.equal(isContentStatus(value), false)
  }
})

test('리뷰 없이 감상함을 선택할 수 있고 감상을 지워도 상태를 보존한다', () => {
  assert.equal(statusAfterReview('FINISHED', { rating: null, review: '', reviewPresets: [] }), 'FINISHED')
  assert.equal(statusAfterReview('WANT', { rating: 0, review: '  ', reviewPresets: [' '] }), 'WANT')
})

test('별점·감상문·짧은 반응을 남긴 기록은 감상함으로 전환한다', () => {
  assert.equal(statusAfterReview('WANT', { rating: 0.5 }), 'FINISHED')
  assert.equal(statusAfterReview('WANT', { review: '감상문' }), 'FINISHED')
  assert.equal(statusAfterReview('WANT', { reviewPresets: ['지루해요'] }), 'FINISHED')
})
