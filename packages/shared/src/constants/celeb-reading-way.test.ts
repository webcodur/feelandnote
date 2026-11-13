import assert from 'node:assert/strict'
import test from 'node:test'
import { hasCompletedReadingWayResearch } from './celeb-reading-way'

test('실존·복합 인물은 미조사를 통과시키지 않고, 조사 미달과 본문 저장은 인정한다', () => {
  for (const celeb_reality of ['REAL', 'BOTH']) {
    const check = (reading_way: unknown, reading_way_en: unknown) =>
      hasCompletedReadingWayResearch({ celeb_reality, reading_way, reading_way_en })
    assert.equal(check(null, null), false)
    assert.equal(check(undefined, undefined), false)
    assert.equal(check('', null), false)
    assert.equal(check(null, 'English only'), false)
    assert.equal(check('  ', '  '), false)
    assert.equal(check('', ''), true)
    assert.equal(check('독서 방식 본문.', 'Reading habits.'), true)
    assert.equal(check('독서 방식 본문.', null), true)
  }
})

test('가상 인물에는 조사 요건을 적용하지 않고 알 수 없는 실존 축을 완료로 추정하지 않는다', () => {
  assert.equal(hasCompletedReadingWayResearch({ celeb_reality: 'FICTION' }), true)
  assert.equal(hasCompletedReadingWayResearch({}), false)
})
