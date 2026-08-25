import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionScript } from '@/lib/faction-types'
import {
  configuredShortsParts,
  shortsPartCountOf,
  shortsPartScriptOf,
  shortsPartSlicesOf,
  usesInternalShortsCuts,
} from './factionShorts'

test('내부 쇼츠 경계 두 개가 legacy group.part보다 우선해 3편을 연다', () => {
  const script = {
    title: '쇼츠 경계 테스트',
    shortsPartCount: 2,
    groups: [
      {
        name: '앞',
        part: 1,
        clusters: [{ label: '앞-1', people: [{ name: 'A' }] }, { label: '앞-2', people: [{ name: 'B' }] }],
        sequence: [
          { kind: 'cluster', clusterIndex: 0 },
          { kind: 'cut' },
          { kind: 'cluster', clusterIndex: 1 },
        ],
      },
      {
        name: '뒤',
        part: 2,
        clusters: [{ label: '뒤-1', people: [{ name: 'C' }] }, { label: '뒤-2', people: [{ name: 'D' }] }],
        sequence: [
          { kind: 'cluster', clusterIndex: 0 },
          { kind: 'cut' },
          { kind: 'cluster', clusterIndex: 1 },
        ],
      },
    ],
  } as unknown as FactionScript

  assert.deepEqual(configuredShortsParts(script), [1, 2, 3])
  assert.equal(shortsPartCountOf(script), 3)
  assert.equal(usesInternalShortsCuts(script), true)

  assert.deepEqual(shortsPartSlicesOf(script, 1).map(slice => slice.group.name), ['앞'])
  assert.deepEqual(shortsPartSlicesOf(script, 2).map(slice => slice.group.name), ['앞', '뒤'])
  assert.deepEqual(shortsPartSlicesOf(script, 3).map(slice => slice.group.name), ['뒤'])

  const part3 = shortsPartScriptOf(script, 3)
  assert.equal(part3.groups.length, 1)
  assert.deepEqual(part3.groups[0]?.clusters?.map(cluster => cluster.label), ['뒤-2'])
  assert.deepEqual(part3.groups[0]?.clusters?.[0]?.people.map(person => person.name), ['D'])
  assert.deepEqual(part3.groups[0]?.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
  ])
})
