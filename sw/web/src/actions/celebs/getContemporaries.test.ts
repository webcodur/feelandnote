import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hasContemporaries,
  hasContemporaryOverlap,
  type CelebLifeSpanRow,
} from './getContemporaries'

test('동시대 존재 판정은 생애가 한 해라도 겹칠 때만 참이다', () => {
  const rows: CelebLifeSpanRow[] = [
    { id: 'before', birth_date: '1800', death_date: '1899' },
    { id: 'boundary', birth_date: '1950', death_date: '2000' },
    { id: 'after', birth_date: '1951', death_date: '2001' },
  ]

  assert.equal(hasContemporaryOverlap(rows, 'target', '1900', '1950'), true)
  assert.equal(hasContemporaryOverlap(
    rows.filter((row) => row.id !== 'boundary'),
    'target',
    '1900',
    '1950',
  ), false)
})

test('자기 자신과 잘못된 생몰일은 동시대 존재로 세지 않는다', async () => {
  const rows: CelebLifeSpanRow[] = [
    { id: 'target', birth_date: '1900', death_date: '1950' },
    { id: 'invalid', birth_date: '날짜 없음', death_date: null },
  ]

  assert.equal(hasContemporaryOverlap(rows, 'target', '1900', '1950'), false)
  assert.equal(hasContemporaryOverlap(rows, 'target', '날짜 없음', null), false)
  // 잘못된 대상 생년은 DB 원장을 읽기 전에 끝나야 한다.
  assert.equal(await hasContemporaries('target', '날짜 없음', null), false)
})

test('동시대 존재 판정은 첫 겹침에서 순회를 멈춘다', () => {
  const rows: CelebLifeSpanRow[] = [
    { id: 'match', birth_date: '1940', death_date: '1960' },
    {
      get id(): string {
        throw new Error('첫 일치 뒤의 행을 읽으면 안 된다')
      },
      birth_date: '2000',
      death_date: null,
    },
  ]

  assert.equal(hasContemporaryOverlap(rows, 'target', '1900', '1950'), true)
})
