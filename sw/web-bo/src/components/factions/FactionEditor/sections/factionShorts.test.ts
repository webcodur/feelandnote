import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionScript } from '@/lib/faction-types'
import {
  shortsPartCountOf,
  shortsPartScriptOf,
  shortsPartSlicesOf,
  shortsSliceSummary,
} from './factionShorts'

const script = {
  title: '쇼츠 경계 테스트',
  groups: [
    {
      name: '앞',
      clusters: [{ label: '앞-1', people: [{ name: 'A' }] }, { label: '앞-2', people: [{ name: 'B' }] }],
      // 장면 사이 경계 하나 + 세력 끝 경계 하나
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
        { kind: 'cut' },
      ],
    },
    {
      name: '뒤',
      clusters: [{ label: '뒤-1', people: [{ name: 'C' }] }, { label: '뒤-2', people: [{ name: 'D' }] }],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    },
  ],
} as unknown as FactionScript

test('장면 사이 경계와 세력 끝 경계가 3편을 연다 — 편 수는 경계 수 + 1', () => {
  assert.equal(shortsPartCountOf(script), 3)
  assert.deepEqual(shortsPartSlicesOf(script, 1).map(slice => slice.group.name), ['앞'])
  assert.deepEqual(shortsPartSlicesOf(script, 2).map(slice => slice.group.name), ['앞'])
  assert.deepEqual(shortsPartSlicesOf(script, 3).map(slice => slice.group.name), ['뒤', '뒤'])
  assert.deepEqual(shortsPartSlicesOf(script, 1).map(shortsSliceSummary), ['앞-1'])
  assert.deepEqual(shortsPartSlicesOf(script, 3).map(shortsSliceSummary), ['뒤-1', '뒤-2'])
})

test('한 편만 담은 미리보기 대본은 그 구간의 장면만 0부터 다시 매긴다', () => {
  const part2 = shortsPartScriptOf(script, 2)
  assert.equal(part2.groups.length, 1)
  assert.deepEqual(part2.groups[0]?.clusters?.map(cluster => cluster.label), ['앞-2'])
  assert.deepEqual(part2.groups[0]?.clusters?.[0]?.people.map(person => person.name), ['B'])
  assert.deepEqual(part2.groups[0]?.sequence, [{ kind: 'cluster', clusterIndex: 0 }])
})

test('경계가 없으면 단편이고 옛 part 번호는 읽지 않는다', () => {
  const legacy = {
    groups: [
      { name: '가', part: 1, clusters: [{ label: '가-1', people: [] }] },
      { name: '나', part: 2, clusters: [{ label: '나-1', people: [] }] },
    ],
  } as unknown as FactionScript
  assert.equal(shortsPartCountOf(legacy), 1)
  assert.deepEqual(shortsPartSlicesOf(legacy, 1).map(slice => slice.group.name), ['가', '나'])
  assert.deepEqual(shortsPartSlicesOf(legacy, 2), [])
})
