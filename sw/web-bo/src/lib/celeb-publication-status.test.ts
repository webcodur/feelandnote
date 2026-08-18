import assert from 'node:assert/strict'
import test from 'node:test'
import { nextCelebPublicationStatus, resolveCelebListStatus } from './celeb-publication-status'

test('활성 인물은 아바타 검사 없이 비활성으로 간다', () => {
  assert.equal(nextCelebPublicationStatus('active'), 'inactive')
})

test('비활성 인물만 활성화로 간다', () => {
  assert.equal(nextCelebPublicationStatus('inactive'), 'active')
})

test('빈 상태를 활성화로 떨어뜨리지 않는다', () => {
  assert.throws(() => nextCelebPublicationStatus(undefined), /전환할 수 없습니다/)
  assert.throws(() => nextCelebPublicationStatus(''), /전환할 수 없습니다/)
  assert.throws(() => nextCelebPublicationStatus('suspended'), /전환할 수 없습니다/)
})

test('목록 RPC의 publication_status를 공개 상태로 읽는다', () => {
  assert.equal(resolveCelebListStatus({ publication_status: 'active' }), 'active')
  assert.equal(resolveCelebListStatus({ publication_status: 'inactive' }), 'inactive')
  assert.equal(resolveCelebListStatus({ status: undefined, publication_status: 'active' }), 'active')
})
