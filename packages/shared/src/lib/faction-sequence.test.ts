import assert from 'node:assert/strict'
import test from 'node:test'
import {
  factionSequenceOf,
  normalizeFactionGroupEntries,
  sequenceClusters,
  sequenceCutCount,
  sequenceEntries,
} from './faction-sequence'
import { joinCluster, joinGroup, splitGroup, splitCluster } from './faction-schema'

test('구 inline 장면을 기존 인물 뒤의 isPerson=false 행과 위치 참조로 승격한다', () => {
  const normalized = normalizeFactionGroupEntries({
    name: '귀향길',
    openingScenes: [{ title: '동굴 탈출', media: 'cave.png' }],
    clusters: [
      { label: '바람의 섬', people: [{ name: '오디세우스' }], scenesAfter: [{ title: '함대 파괴' }] },
      { label: '저승', people: [], scenesAfter: [{ title: '세이렌' }] },
    ],
  })

  assert.deepEqual(normalized.sequence, [
    { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'entry', clusterIndex: 0, entryIndex: 2 },
    { kind: 'cluster', clusterIndex: 1 },
    { kind: 'entry', clusterIndex: 1, entryIndex: 0 },
  ])
  assert.deepEqual(sequenceEntries(normalized).map(entry => entry.name), ['동굴 탈출', '함대 파괴', '세이렌'])
  assert.deepEqual(normalized.clusters[0].people[0], { name: '오디세우스' })
  assert.deepEqual(normalized.clusters[0].people[1], {
    isPerson: false, name: '동굴 탈출', image: 'cave.png',
  })
})

test('joinGroup은 구 위치 필드를 제거하고 공통 행 참조만 만든다', () => {
  const joined = joinGroup(
    { name: '귀향길', data: { openingScenes: [{ title: '동굴 탈출' }] } },
    [
      joinCluster({ label: '바람의 섬', data: { scenesAfter: [{ title: '함대 파괴' }] } }, []),
      joinCluster({ label: '저승', data: {} }, []),
    ],
  )
  assert.equal('openingScenes' in joined, false)
  assert.equal('scenesAfter' in (joined.clusters as Record<string, unknown>[])[0], false)
  assert.deepEqual(sequenceEntries(joined).map(entry => entry.name), ['동굴 탈출', '함대 파괴'])
})

test('splitGroup과 splitCluster는 구 위치 필드를 저장하지 않는다', () => {
  const group = {
    name: '귀향길',
    clusters: [{ label: 'A', people: [{ isPerson: false, name: '폭풍' }] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
    ],
  }
  const groupSplit = splitGroup(group)
  const clusterSplit = splitCluster(group.clusters[0])
  assert.equal('openingScenes' in groupSplit.data, false)
  assert.deepEqual(groupSplit.data.sequence, group.sequence)
  assert.equal('scenesAfter' in clusterSplit.data, false)
})

test('모든 묶음과 모든 isPerson=false 항목을 정확히 한 번 참조해야 한다', () => {
  assert.throws(() => factionSequenceOf({
    name: '잘못된 세력',
    clusters: [{ people: [{ isPerson: false, name: '빠진 컷' }] }, { people: [] }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  }), /묶음 2이 빠졌다/)
  assert.throws(() => factionSequenceOf({
    name: '잘못된 세력',
    clusters: [{ people: [{ isPerson: false, name: '빠진 컷' }] }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  }), /서사 항목 1:1이 빠졌다/)
})

test('쇼츠 편 경계를 보존하고 조회에서는 건너뛴다', () => {
  const group = {
    name: '귀향길',
    clusters: [
      { people: [{ isPerson: false, name: '휴식' }] },
      { people: [] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  }
  assert.deepEqual(factionSequenceOf(group), group.sequence)
  assert.equal(sequenceCutCount(group), 1)
  assert.equal(sequenceClusters(group).length, 2)
  assert.deepEqual(sequenceEntries(group).map(entry => entry.name), ['휴식'])
})

test('맨 앞·맨 뒤·연속 편 경계는 거부한다', () => {
  const base = { name: '잘못된 경계', clusters: [{ people: [] }] }
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cut' }, { kind: 'cluster', clusterIndex: 0 }] }), /맨 앞이나 맨 뒤/)
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }] }), /맨 앞이나 맨 뒤/)
})
