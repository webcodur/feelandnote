import assert from 'node:assert/strict'
import test from 'node:test'
import type { PublishGroup } from './collect'
import { pickTagVariants } from './videos'

function publishGroup(
  index: number,
  clusterCount: number,
  sequence: PublishGroup['sequence'],
): PublishGroup {
  return {
    id: `group-${index}`,
    position: index + 1,
    index,
    name: `세력 ${index + 1}`,
    tagId: `tag-${index}`,
    tagSlug: `tag-${index}`,
    suggestedSlug: `group-${index}`,
    disabled: false,
    longformOnly: false,
    sequence,
    clusters: Array.from({ length: clusterCount }, () => ({})),
    webLogoUrl: null,
    people: [],
    teamShots: [],
  }
}

test('태그 영상 판정은 세력 내부 cut으로 갈린 쇼츠 variant와 통짜 롱폼을 사용한다', () => {
  const splitGroup = publishGroup(0, 2, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cut' },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  const followingGroup = publishGroup(1, 1, [
    { kind: 'cluster', clusterIndex: 0 },
  ])
  const all = [splitGroup, followingGroup]

  const first = pickTagVariants(all, [splitGroup])
  const second = pickTagVariants(all, [followingGroup])

  assert.equal(first.longform?.key, 'ko-longform')
  assert.equal(second.longform?.key, 'ko-longform')
  assert.equal(first.shorts?.key, 'ko-shorts-1')
  assert.equal(second.shorts?.key, 'ko-shorts-2')
})
