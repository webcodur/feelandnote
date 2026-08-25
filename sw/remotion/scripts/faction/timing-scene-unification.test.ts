import assert from 'node:assert/strict'
import test from 'node:test'
import { factionSceneBeatTimings } from '@feelandnote/shared/lib/faction-scene-timing'
import {
  activeFactionMediaLayers,
  buildCues,
  CROSSFADE_SEC,
  factionSceneCaptionPosition,
  f,
  narrativeEntryTextExitFrames,
  narrativeMediaCutsOf,
  personEntryMediaOf,
  personOfCue,
  sceneBeatTextExitFrames,
  sceneBeatCaptionMode,
  sceneTimingInputOf,
} from '../../src/compositions/Faction/timing'
import type { FactionPerson, FactionScript } from '../../src/compositions/Faction/types'

function assignedBeatScript(mediaAt?: 'beat' | 'text'): FactionScript {
  return {
    title: '이미지 전환 검사',
    groups: [{
      name: '항해자',
      solo: true,
      clusters: [{
        people: [{
          name: '오디세우스',
          celebId: 'odysseus-id',
          image: 'odysseus-base.webp',
          lines: ['이타카의 왕'],
        }],
        beats: [{
          speakerCelebId: 'odysseus-id',
          speaker: '오디세우스',
          text: '돛을 올려라.',
          media: 'odysseus-command.webp',
          mediaAt,
        }],
      }],
    }],
  } as FactionScript
}

function assignedPersonCue(script: FactionScript) {
  const cue = buildCues(script).find(entry => entry.cue.kind === 'person')?.cue
  if (!cue || cue.kind !== 'person') throw new Error('인물 cue가 만들어지지 않았다')
  return cue
}

test('인물 할당 컷의 컷 시작 이미지는 PersonCard에도 컷 시작 시점으로 전달된다', () => {
  const script = assignedBeatScript('beat')
  const person = personOfCue(script, assignedPersonCue(script))
  assert.equal(person?.quoteImage, 'odysseus-command.webp')
  assert.equal(person?.quoteImageAt, 'cue')
})

test('본문 시작 이미지 선택은 기존처럼 대사 시작 시점으로 전달된다', () => {
  const script = assignedBeatScript('text')
  const cue = assignedPersonCue(script)
  const person = personOfCue(script, cue)
  assert.ok(person)
  assert.equal(person?.quoteImageAt, 'quote')

  const media = personEntryMediaOf(person, script.groups[cue.groupIndex], cue.clusterIndex)
  assert.equal(media.image, 'odysseus-base.webp')
  assert.equal(media.quoteImageUsedAsBase, false)
})

test('컷 시작 이미지가 있는 할당 대사는 진입 크로스페이드부터 그 이미지를 기본 화면으로 쓴다', () => {
  const script = assignedBeatScript('beat')
  const cue = assignedPersonCue(script)
  const person = personOfCue(script, cue)
  assert.ok(person)

  const media = personEntryMediaOf(person, script.groups[cue.groupIndex], cue.clusterIndex)
  assert.equal(media.image, 'odysseus-command.webp')
  assert.equal(media.quoteImageUsedAsBase, true)
})

test('해설 컷 안의 줄 사이 화면 전환 이미지도 렌더 전환 목록에 들어간다', () => {
  const scene: FactionPerson = {
    isPerson: false,
    name: '키르케를 만나다',
    image: 'circe-house.webp',
    beats: [{
      text: '섬에 상륙한다.\n문을 두드린다.\n\n키르케가 일행을 맞는다.',
      media: 'arrival.webp',
      mediaChanges: [{ chunk: 3, media: 'circe-group.webp' }],
    }],
  }
  const timings = factionSceneBeatTimings(sceneTimingInputOf(scene))
  const cuts = narrativeMediaCutsOf(scene, 90, 600, timings)

  assert.deepEqual(cuts.map(cut => cut.media), ['arrival.webp', 'circe-group.webp'])
  assert.ok(cuts[1].at > cuts[0].at)
})

test('중간 컷 라벨이 뜨는 순간에는 앞 컷 본문이 이미 퇴장해 있다', () => {
  const scene: FactionPerson = {
    isPerson: false,
    name: '장면',
    beats: [
      { text: '앞 컷 본문' },
      { label: '중간 컷 라벨', text: '뒤 컷 본문' },
    ],
  }
  const timings = factionSceneBeatTimings(sceneTimingInputOf(scene))
  const labelTiming = timings[1]
  const [, previousTextGoneAt] = sceneBeatTextExitFrames(0, labelTiming)

  assert.equal(labelTiming.showsIdentity, true)
  assert.equal(previousTextGoneAt, Math.round(labelTiming.startSec * 60))
})

test('같은 화자가 이어 말할 때는 이름 없이 앞뒤 본문만 교차한다', () => {
  const scene: FactionPerson = {
    isPerson: false,
    name: '장면',
    beats: [
      { speaker: '화자', text: '앞 컷 본문' },
      { speaker: '화자', text: '뒤 컷 본문' },
    ],
  }
  const timings = factionSceneBeatTimings(sceneTimingInputOf(scene))
  const nextTiming = timings[1]
  const [previousTextExitStart, previousTextGoneAt] = sceneBeatTextExitFrames(0, nextTiming)

  assert.equal(nextTiming.showsIdentity, false)
  assert.equal(previousTextExitStart, Math.round(nextTiming.startSec * 60))
  assert.equal(previousTextGoneAt, Math.round(nextTiming.textStartSec * 60))
})

test('다음 장면명 카드가 들어오기 전에는 앞 해설 본문이 이미 퇴장해 있다', () => {
  const previousCueEnd = 600
  const nextLabelEnter = previousCueEnd - f(CROSSFADE_SEC)
  const [, previousTextGoneAt] = narrativeEntryTextExitFrames(previousCueEnd, CROSSFADE_SEC)

  assert.ok(previousTextGoneAt <= nextLabelEnter)
})

test('인물에 할당되지 않았어도 음성이 있는 화자 대사는 한 덩어리 자막으로 표시한다', () => {
  assert.equal(sceneBeatCaptionMode({
    speaker: '폴리페모스',
    text: '으아아아 도와줘! 아무도 아닌 이가 나를 해친다!',
    voiceDuration: 5.52,
  }), 'whole')
})

test('음성이 없는 대사와 순수 해설은 기존 점등 방식을 유지한다', () => {
  assert.equal(sceneBeatCaptionMode({
    speaker: '이웃 거인들',
    text: '친구가 이상한 소리를 한다.',
  }), 'progressive')
  assert.equal(sceneBeatCaptionMode({
    text: '배는 다시 바다로 나아간다.',
    voiceDuration: 3.2,
  }), 'progressive')
})

test('장면별 자막 위치가 없으면 에피소드 대사·장면 자막 위치를 상속한다', () => {
  assert.equal(factionSceneCaptionPosition(undefined, 'center'), 'center')
  assert.equal(factionSceneCaptionPosition('bottom', 'center'), 'bottom')
  assert.equal(factionSceneCaptionPosition(undefined, undefined), 'bottom')
})

test('폴리페무스 동굴처럼 컷마다 사진이 있으면 각 컷의 지정 사진만 전환 목록에 들어간다', () => {
  const scene: FactionPerson = {
    isPerson: false,
    name: '거인의 동굴로 들어가다',
    image: 'cave-entrance.png',
    beats: [
      { text: '동굴로 들어간다.', media: 'cut-1.png' },
      { text: '주인을 기다린다.', media: 'cut-2.png' },
      { text: '동료 여섯이 잡아먹힌다.', media: 'cut-3-polyphemus.png' },
    ],
  }
  const timings = factionSceneBeatTimings(sceneTimingInputOf(scene))
  const cuts = narrativeMediaCutsOf(scene, 90, 900, timings)

  assert.deepEqual(cuts.map(cut => cut.media), ['cut-1.png', 'cut-2.png', 'cut-3-polyphemus.png'])
})

test('인물 대사 뒤 해설 장면은 진입 크로스페이드부터 첫 해설 사진을 기본 배경으로 쓴다', () => {
  const script: FactionScript = {
    title: '저승 탈출 이미지 검사',
    groups: [{
      name: '저승',
      solo: true,
      clusters: [{
        label: '저승의 이들을 만나보다',
        image: 'underworld-group.png',
        people: [{ name: '아가멤논', celebId: 'agamemnon-id' }],
        beats: [
          { speakerCelebId: 'agamemnon-id', speaker: '아가멤논', text: '고향을 조심하게.', media: 'agamemnon.png' },
          { text: '일행은 다시 바다로 나선다.', media: 'odysseus-leaves-underworld.png' },
        ],
      }],
    }],
  } as FactionScript

  const cues = buildCues(script)
  const agamemnonIndex = cues.findIndex(entry => entry.cue.kind === 'person'
    && personOfCue(script, entry.cue)?.name === '아가멤논')
  const nextCue = cues[agamemnonIndex + 1]?.cue

  assert.equal(nextCue?.kind, 'scene')
  if (nextCue?.kind !== 'scene') return
  assert.equal(nextCue.scene.image, 'odysseus-leaves-underworld.png')
})

test('새 이미지 전환이 끝나면 이전 이미지 레이어를 렌더 트리에서 제거한다', () => {
  const starts = [100, 200, 300]
  const fadeFrames = 30

  assert.deepEqual(activeFactionMediaLayers(starts, 50, fadeFrames), {
    showBase: true,
    indexes: [],
  })
  assert.deepEqual(activeFactionMediaLayers(starts, 80, fadeFrames), {
    showBase: true,
    indexes: [0],
  })
  assert.deepEqual(activeFactionMediaLayers(starts, 190, fadeFrames), {
    showBase: false,
    indexes: [0, 1],
  })
  assert.deepEqual(activeFactionMediaLayers(starts, 200, fadeFrames), {
    showBase: false,
    indexes: [1],
  })
  assert.deepEqual(activeFactionMediaLayers(starts, 350, fadeFrames), {
    showBase: false,
    indexes: [2],
  })
  assert.deepEqual(activeFactionMediaLayers([100, 200, 200], 190, fadeFrames), {
    showBase: false,
    indexes: [0, 2],
  })
})

test('할당된 인물 이름은 첫 대사만 자동 표시하고 대사별 강제 표시·숨김을 따른다', () => {
  const script: FactionScript = {
    title: '화자 이름 자동 표시 검사',
    groups: [{
      name: '이타카',
      solo: true,
      clusters: [{
        people: [
          { name: '오디세우스', celebId: 'odysseus-id' },
          { name: '페넬로페', celebId: 'penelope-id' },
        ],
        beats: [
          { speakerCelebId: 'odysseus-id', speaker: '오디세우스', text: '첫 대사' },
          { speakerCelebId: 'penelope-id', speaker: '페넬로페', text: '첫 대사지만 숨긴다', hideIdentity: true },
          { speakerCelebId: 'odysseus-id', speaker: '오디세우스', text: '두 번째 대사' },
          { speakerCelebId: 'odysseus-id', speaker: '오디세우스', text: '다시 이름을 띄운다', hideIdentity: false },
          { speakerCelebId: 'penelope-id', speaker: '페넬로페', text: '두 번째 대사' },
        ],
      }],
    }],
  } as FactionScript

  const identitySteps = buildCues(script)
    .filter(entry => entry.cue.kind === 'person')
    .map(entry => entry.cue.kind === 'person' ? entry.cue.steps.identity : undefined)

  assert.deepEqual(identitySteps, [true, false, false, true, false])
})
