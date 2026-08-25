import assert from 'node:assert/strict'
import test from 'node:test'
import {
  legacyFactionEntryToSceneBeats,
  legacyFactionPersonToSceneBeat,
  projectFactionPrimaryQuotesToGroups,
  projectFactionSceneBeatsToPeople,
} from './faction-scene-unification'

test('구 인물 quote는 화자 UUID·사진·음성을 가진 평범한 장면 대사 항목이 된다', () => {
  const beat = legacyFactionPersonToSceneBeat({
    name: '키르케',
    nameEn: 'Circe',
    celebId: 'circe-id',
    quoteChunks: ['여행에 지친 이들이여,', '먹고 마셔요.'],
    quoteImage: 'circe-quote.webp',
    quoteSpeaker: 'Kore',
    quoteDuration: 4.2,
  })
  assert.deepEqual(beat, {
    speakerCelebId: 'circe-id',
    speaker: '키르케',
    speakerEn: 'Circe',
    text: '여행에 지친 이들이여,\n먹고 마셔요.',
    textEn: undefined,
    media: 'circe-quote.webp',
    mediaCrop: undefined,
    voiceDuration: 4.2,
    voiceGainDb: undefined,
    voicePlaybackRate: undefined,
    voiceSpeaker: 'Kore',
    voiceStyle: undefined,
    voiceElevenlabsVoiceId: undefined,
    voiceElevenlabsVoiceIdEn: undefined,
    legacyPersonVoice: true,
  })
})

test('구 개인 대사의 ElevenLabs 세부 설정도 통합 beat로 옮긴다', () => {
  const beat = legacyFactionPersonToSceneBeat({
    name: '키르케',
    quote: '먹고 마셔요.',
    quoteEleOptions: { stability: 0.4, style: 0.7 },
    quoteEleEmotions: ['seductive'],
    quoteEleTrail: false,
  })

  assert.deepEqual(beat.voiceEleOptions, { stability: 0.4, style: 0.7 })
  assert.deepEqual(beat.voiceEleEmotions, ['seductive'])
  assert.equal(beat.voiceEleTrail, false)
})

test('구 독립 장면 제목·배경·최소 길이·효과음은 첫 대사 항목 속성으로 보존된다', () => {
  const beats = legacyFactionEntryToSceneBeats({
    name: '저승으로 가는 길을 듣다',
    image: 'underworld.webp',
    durationSec: 7,
    sfx: 'wind.wav',
    beats: [{ text: '잔치로 한 해가 지나고' }, { text: '키르케가 길을 일러준다.' }],
  })
  assert.equal(beats.length, 2)
  assert.deepEqual(beats[0], {
    text: '잔치로 한 해가 지나고',
    label: '저승으로 가는 길을 듣다',
    labelEn: undefined,
    media: 'underworld.webp',
    mediaCrop: undefined,
    minimumSec: 7,
    sfx: 'wind.wav',
  })
  assert.deepEqual(beats[1], { text: '키르케가 길을 일러준다.' })
})

test('장면 beats가 도감 호환 quote 컬럼의 유일한 투영 원천이 된다', () => {
  const [person] = projectFactionSceneBeatsToPeople(
    [{ name: '키르케', celebId: 'circe-id', image: 'circe.webp', role: '마녀' }],
    [
      { speakerCelebId: 'circe-id', text: '첫 문장\n둘째 문장', media: 'circe.webp' },
      { speakerCelebId: 'circe-id', text: '셋째 문장', media: 'underworld.webp' },
    ],
  )
  assert.equal(person.quote, '첫 문장 둘째 문장 셋째 문장')
  assert.deepEqual(person.quoteChunks, ['첫 문장', '둘째 문장', '셋째 문장'])
  assert.equal(person.quoteImage, undefined)
  assert.deepEqual(person.imageChanges, [{ chunk: 2, image: 'underworld.webp' }])
  assert.equal(person.role, '마녀')
})

test('대표로 고른 한 대사만 인물 기본 대사와 웹팩션 대사로 투영한다', () => {
  const [person] = projectFactionSceneBeatsToPeople(
    [{ name: '오디세우스', celebId: 'odysseus-id', image: 'odysseus.webp' }],
    [
      { speakerCelebId: 'odysseus-id', text: '첫 대사', media: 'first.webp' },
      { speakerCelebId: 'odysseus-id', text: '대표 대사', media: 'featured.webp', primaryQuote: true } as any,
    ],
  )

  assert.equal(person.quote, '대표 대사')
  assert.deepEqual(person.quoteChunks, ['대표 대사'])
  assert.equal(person.quoteImage, 'featured.webp')
  assert.equal(person.imageChanges, undefined)
})

test('대표 대사와 인물 배치가 서로 다른 장면이어도 웹팩션 quote를 갱신한다', () => {
  const groups = projectFactionPrimaryQuotesToGroups([{
    name: '귀향길',
    people: [{ name: '오디세우스', celebId: 'odysseus-id', quote: '구형 배치 대사' }],
    clusters: [
      { people: [{ name: '오디세우스', celebId: 'odysseus-id', quote: '이전 대사' }], beats: [] },
      {
        people: [],
        beats: [{
          speakerCelebId: 'odysseus-id',
          text: '난 이타카의 오디세우스다.',
          primaryQuote: true,
        }],
      },
    ],
  }])

  assert.equal((groups[0].clusters as any[])[0].people[0].quote, '난 이타카의 오디세우스다.')
  assert.equal(groups[0].people[0].quote, '난 이타카의 오디세우스다.')
})

test('beat가 음성을 오버라이드하지 않으면 인물의 기존 기본 음성을 지우지 않는다', () => {
  const [person] = projectFactionSceneBeatsToPeople(
    [{
      name: '키르케',
      celebId: 'circe-id',
      quoteSpeaker: 'Aoede',
      quotePlaybackRate: 1.15,
      quoteEleOptions: { stability: 0.4 },
    }],
    [{ speakerCelebId: 'circe-id', text: '먹고 마셔요.' }],
  )

  assert.equal(person.quoteSpeaker, 'Aoede')
  assert.equal(person.quotePlaybackRate, 1.15)
  assert.deepEqual(person.quoteEleOptions, { stability: 0.4 })
})

test('legacy dialogue image changes keep their chunk positions inside the unified beat', () => {
  const beat = legacyFactionPersonToSceneBeat({
    name: 'Achilles',
    celebId: 'achilles-id',
    quoteChunks: ['first', 'second', 'third'],
    quoteImage: 'achilles-1.png',
    imageChanges: [{
      chunk: 2,
      image: 'achilles-2.png',
      crop: { x: 45, y: 30, scale: 1.2 },
      filter: 'vintage',
      zoomFocus: { x: 60, y: 25 },
    }],
  } as any)

  assert.deepEqual((beat as any).mediaChanges, [{
    chunk: 2,
    media: 'achilles-2.png',
    crop: { x: 45, y: 30, scale: 1.2 },
    filter: 'vintage',
    zoomFocus: { x: 60, y: 25 },
  }])

  const [person] = projectFactionSceneBeatsToPeople(
    [{ name: 'Achilles', celebId: 'achilles-id', image: 'achilles-profile.png' }],
    [beat],
  )
  assert.deepEqual((person as any).imageChanges, [{
    chunk: 2,
    image: 'achilles-2.png',
    crop: { x: 45, y: 30, scale: 1.2 },
    filter: 'vintage',
    zoomFocus: { x: 60, y: 25 },
  }])
})

test('beat-local media change positions are offset when one person has multiple dialogue beats', () => {
  const [person] = projectFactionSceneBeatsToPeople(
    [{ name: 'Odysseus', celebId: 'odysseus-id', image: 'profile.png' }],
    [
      {
        speakerCelebId: 'odysseus-id',
        text: 'one\ntwo',
        media: 'start.png',
        mediaChanges: [{ chunk: 1, media: 'middle.png' }],
      } as any,
      {
        speakerCelebId: 'odysseus-id',
        text: 'three\nfour',
        media: 'next-beat.png',
        mediaChanges: [{ chunk: 1, media: 'ending.png' }],
      } as any,
    ],
  )

  assert.deepEqual((person as any).imageChanges, [
    { chunk: 1, image: 'middle.png' },
    { chunk: 2, image: 'next-beat.png' },
    { chunk: 3, image: 'ending.png' },
  ])
})

test('기본 화보와 같은 경로로 명시된 구 대사 화보 설정도 왕복에서 지우지 않는다', () => {
  const legacy = {
    name: '히딩크',
    celebId: 'hiddink-id',
    quote: '나는 아직 배고프다.',
    image: 'hiddink.png',
    quoteImage: 'hiddink.png',
    quoteImageCrop: { x: 45, y: 40, scale: 1.1 },
    quoteImageFilter: 'sepia',
    quoteZoomFocus: { x: 55, y: 30 },
  }
  const beat = legacyFactionPersonToSceneBeat(legacy)
  const [projected] = projectFactionSceneBeatsToPeople([legacy], [beat])

  assert.equal(projected.quoteImage, legacy.quoteImage)
  assert.deepEqual(projected.quoteImageCrop, legacy.quoteImageCrop)
  assert.equal(projected.quoteImageFilter, legacy.quoteImageFilter)
  assert.deepEqual(projected.quoteZoomFocus, legacy.quoteZoomFocus)
})

test('구 대사 화보가 없어도 남아 있던 줌 목표점은 통합 저장에서 유실하지 않는다', () => {
  const legacy = {
    name: '아테나',
    celebId: 'athena-id',
    quote: '지혜롭게 고르거라.',
    image: 'athena.png',
    quoteZoomFocus: { x: 62, y: 18 },
  }
  const beat = legacyFactionPersonToSceneBeat(legacy)
  const [projected] = projectFactionSceneBeatsToPeople([legacy], [beat])

  assert.deepEqual(projected.quoteZoomFocus, legacy.quoteZoomFocus)
})

test('통합 beat를 저장해도 인물의 대사 표시 방식과 처리 단계는 그대로 남는다', () => {
  const legacy = {
    name: '키르케',
    celebId: 'circe-id',
    quote: '먹고 마셔요.',
    quoteDisplay: 'caption' as const,
    quoteCaptionPos: 'center' as const,
    quoteCaptionSize: 'large' as const,
    quoteCaptionFont: 'serif' as const,
    stepCreditShorts: true,
    stepEpithetShorts: false,
    stepVoiceShorts: true,
    stepCreditLongform: false,
    stepEpithetLongform: true,
    stepVoiceLongform: true,
  }
  const beat = legacyFactionPersonToSceneBeat(legacy)
  const [projected] = projectFactionSceneBeatsToPeople([legacy], [beat])

  assert.equal(projected.quoteDisplay, 'caption')
  assert.equal(projected.quoteCaptionPos, 'center')
  assert.equal(projected.quoteCaptionSize, 'large')
  assert.equal(projected.quoteCaptionFont, 'serif')
  assert.equal(projected.stepCreditShorts, true)
  assert.equal(projected.stepEpithetShorts, false)
  assert.equal(projected.stepVoiceShorts, true)
  assert.equal(projected.stepCreditLongform, false)
  assert.equal(projected.stepEpithetLongform, true)
  assert.equal(projected.stepVoiceLongform, true)
})
