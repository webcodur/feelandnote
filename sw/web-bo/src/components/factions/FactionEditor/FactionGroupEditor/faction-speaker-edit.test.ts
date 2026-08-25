import assert from 'node:assert/strict'
import test from 'node:test'
import type { FactionGroup, FactionPerson } from '@/lib/faction-types'
import { remapFactionSceneVoiceFiles, vnSceneBeat } from '@/lib/faction-voice'
import {
  detachFactionCastPerson,
  factionSpeakerVoiceFiles,
  materializeFactionSceneVoiceFiles,
  updateFactionSpeakerPerson,
} from './faction-speaker-edit'

const person = (name: string, celebId: string): FactionPerson => ({ name, celebId })

test('장면 밖 첫 인물 배치를 고쳐도 모든 할당 대사의 이름 스냅샷이 함께 바뀐다', () => {
  const groups: FactionGroup[] = [
    { name: '첫 세력', people: [], clusters: [{ people: [person('키르케', 'circe')], beats: [] }] },
    { name: '둘째 세력', people: [], clusters: [{ people: [], beats: [{ speakerCelebId: 'circe', speaker: '키르케', text: '어서 오세요.' }] }] },
  ]
  const next = updateFactionSpeakerPerson(groups, 'circe', { ...groups[0]!.clusters![0]!.people[0]!, name: '키르케 여신', nameEn: 'Circe' })

  assert.equal(next[0]!.clusters![0]!.people[0]!.name, '키르케 여신')
  assert.equal(next[1]!.clusters![0]!.beats![0]!.speaker, '키르케 여신')
  assert.equal(next[1]!.clusters![0]!.beats![0]!.speakerEn, 'Circe')
})

test('인물 기본 음원은 렌더와 같은 첫 배치 좌표를 사용한다', () => {
  const groups: FactionGroup[] = [
    { name: '첫 세력', people: [], clusters: [{ people: [person('오디세우스', 'odysseus')], beats: [] }] },
    { name: '둘째 세력', people: [], clusters: [{ people: [person('오디세우스', 'odysseus')], beats: [] }] },
  ]

  assert.deepEqual(factionSpeakerVoiceFiles(groups).odysseus, {
    quote: 'F01C01P01-quote.wav',
    epithet: 'F01C01P01-epithet.wav',
  })
})

test('실제 구 음원이 남은 과도기 대사는 위치가 아니라 대사 항목의 명시 파일로 복구한다', () => {
  const groups: FactionGroup[] = [{
    name: '귀향길',
    people: [],
    clusters: [{
      people: [{ name: '칼립소', celebId: 'calypso', quote: '나와 함께해요. 우린 영원할 수 있어요.' }],
      beats: [{
        speakerCelebId: 'calypso',
        speaker: '칼립소',
        text: '나와 함께해요.\n\n우린 영원할 수 있어요.',
      }],
    }],
  }]
  const file = 'F01C01P01-quote.wav'
  const result = materializeFactionSceneVoiceFiles(groups, new Map([[file, { duration: 4.72 }]]))

  assert.equal(result.changed, 1)
  assert.equal(result.groups[0]?.clusters?.[0]?.beats?.[0]?.voiceFile, file)
  assert.equal(result.groups[0]?.clusters?.[0]?.beats?.[0]?.voiceDuration, 4.72)
})

test('본문을 고쳐 옛 음원에서 분리한 대사는 같은 인물 문장이어도 자동 복구하지 않는다', () => {
  const groups: FactionGroup[] = [{
    name: '귀향길',
    people: [],
    clusters: [{
      people: [{ name: '칼립소', celebId: 'calypso', quote: '새 문장' }],
      beats: [{ speakerCelebId: 'calypso', speaker: '칼립소', text: '새 문장', legacyPersonVoice: false }],
    }],
  }]
  const result = materializeFactionSceneVoiceFiles(groups, new Map([['F01C01P01-quote.wav', { duration: 2 }]]))

  assert.equal(result.changed, 0)
  assert.equal(result.groups[0]?.clusters?.[0]?.beats?.[0]?.voiceFile, undefined)
})

test('현재 화자·본문 해시의 장면 음원이 있으면 인물 할당과 무관하게 대사 항목에 고정한다', () => {
  const beat = { speaker: '폴리페모스', text: '아무도 아닌 이가\n나를 해친다!' }
  const groups: FactionGroup[] = [{
    name: '동굴',
    people: [],
    clusters: [{ people: [], beats: [beat] }],
  }]
  // 테스트가 파일명 구현을 복제하지 않도록 실제 함수로 만든 이름을 쓴다.
  const actualFile = vnSceneBeat(beat.speaker, beat.text)
  const result = materializeFactionSceneVoiceFiles(groups, new Map([[actualFile, { duration: 5.44 }]]))

  assert.equal(result.groups[0]?.clusters?.[0]?.beats?.[0]?.voiceFile, actualFile)
  assert.equal(result.groups[0]?.clusters?.[0]?.beats?.[0]?.voiceDuration, 5.44)
})

test('화자와 실제 발화문이 같으면 화면 조판용 줄바꿈을 바꿔도 장면 음원 파일명이 유지된다', () => {
  assert.equal(
    vnSceneBeat('폴리페모스', '아무도 아닌 이가\n\n나를 해친다!'),
    vnSceneBeat('폴리페모스', '아무도 아닌 이가 나를 해친다!'),
  )
})

test('출연 인물을 제거해도 대사·화자명·음원은 남고 인물 할당만 풀린다', () => {
  const result = detachFactionCastPerson(
    [{ name: '칼립소', nameEn: 'Calypso', celebId: 'calypso', quote: '함께해요.' }],
    [{ speakerCelebId: 'calypso', speaker: '칼립소', text: '함께해요.', legacyPersonVoice: true, voiceDuration: 2.4 }],
    0,
    1,
    3,
  )

  assert.equal(result.people.length, 0)
  assert.deepEqual(result.beats[0], {
    speakerCelebId: undefined,
    speaker: '칼립소',
    speakerEn: 'Calypso',
    text: '함께해요.',
    legacyPersonVoice: undefined,
    voiceFile: 'F02C04P01-quote.wav',
    voiceDuration: 2.4,
    hideIdentity: undefined,
    primaryQuote: undefined,
  })
})

test('세력·인물 이동으로 파일을 rename하면 대사 항목의 명시 파일명도 함께 바뀐다', () => {
  const groups: FactionGroup[] = [{
    name: '귀향길',
    people: [],
    clusters: [{
      people: [],
      beats: [{ text: '대사', voiceFile: 'F01C01P01-quote.wav' }],
    }],
  }]
  const next = remapFactionSceneVoiceFiles(groups, [{
    from: 'F01C01P01-quote.wav',
    to: 'F02C03P02-quote.wav',
  }])

  assert.equal(next[0]?.clusters?.[0]?.beats?.[0]?.voiceFile, 'F02C03P02-quote.wav')
})
