import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCues, longformPartCount, sceneBeatMediaStartSec } from '../src/compositions/Faction/timing'
import type { FactionScript } from '../src/compositions/Faction/types'
import { factionSceneTiming } from '@feelandnote/shared/lib/faction-scene-timing'

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
      if (cue.kind === 'entry') return [`entry-${cue.entry.name}`]
      return []
    })
}

function longformStoryKinds(script: FactionScript, lvPart?: number): string[] {
  return buildCues(script, false, undefined, lvPart)
    .map(item => item.cue)
    .flatMap(cue => {
      if (cue.kind === 'person') return [`person-${cue.clusterIndex}`]
      if (cue.kind === 'entry') return [`entry-${cue.entry.name}`]
      return []
    })
}

test('first narrative image can wait for the spoken text instead of replacing the opening image', () => {
  const beat = { speaker: 'Siren', text: 'Come closer.', media: 'closeup.png' }
  const timing = factionSceneTiming({ beats: [beat] }).beats[0]

  assert.ok(timing.textStartSec > timing.startSec)
  assert.equal(sceneBeatMediaStartSec(beat, timing), timing.startSec)
  assert.equal(sceneBeatMediaStartSec({ ...beat, mediaAt: 'text' }, timing), timing.textStartSec)
})

test('신 sequence의 그룹·장면 수평 순서를 그대로 cue로 만든다', () => {
  const script = scriptWith({
    name: '귀향길',
    clusters: [
      { people: [{ name: 'A', quote: '' }, { isPerson: false, name: '폭풍' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  })

  assert.deepEqual(storyKinds(script), ['person-0', 'entry-폭풍', 'person-1'])
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

  assert.deepEqual(storyKinds(script), ['entry-동굴 탈출', 'person-0', 'entry-함대 파괴', 'person-1'])
})

test('세력 내부 cut은 쇼츠만 두 편으로 나누고 롱폼에서는 순서를 이어 붙인다', () => {
  const script = scriptWith({
    name: '귀향길',
    clusters: [
      { people: [{ name: 'A', quote: '' }, { isPerson: false, name: '폭풍' }, { isPerson: false, name: '귀항' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
      { kind: 'cut' },
      { kind: 'entry', clusterIndex: 0, entryIndex: 2 },
      { kind: 'cluster', clusterIndex: 1 },
    ],
  })

  assert.equal(longformPartCount(script), 1)
  assert.deepEqual(longformStoryKinds(script), ['person-0', 'entry-폭풍', 'entry-귀항', 'person-1'])
  assert.deepEqual(storyKinds(script, 1), ['person-0', 'entry-폭풍'])
  assert.deepEqual(storyKinds(script, 2), ['entry-귀항', 'person-1'])
})
