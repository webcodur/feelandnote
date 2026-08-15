import assert from 'node:assert/strict'
import test from 'node:test'
import { factionSequenceOf, sequenceClusters, sequenceCutCount, sequenceScenes } from './faction-sequence'
import { joinCluster, joinGroup, splitGroup, splitCluster } from './faction-schema'

test('구 openingScenes/scenesAfter를 실제 이야기 순서의 단일 sequence로 승격한다', () => {
  const group = {
    name: '귀향길',
    openingScenes: [{ title: '동굴 탈출' }],
    clusters: [
      { label: '바람의 섬', people: [], scenesAfter: [{ title: '함대 파괴' }] },
      { label: '저승', people: [], scenesAfter: [{ title: '세이렌' }, { title: '괴물 사이' }] },
    ],
  }

  assert.deepEqual(factionSequenceOf(group), [
    { kind: 'scene', id: 'legacy-opening-1', scene: { title: '동굴 탈출' } },
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'scene', id: 'legacy-after-1-1', scene: { title: '함대 파괴' } },
    { kind: 'cluster', clusterIndex: 1 },
    { kind: 'scene', id: 'legacy-after-2-1', scene: { title: '세이렌' } },
    { kind: 'scene', id: 'legacy-after-2-2', scene: { title: '괴물 사이' } },
  ])
})

test('joinGroup은 구 위치 필드를 제거하고 sequence 하나만 만든다', () => {
  const joined = joinGroup(
    { name: '귀향길', data: { openingScenes: [{ title: '동굴 탈출' }] } },
    [
      joinCluster({ label: '바람의 섬', data: { scenesAfter: [{ title: '함대 파괴' }] } }, []),
      joinCluster({ label: '저승', data: {} }, []),
    ],
  )

  assert.equal('openingScenes' in joined, false)
  assert.equal('scenesAfter' in (joined.clusters as Record<string, unknown>[])[0], false)
  assert.deepEqual(sequenceScenes(joined).map(scene => scene.title), ['동굴 탈출', '함대 파괴'])
})

test('splitGroup과 splitCluster는 sequence만 저장하고 구 위치 필드를 폐기한다', () => {
  const group = {
    name: '귀향길',
    openingScenes: [{ title: '구 장면' }],
    clusters: [{ label: 'A', people: [], scenesAfter: [{ title: '구 뒤 장면' }] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'scene', id: 'storm', scene: { title: '폭풍' } },
    ],
  }
  const groupSplit = splitGroup(group)
  const clusterSplit = splitCluster(group.clusters[0])

  assert.equal('openingScenes' in groupSplit.data, false)
  assert.deepEqual(groupSplit.data.sequence, group.sequence)
  assert.equal('scenesAfter' in clusterSplit.data, false)
})

test('sequence는 모든 그룹을 정확히 한 번 포함해야 한다', () => {
  assert.throws(
    () => factionSequenceOf({
      name: '잘못된 세력',
      clusters: [{ people: [] }, { people: [] }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }),
    /그룹 2이 빠졌다/,
  )
})

test('쇼츠 편 경계를 보존하고 장면·그룹 조회에서는 건너뛴다', () => {
  const group = {
    name: '귀향길',
    clusters: [{ people: [] }, { people: [] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'scene', id: 'rest', scene: { title: '휴식' } },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  }

  assert.deepEqual(factionSequenceOf(group), group.sequence)
  assert.equal(sequenceCutCount(group), 1)
  assert.equal(sequenceClusters(group).length, 2)
  assert.deepEqual(sequenceScenes(group).map(scene => scene.title), ['휴식'])

  const split = splitGroup(group)
  const joined = joinGroup(
    { name: split.name, data: split.data },
    group.clusters.map(cluster => joinCluster({ label: '', data: {} }, cluster.people)),
  )
  assert.deepEqual(joined.sequence, group.sequence)
})

test('맨 앞·맨 뒤·연속 편 경계는 빈 쇼츠 편을 만들므로 거부한다', () => {
  const base = { name: '잘못된 경계', clusters: [{ people: [] }] }
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cut' }, { kind: 'cluster', clusterIndex: 0 }] }), /맨 앞이나 맨 뒤/)
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }] }), /맨 앞이나 맨 뒤/)
})
