import assert from 'node:assert/strict'
import test from 'node:test'
import { factionLongformPartCount, factionLongformSegments } from './faction-longform'

const groups = [
  {
    name: 'A',
    clusters: [{ people: [] }, { people: [] }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'cut' },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  },
  {
    name: 'B',
    clusters: [{ people: [] }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  },
]

test('세력 내부 쇼츠 경계는 롱폼을 나누지 않는다', () => {
  const segments = factionLongformSegments(groups, [{ group: 0 }, { group: 1 }])
  assert.deepEqual(segments, [[
    { gi: 0, sequenceStart: 0, sequenceEnd: 3 },
    { gi: 1, sequenceStart: 0, sequenceEnd: 1 },
  ]])
  assert.equal(factionLongformPartCount(groups, [{ group: 0 }, { group: 1 }]), 1)
})

test('longformLayout의 바깥 경계만 롱폼 편을 나눈다', () => {
  const segments = factionLongformSegments(groups, [{ group: 0 }, { cut: true }, { group: 1 }])
  assert.equal(segments.length, 2)
  assert.deepEqual(segments.map(segment => segment.flatMap(step => 'gi' in step ? [step.gi] : [])), [[0], [1]])
})

test('배치에서 빠진 활성 세력은 마지막 편에 붙고 비활성 세력은 제외한다', () => {
  const disabled = [{ ...groups[0], disabled: true }, groups[1]]
  assert.deepEqual(factionLongformSegments(disabled, []), [[{ gi: 1, sequenceStart: 0, sequenceEnd: 1 }]])
})
