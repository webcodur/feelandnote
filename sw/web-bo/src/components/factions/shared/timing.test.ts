import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionScript } from '@/lib/faction-types'
import {
  cueCount,
  longformPartCount,
  longformSegments,
  longformSliceGroup,
  totalSec,
} from './timing'

function scriptWithInternalCut(): FactionScript {
  return {
    title: '내부 경계 테스트',
    groups: [{
      name: '한 세력',
      people: [],
      clusters: [
        { label: '첫 장면', people: [], beats: [{ label: '전환', text: '전환 장면' }] },
        { label: '둘째 장면', people: [], beats: [] },
      ],
      sequence: [
        { kind: 'cluster', clusterIndex: 0 },
        { kind: 'cut' },
        { kind: 'cluster', clusterIndex: 1 },
      ],
    }],
  }
}

test('세력 내부 cut은 롱폼 편 수와 세그먼트를 가르지 않는다', () => {
  const script = scriptWithInternalCut()
  const segments = longformSegments(script)

  assert.equal(longformPartCount(script), 1)
  assert.equal(segments.length, 1)
  assert.deepEqual(segments[0], [{ gi: 0, sequenceStart: 0, sequenceEnd: 3 }])
})

test('롱폼 미리보기용 세력 slice에는 내부 쇼츠 경계를 제외한 전체 이야기만 남는다', () => {
  const script = scriptWithInternalCut()
  const [first] = longformSegments(script)
  const firstStep = first[0]
  assert.ok('gi' in firstStep)

  const firstSlice = longformSliceGroup(script, firstStep)

  assert.deepEqual(firstSlice?.sequence, [
    { kind: 'cluster', clusterIndex: 0 },
    { kind: 'cluster', clusterIndex: 1 },
  ])
  assert.equal(firstSlice?.clusters?.[0].disabled, undefined)
  assert.equal(firstSlice?.clusters?.[1].disabled, undefined)
})

test('assigned beats are person cards while contiguous unassigned beats remain narrative scenes', () => {
  const script: FactionScript = {
    title: 'Unified scene timing',
    groups: [{
      name: 'group',
      people: [],
      clusters: [{
        label: 'scene',
        image: 'scene.webp',
        people: [{
          isPerson: true,
          celebId: 'achilles-id',
          name: 'Achilles',
          lines: ['warrior'],
          epithet: 'swift-footed',
        }],
        beats: [
          { text: 'narration one' },
          { text: 'narration two' },
          { speakerCelebId: 'achilles-id', speaker: 'old name', text: 'first line\nsecond line' },
          { text: 'closing narration' },
        ],
      }],
    }],
  }

  // intro + cluster card + narrative run + person card + narrative run
  assert.equal(cueCount(script), 5)
  assert.ok(totalSec(script) > 0)
})

test('speaker ids resolve episode-wide and honor the source person disabled flag', () => {
  const script: FactionScript = {
    title: 'Episode-wide speaker assignment',
    groups: [{
      name: 'group',
      people: [],
      clusters: [
        {
          label: 'person source',
          people: [{ isPerson: true, celebId: 'odysseus-id', name: 'Odysseus', disabled: true }],
        },
        {
          label: 'later scene',
          people: [],
          beats: [{ speakerCelebId: 'odysseus-id', speaker: 'legacy label', text: 'I returned.' }],
        },
      ],
    }],
  }

  // The assigned beat is omitted with its disabled source person, leaving intro only.
  assert.equal(cueCount(script), 1)
})

test('길이 미리보기도 두 번째 자동 대사에서 인물 신원 리드를 제외한다', () => {
  const makeScript = (forceSecondIdentity: boolean): FactionScript => ({
    title: 'Repeated speaker identity timing',
    groups: [{
      name: 'group',
      people: [],
      clusters: [{
        people: [{
          isPerson: true,
          celebId: 'odysseus-id',
          name: 'Odysseus',
          lines: ['King of Ithaca', 'Veteran of Troy'],
          epithet: 'The man of many turns',
        }],
        beats: [
          { speakerCelebId: 'odysseus-id', text: 'First line' },
          {
            speakerCelebId: 'odysseus-id',
            text: 'Second line',
            ...(forceSecondIdentity ? { hideIdentity: false } : {}),
          },
        ],
      }],
    }],
  })

  assert.ok(totalSec(makeScript(true)) > totalSec(makeScript(false)))
})
