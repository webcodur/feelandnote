import assert from 'node:assert/strict'
import test from 'node:test'
import { factionSceneNumbers, type FactionGroup } from './faction-types'

/**
 * 목차·세력 헤더 사진·장면 카드가 같은 장면에 같은 번호를 붙이는지 지킨다.
 * 예전에는 목차와 장면 카드가 쇼츠 편 경계까지 번호로 세어, 경계 뒤 장면이
 * 헤더 사진보다 한 칸씩 밀리고 결번(4-2)이 생겼다.
 */
test('쇼츠 편 경계는 장면 번호를 쓰지 않는다', () => {
  const group = {
    name: '돌아온 오디세우스',
    people: [],
    sequence: [
      { kind: 'cluster', clusterIndex: 3 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'cluster', clusterIndex: 1 },
      { kind: 'cluster', clusterIndex: 2 },
    ],
    clusters: [
      { label: '주인을 기다린 돼지치기', people: [], beats: [] },
      { label: '노견이 주인을 알아보고 숨을 거두다', people: [], beats: [] },
      { label: '마지막 날이 다가오다.', people: [], beats: [] },
      { label: '낯선 목동 앞에서', people: [], beats: [] },
    ],
  } as unknown as FactionGroup

  const numbers = factionSceneNumbers(group)

  // 번호는 이야기 순서를 따르되 경계는 건너뛴다 — 결번이 없어야 한다.
  assert.equal(numbers.get(3), 1)
  assert.equal(numbers.get(0), 2)
  assert.equal(numbers.get(1), 3)
  assert.equal(numbers.get(2), 4)
  assert.deepEqual([...numbers.values()].sort((a, b) => a - b), [1, 2, 3, 4])
})

test('경계가 없으면 이야기 순서 그대로 번호가 매겨진다', () => {
  const group = {
    name: '위기의 이타카',
    people: [],
    sequence: [
      { kind: 'cluster', clusterIndex: 1 },
      { kind: 'cluster', clusterIndex: 0 },
    ],
    clusters: [
      { label: '텔레마코스를 노리다.', people: [], beats: [] },
      { label: '텔레마코스가 길을 나서다', people: [], beats: [] },
    ],
  } as unknown as FactionGroup

  const numbers = factionSceneNumbers(group)

  assert.equal(numbers.get(1), 1)
  assert.equal(numbers.get(0), 2)
})
