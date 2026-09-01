import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanFactionSequenceCuts,
  factionSequenceCutBoundaries,
  factionSequenceOf,
  normalizeFactionGroupEntries,
  sequenceClusters,
  sequenceCutCount,
  withFactionSequenceCut,
} from './faction-sequence'
import { joinCluster, joinGroup, splitCluster, splitGroup } from './faction-schema'

test('구 openingScenes·인물 quote·scenesAfter를 장면 하나의 평평한 beats로 순서대로 승격한다', () => {
  const normalized = normalizeFactionGroupEntries({
    name: '귀향길',
    openingScenes: [{ title: '동굴 탈출', media: 'cave.png', caption: '동굴을 빠져나왔다.' }],
    clusters: [
      {
        label: '바람의 섬',
        people: [{ name: '오디세우스', celebId: 'odysseus', quoteChunks: ['배를', '띄워라.'] }],
        scenesAfter: [{ title: '함대 파괴', caption: '함대가 부서졌다.' }],
      },
      { label: '저승', people: [], scenesAfter: [{ title: '세이렌', caption: '노래가 들렸다.' }] },
    ],
  })

  assert.deepEqual(normalized.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  assert.deepEqual(normalized.clusters[0].beats.map(beat => beat.label ?? beat.speaker), [
    '동굴 탈출', '오디세우스', '함대 파괴',
  ])
  assert.equal(normalized.clusters[0].beats[1].speakerCelebId, 'odysseus')
  assert.equal(normalized.clusters[0].beats[1].text, '배를\n띄워라.')
  assert.equal(normalized.clusters[0].people.length, 1)
  assert.equal(normalized.clusters[0].people[0].isPerson, undefined)
  assert.equal(normalized.sequence.some(item => item.kind === 'entry'), false)
})

test('joinGroup은 구 위치 필드를 제거하고 장면 beats만 만든다', () => {
  const joined = joinGroup(
    { name: '귀향길', data: { openingScenes: [{ title: '동굴 탈출', caption: '탈출' }] } },
    [
      joinCluster({ label: '바람의 섬', data: { scenesAfter: [{ title: '함대 파괴', caption: '파괴' }] } }, []),
      joinCluster({ label: '저승', data: {} }, []),
    ],
  )
  const clusters = joined.clusters as Record<string, unknown>[]
  assert.equal('openingScenes' in joined, false)
  assert.equal('scenesAfter' in clusters[0], false)
  assert.deepEqual((clusters[0].beats as Record<string, unknown>[]).map(beat => beat.label), ['동굴 탈출', '함대 파괴'])
  assert.equal((joined.sequence as Record<string, unknown>[]).some(item => item.kind === 'entry'), false)
})

test('splitGroup과 splitCluster는 구 위치·entry를 저장하지 않는다', () => {
  const group = {
    name: '귀향길',
    clusters: [{ label: 'A', people: [{ isPerson: false, name: '폭풍', caption: '거센 바람' }] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
    ],
  }
  const groupSplit = splitGroup(group)
  const normalizedCluster = (normalizeFactionGroupEntries(group).clusters as Record<string, unknown>[])[0]
  const clusterSplit = splitCluster(normalizedCluster)
  assert.equal('openingScenes' in groupSplit.data, false)
  assert.deepEqual(groupSplit.data.sequence, [{ kind: 'cluster', clusterIndex: 0 }])
  assert.equal('scenesAfter' in clusterSplit.data, false)
  assert.equal((clusterSplit.data.beats as unknown[]).length, 1)
})

test('통합 전 인물 entry가 있어도 인물 대사는 cluster 위치에서 한 번만 승격한다', () => {
  const normalized = normalizeFactionGroupEntries({
    name: '귀향길',
    clusters: [{ people: [
      { name: 'A', celebId: 'a', quote: 'A 대사' },
      { name: 'B', celebId: 'b', quote: 'B 대사' },
      { isPerson: false, name: '폭풍', caption: '폭풍이 분다.' },
    ] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 2 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
    ],
  })
  assert.deepEqual(normalized.sequence, [{ kind: 'cluster', clusterIndex: 0 }])
  assert.deepEqual(normalized.clusters[0].beats.map(beat => beat.text), ['A 대사', 'B 대사', '폭풍이 분다.'])
})

test('같은 장면 안의 쇼츠 경계는 다음 beat flag로, 장면 사이 경계는 sequence cut으로 보존한다', () => {
  const normalized = normalizeFactionGroupEntries({
    name: '귀향길',
    clusters: [
      { people: [{ isPerson: false, name: '앞', caption: '앞 대사' }, { isPerson: false, name: '뒤', caption: '뒤 대사' }] },
      { people: [] },
    ],
    sequence: [
      { kind: 'entry', clusterIndex: 0, entryIndex: 0 },
      { kind: 'cut' },
      { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
      { kind: 'cluster', clusterIndex: 0 },
    ],
  })
  assert.deepEqual(normalized.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  assert.equal(normalized.clusters[0].beats[1].shortsCutBefore, true)
  assert.equal(sequenceCutCount(normalized), 1)
  assert.equal(sequenceClusters(normalized).length, 2)
})

test('이미 통합된 sequence의 없는 묶음·맨 앞 경계·연속 경계는 거부한다', () => {
  const base = { name: '잘못된 경계', clusters: [{ people: [], beats: [] }, { people: [], beats: [] }] }
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cluster', clusterIndex: 2 }] }), /없는 묶음/)
  assert.throws(() => factionSequenceOf({ ...base, sequence: [{ kind: 'cut' }, { kind: 'cluster', clusterIndex: 0 }, { kind: 'cluster', clusterIndex: 1 }] }), /맨 앞/)
  assert.throws(() => factionSequenceOf({
    ...base,
    sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }, { kind: 'cut' }, { kind: 'cluster', clusterIndex: 1 }],
  }), /연속/)
})

test('세력 끝 경계는 허용한다 — 다음 세력과의 사이에서 편이 갈린다', () => {
  const group = { name: '끝 경계', clusters: [{ people: [], beats: [] }, { people: [], beats: [] }] }
  const sequence = factionSequenceOf({
    ...group,
    sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cluster', clusterIndex: 1 }, { kind: 'cut' }],
  })
  assert.deepEqual(sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cluster', clusterIndex: 1 },
    { kind: 'cut' },
  ])
  assert.deepEqual([...factionSequenceCutBoundaries(sequence)], [2])
})

test('경계 자리를 켜고 끄면 장면 순서는 그대로고 경계만 오간다', () => {
  const clusters = [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cluster', clusterIndex: 1 }, { kind: 'cluster', clusterIndex: 2 }] as const
  const withMiddle = withFactionSequenceCut([...clusters], 1, true)
  assert.deepEqual(withMiddle, [clusters[0], { kind: 'cut' }, clusters[1], clusters[2]])
  const withBoth = withFactionSequenceCut(withMiddle, 3, true)
  assert.deepEqual([...factionSequenceCutBoundaries(withBoth)], [1, 3])
  const cleared = withFactionSequenceCut(withBoth, 1, false)
  assert.deepEqual(cleared, [clusters[0], clusters[1], clusters[2], { kind: 'cut' }])
  // 0번(맨 앞)과 장면 수를 넘는 자리는 없다.
  assert.throws(() => withFactionSequenceCut([...clusters], 0, true), /1~3/)
  assert.throws(() => withFactionSequenceCut([...clusters], 4, true), /1~3/)
  // 규칙에 어긋난 입력(맨 앞·연속)은 걷어내고 끝 경계는 남긴다.
  assert.deepEqual(
    cleanFactionSequenceCuts([{ kind: 'cut' }, clusters[0], { kind: 'cut' }, { kind: 'cut' }, clusters[1], { kind: 'cut' }]),
    [clusters[0], { kind: 'cut' }, clusters[1], { kind: 'cut' }],
  )
})
