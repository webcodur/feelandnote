import assert from 'node:assert/strict'
import test from 'node:test'
import { factionShortsPartNumbers, factionShortsSegments, factionShortsSliceItems } from './faction-shorts'

test('서로 다른 그룹의 내부 경계 두 개를 전역 쇼츠 3편으로 만든다', () => {
  const groups = [
    { clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }] },
    {
      clusters: [{}, {}],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    },
    { clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }] },
    {
      clusters: [{}, {}],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    },
    { clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }] },
  ]
  assert.deepEqual(factionShortsPartNumbers(groups), [1, 2, 3])
  assert.deepEqual(factionShortsSegments(groups), [
    [
      { gi: 0, sequenceStart: 0, sequenceEnd: 1 },
      { gi: 1, sequenceStart: 0, sequenceEnd: 1 },
    ],
    [
      { gi: 1, sequenceStart: 2, sequenceEnd: 3 },
      { gi: 2, sequenceStart: 0, sequenceEnd: 1 },
      { gi: 3, sequenceStart: 0, sequenceEnd: 1 },
    ],
    [
      { gi: 3, sequenceStart: 2, sequenceEnd: 3 },
      { gi: 4, sequenceStart: 0, sequenceEnd: 1 },
    ],
  ])
})

test('경계가 없으면 편 번호를 만들지 않는다 — 전체가 단편 하나다', () => {
  const groups = [{ clusters: [{}] }, { clusters: [{}] }]
  assert.deepEqual(factionShortsPartNumbers(groups), [])
  assert.equal(factionShortsSegments(groups).length, 1)
})

test('세력 끝 경계는 다음 세력부터 새 편이다', () => {
  const groups = [
    { clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }] },
    { clusters: [{}, {}], sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cluster', clusterIndex: 1 }, { kind: 'cut' }] },
    { clusters: [{}] },
  ]
  assert.deepEqual(factionShortsSegments(groups), [
    [{ gi: 0, sequenceStart: 0, sequenceEnd: 1 }],
    [{ gi: 1, sequenceStart: 0, sequenceEnd: 1 }, { gi: 1, sequenceStart: 1, sequenceEnd: 2 }],
    [{ gi: 2, sequenceStart: 0, sequenceEnd: 1 }],
  ])
  assert.deepEqual(factionShortsPartNumbers(groups), [1, 2, 3])
})

test('마지막 세력 끝의 경계는 빈 편을 만들지 않는다', () => {
  const groups = [{ clusters: [{}], sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }] }]
  assert.deepEqual(factionShortsPartNumbers(groups), [1])
})

test('longformOnly 그룹의 내부 경계는 쇼츠 편을 만들지 않는다', () => {
  const groups = [{
    longformOnly: true,
    clusters: [{}, {}],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }, { kind: 'cut' }, { kind: 'cluster', clusterIndex: 1 }],
  }]
  assert.deepEqual(factionShortsSegments(groups), [])
  assert.deepEqual(factionShortsPartNumbers(groups), [])
})

test('장면 내부 대사 경계는 같은 장면의 beat 구간을 다음 쇼츠 편으로 나눈다', () => {
  const group = {
    clusters: [{ beats: [{ text: '첫째' }, { text: '둘째', shortsCutBefore: true }, { text: '셋째' }] }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  }
  const segments = factionShortsSegments([group])

  assert.deepEqual(segments, [
    [{ gi: 0, sequenceStart: 0, sequenceEnd: 1, clusterIndex: 0, beatStart: 0, beatEnd: 1 }],
    [{ gi: 0, sequenceStart: 0, sequenceEnd: 1, clusterIndex: 0, beatStart: 1, beatEnd: 3 }],
  ])
  assert.deepEqual(factionShortsSliceItems(group, segments[1][0]), [
    { kind: 'cluster', clusterIndex: 0, beatStart: 1, beatEnd: 3 },
  ])
})
