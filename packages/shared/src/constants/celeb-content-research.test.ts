import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CELEB_CONTENT_COUNT,
  isCelebContentResearchTarget,
  isUnresearchedContentCount,
  resolveCelebContentCount,
} from './celeb-content-research.ts'

test('positive actual content count always wins', () => {
  assert.equal(resolveCelebContentCount(3, null), 3)
  assert.equal(resolveCelebContentCount(4, '2026-08-11T00:00:00.000Z'), 4)
})

test('zero-content celebrities follow only the confirmed-empty timestamp', () => {
  assert.equal(resolveCelebContentCount(0, null), CELEB_CONTENT_COUNT.UNRESEARCHED)
  assert.equal(resolveCelebContentCount(0, '2026-08-11T00:00:00.000Z'), CELEB_CONTENT_COUNT.RESEARCHED_EMPTY)
})

test('missing or malformed counts fall back to the confirmed-empty timestamp', () => {
  assert.equal(resolveCelebContentCount(null, null), 0)
  assert.equal(resolveCelebContentCount(undefined, '2026-08-11T00:00:00.000Z'), -1)
  assert.equal(resolveCelebContentCount(Number.NaN, null), 0)
  assert.equal(resolveCelebContentCount(-5, null), 0)
})

// 26.08.07 회귀 방지 — 노출 상태는 표시값에 개입하지 않는다.
// 그전에는 비활성이면 조사 여부와 무관하게 -1이라 신규 비공개 인물이
// 조사도 하기 전에 "조사 완료"로 보였다.
test('display value never depends on profile visibility', () => {
  assert.equal(resolveCelebContentCount(0, null), CELEB_CONTENT_COUNT.UNRESEARCHED)
})

test('research target population is light plus active or inactive', () => {
  assert.equal(isCelebContentResearchTarget('light', 'active'), true)
  assert.equal(isCelebContentResearchTarget('light', 'inactive'), true)
})

test('finished and non-person tiers stay out of the research queue', () => {
  // full — 조사에서 콘텐츠를 찾았기에 올라간 등급이다. 다시 조사하지 않는다.
  assert.equal(isCelebContentResearchTarget('full', 'active'), false)
  // fiction — 허구 인물이라 일반 콘텐츠 조사 개념이 없다.
  assert.equal(isCelebContentResearchTarget('fiction', 'active'), false)
  // deleted — 서비스에서 내린 인물이다.
  assert.equal(isCelebContentResearchTarget('light', 'deleted'), false)
  assert.equal(isCelebContentResearchTarget(null, null), false)
})

test('unresearched display value is recognised', () => {
  assert.equal(isUnresearchedContentCount(0), true)
  assert.equal(isUnresearchedContentCount(-1), false)
  assert.equal(isUnresearchedContentCount(7), false)
})
