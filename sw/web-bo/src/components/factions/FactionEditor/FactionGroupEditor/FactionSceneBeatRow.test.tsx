import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionVoiceProvider } from '../../shared/FactionVoiceContext'
import { FactionSceneBeatRow } from './FactionSceneBeatRow'

globalThis.React = React

test('dialogue beat exposes its intra-dialogue screen transitions', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{
        speakerCelebId: 'achilles-id',
        speaker: '아킬레스',
        text: '첫 번째 대사\n두 번째 대사\n세 번째 대사',
        media: 'achilles-1.png',
        mediaChanges: [{ chunk: 1, media: 'achilles-2.png' }],
      } as any}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Iliad"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[{ celebId: 'achilles-id', name: '아킬레스' }]}
      speakerPeople={[{ celebId: 'achilles-id', name: '아킬레스' }]}
    />,
  )

  assert.match(markup, /data-faction-scene-image-rail="true"/)
  assert.match(markup, /화면 전환/)
  assert.match(markup, /전환 추가/)
  assert.match(markup, /#2 전환/)
  assert.match(markup, /value="1" selected=""/)
  assert.doesNotMatch(markup, /data-faction-scene-media-changes="true"/)
  // 기존 개인 대사 편집기처럼 첫 화보 구간과 전환 뒤 구간이 서로 다른 배경색으로 칠해진다.
  assert.match(markup, /bg-amber-400\/25/)
  assert.match(markup, /bg-blue-400\/25/)
  // 전환 위치는 별도 카드만이 아니라 대사 줄 사이의 점선 가로선으로도 직접 드러난다.
  assert.match(markup, /border-t-2 border-dashed[^"\n]*border-blue-400/)
})

test('장면 발화는 자유 화자 칸 대신 에피소드 인물 할당을 제공하고 종류색을 쓰지 않는다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speakerCelebId: 'odysseus', speaker: '옛 이름', text: '활을 가져오너라.' }}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={0}
      clusterIndex={0}
      localPeople={[]}
      speakerPeople={[
        { celebId: 'odysseus', name: '오디세우스', nameEn: 'Odysseus' },
        { celebId: 'penelope', name: '페넬로페', nameEn: 'Penelope' },
      ]}
    />,
  )

  assert.match(markup, /aria-label="1번 발화 인물 할당"/)
  assert.match(markup, /value="odysseus" selected=""/)
  assert.match(markup, />오디세우스</)
  assert.match(markup, />페넬로페</)
  assert.doesNotMatch(markup, /border-amber|bg-amber|text-amber/)
})

test('화자 없는 해설은 출연진에 없는 공용 나레이터로 보이고 같은 음성 패널을 쓴다', () => {
  const markup = renderToStaticMarkup(
    <FactionVoiceProvider value={{
      celebVoices: {},
      byFile: new Map(),
      voiceUrl: file => `/voice/${file}`,
      regenerate: () => {},
      regeneratingFile: null,
      save: async () => true,
      commonNarrationVoice: {
        quoteSpeaker: 'Charon',
        quoteElevenlabsVoiceId: 'narrator-ele',
        quotePlaybackRate: 0.95,
      },
    }}>
      <FactionSceneBeatRow
        beat={{ text: '거인은 동료를 잡아먹고, 오디세우스는 머리를 쓴다.' }}
        index={0}
        total={1}
        onChange={() => {}}
        onMove={() => {}}
        onDelete={() => {}}
        editLang="ko"
        series="faction"
        episodeName="Homer-Odyssey"
        groupIndex={1}
        clusterIndex={0}
        localPeople={[]}
        speakerPeople={[]}
      />
    </FactionVoiceProvider>,
  )

  assert.match(markup, /나레이터 해설/)
  assert.match(markup, /나레이터 · 공용 화자/)
  assert.match(markup, /출연진 제외 · 공용 목소리 상속/)
  assert.match(markup, /공용 나레이터 상속 중/)
  assert.match(markup, /나레이터 해설 음성/)
  assert.match(markup, /공용 나레이터 설정/)
  assert.doesNotMatch(markup, /웹팩션 대표 대사/)
})

test('미할당 화자 이름과 화면 표시 여부를 같은 컷에서 편집한다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speaker: '화자', text: '동료 여섯이 잡아먹힌다.' }}
      index={2}
      total={3}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={8}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /aria-label="3번 미할당 화자 이름"/)
  assert.match(markup, /value="화자"/)
  assert.match(markup, /이름 화면 중앙 표시/)
})

test('라벨이 없는 컷은 헤더에서 컷 라벨을 추가할 수 있다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ text: '새 컷이다.' }}
      index={1}
      total={2}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /aria-label="2번 컷 라벨 추가"/)
  assert.match(markup, />\+ 컷 라벨</)
  assert.doesNotMatch(markup, /data-faction-scene-cut-label="true"/)
})

test('기존 컷 라벨은 같은 영역에서 편집하고 명시적으로 삭제할 수 있다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ text: '바다로 돌아간다.', label: '저승을 빠져나오다', labelEn: 'Leaving the Underworld' }}
      index={3}
      total={4}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="both"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /data-faction-scene-cut-label="true"/)
  assert.match(markup, /value="저승을 빠져나오다"/)
  assert.match(markup, /value="Leaving the Underworld"/)
  assert.match(markup, /aria-label="4번 컷 라벨 삭제"/)
  assert.doesNotMatch(markup, /aria-label="4번 컷 라벨 추가"/)
})

test('인물 할당 대사에는 웹팩션 대표 대사 선택이 보인다', () => {
  const odysseus = { celebId: 'odysseus-id', name: '오디세우스' }
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speakerCelebId: 'odysseus-id', speaker: '오디세우스', text: '내 이름은 오디세우스다.' }}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={8}
      localPeople={[odysseus]}
      speakerPeople={[odysseus]}
    />,
  )

  assert.match(markup, /웹팩션 대표 대사/)
})

test('인물 할당 대사는 이름 표시를 첫 대사 자동·강제 표시·숨김으로 오버라이드한다', () => {
  const odysseus = { celebId: 'odysseus-id', name: '오디세우스' }
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speakerCelebId: 'odysseus-id', speaker: '오디세우스', text: '내 이름은 오디세우스다.' }}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={8}
      localPeople={[odysseus]}
      speakerPeople={[odysseus]}
    />,
  )

  assert.match(markup, /aria-label="1번 인물 이름 표시"/)
  assert.match(markup, />자동 · 첫 대사만</)
  assert.match(markup, />강제 표시</)
  assert.match(markup, />숨김</)
})

test('두 번째 이후 컷에는 이 지점부터 새 장면으로 분리하는 동작이 보인다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ text: '이 대사부터 다른 장면이다.' }}
      index={1}
      total={3}
      onChange={() => {}}
      onMove={() => {}}
      onSplit={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={2}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, />이 컷부터 장면 분리</)
  assert.match(markup, /이 컷과 아래 컷을 바로 다음 새 장면으로 옮깁니다/)
  assert.doesNotMatch(markup, /disabled=""[^>]*>이 컷부터 장면 분리/)
})

test('말 없는 화면 컷은 컷 번호와 최소 재생 시간을 편집한다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ text: '', minimumSec: 4.5 }}
      index={0}
      total={2}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /컷 1/)
  assert.match(markup, /화면 컷/)
  assert.match(markup, /aria-label="1번 컷 최소 재생 시간"/)
  assert.match(markup, /value="4.5"/)
})

test('해설과 인물 대사도 자동 길이 위에 최소 재생 시간을 지정할 수 있다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speaker: '해설', text: '바다는 잠잠해졌다.' }}
      index={1}
      total={2}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /aria-label="2번 컷 최소 재생 시간"/)
  assert.match(markup, /placeholder="자동"/)
})

test('통합된 모든 컷 안에서 기존 SFX를 고르고 미리듣고 해제한다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ text: '파도가 뱃전을 때린다.', sfx: 'wave.mp3', sfxStartPercent: 35 }}
      index={2}
      total={3}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      sfxList={['chime.wav', 'wave.mp3', 'whoosh.wav']}
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /data-faction-scene-sfx="true"/)
  assert.match(markup, /aria-label="3번 컷 효과음 선택"/)
  assert.match(markup, /value="wave\.mp3" selected=""/)
  assert.match(markup, /wave\.mp3 효과음 미리듣기/)
  assert.match(markup, /aria-label="3번 컷 효과음 해제"/)
  assert.match(markup, /이 컷 안에서 1회 재생/)
  assert.match(markup, /data-faction-scene-sfx-timing="true"/)
  assert.match(markup, /aria-label="3번 컷 효과음 시작 시점"/)
  assert.match(markup, /value="35"/)
  assert.match(markup, />35%<\/output>/)
  assert.match(markup, /컷 시작 · 0%/)
  assert.match(markup, /컷 끝 · 100%/)
})

test('구 자유 문자열 화자는 지우지 않고 미할당으로 드러낸다', () => {
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speaker: '선원들', text: '열어 보자.' }}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      editLang="ko"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={0}
      clusterIndex={0}
      localPeople={[]}
      speakerPeople={[]}
    />,
  )

  assert.match(markup, /미할당 화자 · 선원들/)
  assert.doesNotMatch(markup, /공용 나레이터 상속 중/)
})

test('통합된 인물 대사도 기존 분할 편집기와 위치 기반 음원을 그대로 연다', () => {
  const voiceFile = 'F02C02P01-quote.wav'
  const circe = {
    name: '키르케',
    nameEn: 'Circe',
    celebId: 'circe-id',
    quoteSpeaker: 'Aoede',
    quotePlaybackRate: 1.15,
  }
  const markup = renderToStaticMarkup(
    <FactionVoiceProvider value={{
      celebVoices: {},
      byFile: new Map([[voiceFile, { file: voiceFile, size: 327004, duration: 6.81 }]]),
      voiceUrl: file => `/voice/${file}`,
      regenerate: () => {},
      regeneratingFile: null,
      save: async () => true,
      series: 'faction',
      episodeName: 'Homer-Odyssey',
    }}>
      <FactionSceneBeatRow
        beat={{
          speakerCelebId: 'circe-id',
          speaker: '키르케',
          text: '여행에 지친 이들이여,\n먹고 마셔요.',
          legacyPersonVoice: true,
          voiceSpeaker: 'Aoede',
          voiceDuration: 6.81,
          voicePlaybackRate: 1.15,
        }}
        index={0}
        total={1}
        onChange={() => {}}
        onMove={() => {}}
        onDelete={() => {}}
        onAssignedPersonChange={() => {}}
        editLang="ko"
        series="faction"
        episodeName="Homer-Odyssey"
        groupIndex={1}
        clusterIndex={1}
        localPeople={[circe]}
        speakerPeople={[circe]}
      />
    </FactionVoiceProvider>,
  )

  assert.match(markup, /줄 사이에서 화면을 전환할 수 있습니다/)
  assert.match(markup, /data-faction-scene-voice-file="F02C02P01-quote\.wav"/)
  assert.match(markup, /대사 음성/)
  assert.match(markup, /6\.8s/)
  assert.match(markup, /인물 기본값 위에 2개 오버라이드/)
  assert.match(markup, /인물 기본 음성 편집/)
})

test('구 연결 표식이 빠졌어도 같은 인물 대사와 실제 위치 음원이 있으면 음원을 다시 찾는다', () => {
  const voiceFile = 'F02C04P01-quote.wav'
  const calypso = {
    name: '칼립소',
    celebId: 'calypso-id',
    quote: '오디세우스, 당신이 두고 온 사람은 이제 예전의 모습이 아닐 거예요.',
  }
  const markup = renderToStaticMarkup(
    <FactionVoiceProvider value={{
      celebVoices: {},
      byFile: new Map([[voiceFile, { file: voiceFile, size: 280000, duration: 5.72 }]]),
      voiceUrl: file => `/voice/${file}`,
      regenerate: () => {},
      regeneratingFile: null,
      save: async () => true,
      series: 'faction',
      episodeName: 'Homer-Odyssey',
    }}>
      <FactionSceneBeatRow
        beat={{
          speakerCelebId: 'calypso-id',
          speaker: '칼립소',
          text: '오디세우스,\n당신이 두고 온 사람은\n\n이제 예전의 모습이 아닐 거예요.',
        }}
        index={0}
        total={1}
        onChange={() => {}}
        onMove={() => {}}
        onDelete={() => {}}
        editLang="ko"
        series="faction"
        episodeName="Homer-Odyssey"
        groupIndex={1}
        clusterIndex={3}
        localPeople={[calypso]}
        speakerPeople={[calypso]}
      />
    </FactionVoiceProvider>,
  )

  assert.match(markup, /data-faction-scene-voice-file="F02C04P01-quote\.wav"/)
  assert.match(markup, /5\.7s/)
})

test('인물로 할당된 대사 항목 안에서 기존 표시 방식과 쇼츠·롱폼 처리 단계를 편집한다', () => {
  const circe = {
    name: '키르케',
    nameEn: 'Circe',
    celebId: 'circe-id',
    lines: ['아이아이에 섬의 마녀'],
    linesEn: ['Witch of Aeaea'],
    epithet: '사람을 짐승으로 바꾸는 신비로운 마녀',
    epithetEn: 'The enchantress who turns people into beasts',
    image: 'circe.webp',
    quoteDisplay: 'caption' as const,
    quoteCaptionPos: 'center' as const,
    stepCreditShorts: true,
    stepEpithetShorts: false,
    stepVoiceShorts: true,
    stepCreditLongform: false,
    stepEpithetLongform: true,
    stepVoiceLongform: true,
  }
  const markup = renderToStaticMarkup(
    <FactionSceneBeatRow
      beat={{ speakerCelebId: 'circe-id', speaker: '키르케', text: '먹고 마셔요.' }}
      index={0}
      total={1}
      onChange={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onAssignedPersonChange={() => {}}
      editLang="both"
      series="faction"
      episodeName="Homer-Odyssey"
      groupIndex={1}
      clusterIndex={1}
      localPeople={[circe]}
      speakerPeople={[circe]}
    />,
  )

  assert.match(markup, /대사 표시/)
  assert.match(markup, /data-faction-assigned-person-settings="true"/)
  assert.match(markup, /인물 기본값/)
  assert.match(markup, /직함 1줄 · 수식어 있음 · 기본 화보 있음/)
  assert.match(markup, /English name/)
  assert.match(markup, /English credits/)
  assert.match(markup, /Witch of Aeaea/)
  assert.match(markup, /English epithet/)
  assert.match(markup, /value="caption" selected=""/)
  assert.match(markup, /쇼츠\(S\) 처리/)
  assert.match(markup, /롱폼\(L\) 처리/)
  assert.match(markup, /직함/)
  assert.match(markup, /수식어/)
  assert.match(markup, /음성/)
})

test('할당 대사의 인물 기본값 안에서 기존 수식어 음원을 재생하고 설정한다', () => {
  const voiceFile = 'F01C01P01-epithet.wav'
  const circe = {
    name: '키르케',
    celebId: 'circe-id',
    epithet: '사람을 짐승으로 바꾸는 신비로운 마녀',
    epithetSpeaker: 'Kore',
  }
  const markup = renderToStaticMarkup(
    <FactionVoiceProvider value={{
      celebVoices: {},
      byFile: new Map([[voiceFile, { file: voiceFile, size: 120000, duration: 3.4 }]]),
      voiceUrl: file => `/voice/${file}`,
      regenerate: () => {},
      regeneratingFile: null,
      save: async () => true,
      series: 'faction',
      episodeName: 'Homer-Odyssey',
    }}>
      <FactionSceneBeatRow
        beat={{ speakerCelebId: 'circe-id', speaker: '키르케', text: '먹고 마셔요.' }}
        index={0}
        total={1}
        onChange={() => {}}
        onMove={() => {}}
        onDelete={() => {}}
        onAssignedPersonChange={() => {}}
        editLang="ko"
        series="faction"
        episodeName="Homer-Odyssey"
        groupIndex={0}
        clusterIndex={0}
        localPeople={[]}
        speakerPeople={[circe]}
        speakerVoiceFiles={{ 'circe-id': { quote: 'F01C01P01-quote.wav', epithet: voiceFile } }}
      />
    </FactionVoiceProvider>,
  )

  assert.match(markup, /수식어 낭독 기본값/)
  assert.match(markup, /수식어 음성/)
  assert.match(markup, /3\.4s/)
  assert.match(markup, /F01C01P01-epithet\.wav/)
})
