import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCues, longformPartCount, narrativeMediaCutsOf, sceneBeatMediaStartSec } from '../src/compositions/Faction/timing'
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
      if (cue.kind === 'person') {
        const person = cue.personOverride
          ?? script.groups[cue.groupIndex]?.clusters?.[cue.clusterIndex]?.people[cue.personIndex]
        return [`person-${person?.name ?? cue.personIndex}`]
      }
      if (cue.kind === 'scene') return [`scene-${cue.scene.name}`]
      return []
    })
}

function longformStoryKinds(script: FactionScript, lvPart?: number): string[] {
  return buildCues(script, false, undefined, lvPart)
    .map(item => item.cue)
    .flatMap(cue => {
      if (cue.kind === 'person') {
        const person = cue.personOverride
          ?? script.groups[cue.groupIndex]?.clusters?.[cue.clusterIndex]?.people[cue.personIndex]
        return [`person-${person?.name ?? cue.personIndex}`]
      }
      if (cue.kind === 'scene') return [`scene-${cue.scene.name}`]
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

test('a single narrative beat can replace the cluster image at the cue start', () => {
  const scene = {
    isPerson: false,
    name: '저승을 빠져나오다',
    image: 'underworld-cluster.png',
    beats: [{
      label: '저승을 빠져나오다',
      text: '다시 길을 떠나 바다로 나선다.',
      media: 'odysseus-leaves-underworld.png',
    }],
  }
  const timings = factionSceneTiming({ beats: scene.beats }).beats

  assert.deepEqual(narrativeMediaCutsOf(scene, 120, 600, timings), [{
    at: 120,
    media: 'odysseus-leaves-underworld.png',
    crop: undefined,
    filter: undefined,
  }])
})

test('같은 장면의 통합 beat 목록은 화자 할당 flag에 따라 인물 컷과 해설 컷으로 렌더한다', () => {
  const script = scriptWith({
    name: '귀향길',
    clusters: [{
      people: [{ celebId: 'a-id', name: 'A', quote: '', quoteDisplay: 'caption' }],
      beats: [
        { speakerCelebId: 'a-id', speaker: 'A', text: '인물의 말' },
        { text: '폭풍이 몰려왔다.', label: '폭풍' },
      ],
    }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  })

  assert.deepEqual(storyKinds(script), ['person-A', 'scene-폭풍'])
  const personCue = buildCues(script, true).map(item => item.cue).find(item => item.kind === 'person')
  assert.ok(personCue?.kind === 'person')
  assert.equal(personCue.personOverride?.quote, '인물의 말')
  assert.deepEqual(personCue.personOverride?.quoteChunks, ['인물의 말'])
  assert.equal(personCue.personOverride?.quoteDisplay, 'caption')
})

test('장면명 위치는 미할당 해설의 장면명과 본문 슬롯에도 함께 전달된다', () => {
  const script = {
    ...scriptWith({
      name: '귀향길',
      clusters: [{
        label: '저승을 빠져나오다',
        labelPosition: 'bottom',
        people: [],
        beats: [{ text: '다시 바다로 나섰다.' }],
      }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }),
    quoteCaptionPos: 'center' as const,
  }

  const cue = buildCues(script, true).map(item => item.cue).find(item => item.kind === 'scene')
  assert.ok(cue?.kind === 'scene')
  assert.equal(cue.scene.name, '저승을 빠져나오다')
  assert.equal(cue.scene.quoteCaptionPos, 'bottom')
})

test('화자 없는 해설은 출연 인물이 아니라 공용 나레이터 음성을 상속한 장면 cue가 된다', () => {
  const script = {
    ...scriptWith({
      name: '귀향길',
      clusters: [{
        label: '거인의 동굴',
        people: [],
        beats: [{ text: '거인은 동료를 잡아먹고, 오디세우스는 머리를 쓴다.', voiceGainDb: 2 }],
      }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }),
    narrator: {
      logline: {
        quoteSpeaker: 'Charon',
        quoteElevenlabsVoiceId: 'narrator-ele',
        quoteGainDb: 1,
        quotePlaybackRate: 0.95,
      },
    },
  } as FactionScript

  const cue = buildCues(script, true).map(item => item.cue).find(item => item.kind === 'scene')
  assert.ok(cue?.kind === 'scene')
  const beat = cue.scene.beats?.[0]
  assert.equal(beat?.speaker, undefined)
  assert.equal(beat?.speakerCelebId, undefined)
  assert.equal(beat?.voiceSpeaker, 'Charon')
  assert.equal(beat?.voiceElevenlabsVoiceId, 'narrator-ele')
  assert.equal(beat?.voiceGainDb, 2)
  assert.equal(beat?.voicePlaybackRate, 0.95)
})

test('장면 대사는 할당된 인물 UUID에서 현재 이름과 기본 음성을 상속한다', () => {
  const script = scriptWith({
    name: '궁전',
    clusters: [{
      people: [
        {
          celebId: 'odysseus',
          name: '오디세우스',
          quoteSpeaker: 'Kore',
          quoteElevenlabsVoiceId: 'ele-odysseus',
          quote: '',
        },
        {
          isPerson: false,
          name: '활의 시험',
          beats: [{ speakerCelebId: 'odysseus', speaker: '옛 이름', text: '활을 가져오너라.' }],
        },
      ],
    }],
    sequence: [
      { kind: 'cluster', clusterIndex: 0 },
      { kind: 'entry', clusterIndex: 0, entryIndex: 1 },
    ],
  })

  const cue = buildCues(script, true).map(item => item.cue).find(item => item.kind === 'person' && item.personOverride?.quote === '활을 가져오너라.')
  assert.ok(cue?.kind === 'person')
  assert.equal(cue.personOverride?.name, '오디세우스')
  assert.equal(cue.personOverride?.quote, '활을 가져오너라.')
  assert.equal(cue.personOverride?.quoteSpeaker, 'Kore')
  assert.equal(cue.personOverride?.quoteElevenlabsVoiceId, 'ele-odysseus')
})

test('구 openingScenes/scenesAfter 파일도 cluster별 장면 cue로 합친다', () => {
  const script = scriptWith({
    name: '귀향길',
    openingScenes: [{ title: '동굴 탈출' }],
    clusters: [
      { people: [{ name: 'A', quote: '' }], scenesAfter: [{ title: '함대 파괴' }] },
      { people: [{ name: 'B', quote: '' }] },
    ],
  })

  assert.deepEqual(storyKinds(script), ['scene-동굴 탈출', 'person-A', 'scene-함대 파괴', 'person-B'])
})

test('장면 내부 shortsCutBefore는 쇼츠만 두 편으로 나누고 롱폼 장면은 하나로 이어 붙인다', () => {
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
  assert.deepEqual(longformStoryKinds(script), ['person-A', 'scene-폭풍', 'person-B'])
  assert.deepEqual(storyKinds(script, 1), ['person-A', 'scene-폭풍'])
  assert.deepEqual(storyKinds(script, 2), ['scene-귀항', 'person-B'])
})

test('인물의 영상 제외·롱폼 전용 flag는 그 인물에게 할당된 장면 대사에 그대로 적용한다', () => {
  const script = scriptWith({
    name: '궁전',
    clusters: [{
      people: [
        { celebId: 'hidden', name: '제외 인물', disabled: true },
        { celebId: 'long', name: '롱폼 인물', longformOnly: true },
        { celebId: 'both', name: '공통 인물' },
      ],
      beats: [
        { speakerCelebId: 'hidden', text: '제외' },
        { speakerCelebId: 'long', text: '롱폼' },
        { speakerCelebId: 'both', text: '공통' },
      ],
    }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  })

  const shorts = buildCues(script, true).map(item => item.cue).filter(item => item.kind === 'person')
  const longform = buildCues(script, false).map(item => item.cue).filter(item => item.kind === 'person')
  assert.deepEqual(shorts.map(item => item.kind === 'person' ? item.personOverride?.quote : ''), ['공통'])
  assert.deepEqual(longform.map(item => item.kind === 'person' ? item.personOverride?.quote : ''), ['롱폼', '공통'])
})

test('통합 인물 대사는 기존 화면 전환·표시 방식·처리 단계를 그대로 사용한다', () => {
  const script = scriptWith({
    name: '저승',
    clusters: [{
      people: [{
        celebId: 'achilles-id',
        name: '아킬레스',
        quote: '',
        quoteDisplay: 'caption',
        quoteCaptionPos: 'center',
        stepCreditShorts: true,
        stepEpithetShorts: false,
        stepVoiceShorts: true,
      }],
      beats: [{
        speakerCelebId: 'achilles-id',
        text: '첫 문장\n둘째 문장',
        media: 'achilles-1.png',
        mediaChanges: [{ chunk: 1, media: 'achilles-2.png' }],
        voiceDuration: 4.8,
      }],
    }],
    sequence: [{ kind: 'cluster', clusterIndex: 0 }],
  })

  const cue = buildCues(script, true).map(item => item.cue).find(item => item.kind === 'person')
  assert.ok(cue?.kind === 'person')
  assert.deepEqual(cue.steps, { credit: true, epithet: false, voice: true, identity: true })
  assert.equal(cue.personOverride?.quoteDisplay, 'caption')
  assert.equal(cue.personOverride?.quoteCaptionPos, 'center')
  assert.equal(cue.personOverride?.quoteImage, 'achilles-1.png')
  assert.deepEqual(cue.personOverride?.imageChanges, [{ chunk: 1, image: 'achilles-2.png' }])
  assert.equal(cue.personOverride?.quoteDuration, 4.8)
})
