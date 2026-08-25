import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertFactionSceneSpeakerAssignments,
  factionSceneSpeakerPeople,
  isFactionSceneNarrationBeat,
  resolveFactionSceneSpeaker,
  resolveFactionSceneVoice,
} from './faction-scene-speaker'

test('실제 인물만 UUID 기준으로 모으고 서사 항목과 중복 배치를 제외한다', () => {
  const people = factionSceneSpeakerPeople([{ clusters: [{ people: [
    { celebId: 'a', name: '오디세우스' },
    { celebId: 'a', name: '오디세우스 재등장' },
    { isPerson: false, name: '활의 시험' },
  ] }] }])

  assert.deepEqual(people.map(person => person.name), ['오디세우스'])
})

test('장면 발화는 할당된 인물의 현재 이름과 빈 음성 설정만 상속한다', () => {
  const beat = resolveFactionSceneSpeaker(
    {
      speakerCelebId: 'odysseus',
      speaker: '옛 이름',
      voiceStyle: '장면 전용 스타일',
    },
    [{
      celebId: 'odysseus',
      name: '오디세우스',
      nameEn: 'Odysseus',
      quoteSpeaker: 'Kore',
      quoteStyle: '인물 기본 스타일',
      quoteElevenlabsVoiceId: 'ele-ko',
      quoteEleOptions: { stability: 0.35 },
      quoteEleEmotions: ['seductive'],
      quoteEleTrail: false,
      quoteGainDb: 2,
      quotePlaybackRate: 1.1,
    }],
  )

  assert.equal(beat.speaker, '오디세우스')
  assert.equal(beat.speakerEn, 'Odysseus')
  assert.equal(beat.voiceSpeaker, 'Kore')
  assert.equal(beat.voiceStyle, '장면 전용 스타일')
  assert.equal(beat.voiceElevenlabsVoiceId, 'ele-ko')
  assert.deepEqual(beat.voiceEleOptions, { stability: 0.35 })
  assert.deepEqual(beat.voiceEleEmotions, ['seductive'])
  assert.equal(beat.voiceEleTrail, false)
  assert.equal(beat.voiceGainDb, 2)
  assert.equal(beat.voicePlaybackRate, 1.1)
})

test('장면 발화는 같은 에피소드에 배치된 인물만 할당할 수 있다', () => {
  assert.doesNotThrow(() => assertFactionSceneSpeakerAssignments([{ clusters: [{ people: [
    { celebId: 'odysseus', name: '오디세우스' },
    { isPerson: false, name: '활의 시험', beats: [{ speakerCelebId: 'odysseus' }] },
  ] }] }]))
  assert.throws(
    () => assertFactionSceneSpeakerAssignments([{ name: '궁전', clusters: [{ people: [
      { celebId: 'odysseus', name: '오디세우스' },
      { isPerson: false, name: '활의 시험', beats: [{ speakerCelebId: 'penelope' }] },
    ] }] }]),
    /궁전 · 활의 시험의 1번 발화가 이 에피소드에 없는 인물/,
  )
})

test('화자 없는 해설은 출연진을 만들지 않고 공용 나레이터 음성만 상속한다', () => {
  const beat = resolveFactionSceneVoice(
    { text: '거인은 동료를 잡아먹고, 오디세우스는 머리를 쓴다.', voiceStyle: '컷 전용 말투' } as any,
    [{ celebId: 'odysseus', name: '오디세우스', quoteSpeaker: 'Kore' }],
    {
      quoteSpeaker: 'Charon',
      quoteStyle: '낮고 차분하게',
      quoteElevenlabsVoiceId: 'narrator-ele',
      quoteGainDb: 1.5,
      quotePlaybackRate: 0.95,
    },
  )

  assert.equal(isFactionSceneNarrationBeat(beat), true)
  assert.equal(beat.speaker, undefined)
  assert.equal(beat.speakerCelebId, undefined)
  assert.equal(beat.voiceSpeaker, 'Charon')
  assert.equal(beat.voiceStyle, '컷 전용 말투')
  assert.equal(beat.voiceElevenlabsVoiceId, 'narrator-ele')
  assert.equal(beat.voiceElevenlabsVoiceIdEn, 'narrator-ele')
  assert.equal(beat.voiceGainDb, 1.5)
  assert.equal(beat.voicePlaybackRate, 0.95)
})

test('자유 화자명이 있는 미할당 발화는 공용 나레이터로 바꾸지 않는다', () => {
  const beat = resolveFactionSceneVoice(
    { speaker: '선원들', text: '자루를 열어 보자.' } as any,
    [],
    { quoteSpeaker: 'Charon', quoteElevenlabsVoiceId: 'narrator-ele' },
  )

  assert.equal(isFactionSceneNarrationBeat(beat), false)
  assert.equal(beat.voiceSpeaker, undefined)
  assert.equal(beat.voiceElevenlabsVoiceId, undefined)
})
