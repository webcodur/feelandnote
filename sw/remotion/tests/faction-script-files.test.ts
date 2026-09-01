import assert from 'node:assert/strict'
import test from 'node:test'
import { factionDataPath, mergeTimingMaps, timingFileCandidates } from '../src/compositions/Faction/script-files'

/**
 * 편 본문·발화 시각은 컴포지션을 열 때 staticFile 로 읽는다. 어떤 파일을 어떤 순서로 찾는지가
 * 예전 require.context 병합(알파벳 순 — 통합본 뒤에 편별 파일)과 같아야 렌더가 달라지지 않는다.
 */

test('편 본문 경로는 public 기준 상대 경로다', () => {
  assert.equal(factionDataPath('Homer-Odyssey'), 'factions/Homer-Odyssey/faction-data.json')
})

test('발화 시각 후보는 통합본을 앞에, 편별 파일을 편 번호 순으로 뒤에 둔다', () => {
  assert.deepEqual(timingFileCandidates('Homer-Odyssey', 'ko', [3, 1, 2, 1]), [
    'factions/Homer-Odyssey/data.timing.ko.json',
    'factions/Homer-Odyssey/data.timing.p1.ko.json',
    'factions/Homer-Odyssey/data.timing.p2.ko.json',
    'factions/Homer-Odyssey/data.timing.p3.ko.json',
  ])
})

test('같은 키는 뒤(편별)가 이기고, 하나도 없으면 undefined 다', () => {
  const legacy = { a: [{ start: 0, end: 1 }], b: [{ start: 0, end: 9 }] }
  const p1 = { b: [{ start: 0, end: 2 }] }

  const merged = mergeTimingMaps([legacy, undefined, p1]) as Record<string, { end: number }[]>

  assert.equal(merged.a[0].end, 1)
  assert.equal(merged.b[0].end, 2)
  assert.equal(mergeTimingMaps([undefined, undefined]), undefined)
})
