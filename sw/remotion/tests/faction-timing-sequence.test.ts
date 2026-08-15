import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCues, longformPartCount } from '../src/compositions/Faction/timing'
import type { FactionScript } from '../src/compositions/Faction/types'

function scriptWith(group: Record<string, unknown>): FactionScript {
  return {
    title: '순서 테스트',
    groups: [group],
  } as unknown as FactionScript
}

function storyKinds(script: FactionScript, part?: number): string[] {
  return buildCues(script, true, part)
    .map(item => item.cue)
    .flatMap(cue => {
      if (cue.kind === 'person') return [`person-${cue.clusterIndex}`]
      if (cue.kind === 'scene') return [`scene-${cue.scene.title}`]
      return []
    })
}

function longformStoryKinds(script: FactionScript, lvPart?: number): string[] {
  return buildCues(script, false, undefined, lvPart)
    .map(item => item.cue)
    .flatMap(cue => {
      if (cue.kind === 'person') return [`person-${cue.clusterIndex}`]
      if (cue.kind === 'scene') return [`scene-${cue.scene.title}`]
      return []
    })
}

test('신 sequence의 그룹·장면 수평 순서를 그대로 cue로 만든다', () => {
  const script = scriptWith({
    name: '귀향길',
    clusters: [
      { people: [{ name: 'A', quote: '' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'scene', id: 'storm', scene: { title: '폭풍' } },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  })

  assert.deepEqual(storyKinds(script), ['person-0', 'scene-폭풍', 'person-1'])
})

test('구 openingScenes/scenesAfter 파일도 같은 cue 순서로 읽는다', () => {
  const script = scriptWith({
    name: '귀향길',
    openingScenes: [{ title: '동굴 탈출' }],
    clusters: [
      { people: [{ name: 'A', quote: '' }], scenesAfter: [{ title: '함대 파괴' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
  })

  assert.deepEqual(storyKinds(script), ['scene-동굴 탈출', 'person-0', 'scene-함대 파괴', 'person-1'])
})

test('세력 내부 cut은 쇼츠만 두 편으로 나누고 롱폼에서는 순서를 이어 붙인다', () => {
  const script = scriptWith({
    name: '귀향길',
    clusters: [
      { people: [{ name: 'A', quote: '' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'scene', id: 'storm', scene: { title: '폭풍' } },
      { kind: 'cut' },
      { kind: 'scene', id: 'harbor', scene: { title: '귀항' } },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  })

  assert.equal(longformPartCount(script), 1)
  assert.deepEqual(longformStoryKinds(script), ['person-0', 'scene-폭풍', 'scene-귀항', 'person-1'])
  assert.deepEqual(storyKinds(script, 1), ['person-0', 'scene-폭풍'])
  assert.deepEqual(storyKinds(script, 2), ['scene-귀항', 'person-1'])
})
