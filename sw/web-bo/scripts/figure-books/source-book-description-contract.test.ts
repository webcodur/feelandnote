import assert from 'node:assert/strict'
import test from 'node:test'

import { decideDescriptionBackfill } from './source-book-description-contract'

test('검색 API에서 잘린 앞부분은 전체 소개로 늘린다', () => {
  const current = '같은 판본의 작품 소개가 이어지다가 문장 중간에서'
  const full = `${current} 끝났다. ${'뒤 문단이 충분히 길게 이어진다. '.repeat(4)}`
  assert.deepEqual(decideDescriptionBackfill(current, full), {
    kind: 'update',
    description: full.trim(),
  })
})

test('HTML 엔티티와 공백 차이는 같은 앞부분으로 본다', () => {
  const current = '원문 &lt;작품&gt;은  여러 신화를 다룬다…'
  const full = `원문 <작품>은 여러 신화를 다룬다. ${'다음 설명이 이어진다. '.repeat(5)}`
  assert.equal(decideDescriptionBackfill(current, full).kind, 'update')
})

test('별도로 작성한 소개는 전체 상세와 달라도 덮어쓰지 않는다', () => {
  const current = '등장인물의 사건만 간결하게 정리한 별도 소개다.'
  const full = `출판사가 제공한 전혀 다른 소개다. ${'상세 설명이 이어진다. '.repeat(5)}`
  assert.deepEqual(decideDescriptionBackfill(current, full), {
    kind: 'skip',
    reason: 'different-description',
  })
})

test('상세 페이지에서 얻은 글이 너무 짧으면 새로 채우지 않는다', () => {
  assert.deepEqual(decideDescriptionBackfill(null, '짧은 소개'), {
    kind: 'skip',
    reason: 'too-short',
  })
})

test('현재 소개가 같거나 더 길면 그대로 둔다', () => {
  const current = '이미 충분히 저장된 소개다. '.repeat(5)
  assert.deepEqual(decideDescriptionBackfill(current, current), {
    kind: 'unchanged',
    reason: 'same-or-longer',
  })
})
