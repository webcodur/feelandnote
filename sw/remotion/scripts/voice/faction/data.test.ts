import assert from 'node:assert/strict'
import test from 'node:test'
import { vnSceneBeat } from '../../../src/compositions/Faction/voice-names'

process.argv.push('--episode', 'Homer-Odyssey')

const { buildVoiceJobs } = await import('./data')

test('통합 대사가 F 위치 음원을 직접 소유하면 같은 파일의 구 인물 잡을 중복 생성하지 않는다', () => {
  const file = 'F01C01P01-quote.wav'
  const jobs = buildVoiceJobs({
    title: '오디세이아',
    groups: [{
      name: '귀향길',
      people: [],
      clusters: [{
        people: [{
          name: '칼립소',
          celebId: 'calypso',
          quote: '나와 함께해요.',
          quoteChunks: ['나와 함께해요.'],
        }],
        beats: [{
          speakerCelebId: 'calypso',
          speaker: '칼립소',
          text: '나와 함께해요.',
          voiceFile: file,
        }],
      }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }],
  } as any)

  assert.equal(jobs.filter(job => job.file === file).length, 1)
  assert.equal(jobs.find(job => job.file === file)?.target, 'scene')
})

test('장면 음원명은 화면 줄바꿈이 아니라 실제로 읽는 문장을 기준으로 한다', () => {
  assert.equal(
    vnSceneBeat('폴리페모스', '포세이돈 아버지시여\n\n오만한 오디세우스를 벌해주소서.'),
    vnSceneBeat('폴리페모스', '포세이돈 아버지시여 오만한 오디세우스를 벌해주소서.'),
  )
})

test('화자 없는 장면 해설 잡은 에피소드 공용 나레이터 음성을 상속한다', () => {
  const jobs = buildVoiceJobs({
    title: '오디세이아',
    narrator: {
      logline: {
        quoteSpeaker: 'Charon',
        quoteStyle: '낮고 침착하게',
        quoteElevenlabsVoiceId: 'narrator-ele',
      },
    },
    groups: [{
      name: '귀향길',
      people: [],
      clusters: [{
        people: [],
        beats: [{ text: '거인은 동료를 잡아먹고, 오디세우스는 머리를 쓴다.' }],
      }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }],
  } as any)

  const narration = jobs.find(job => job.target === 'scene')
  assert.equal(narration?.speaker, 'Charon')
  assert.equal(narration?.elevenLabsVoiceId, 'narrator-ele')
  assert.equal(narration?.text, '낮고 침착하게: 거인은 동료를 잡아먹고, 오디세우스는 머리를 쓴다.')
})

test('자유 화자명이 있는 장면 잡은 공용 나레이터를 상속하지 않는다', () => {
  const jobs = buildVoiceJobs({
    title: '오디세이아',
    narrator: { logline: { quoteSpeaker: 'Charon', quoteElevenlabsVoiceId: 'narrator-ele' } },
    groups: [{
      name: '귀향길',
      people: [],
      clusters: [{ people: [], beats: [{ speaker: '선원들', text: '자루를 열어 보자.' }] }],
      sequence: [{ kind: 'cluster', clusterIndex: 0 }],
    }],
  } as any)

  const freeSpeaker = jobs.find(job => job.target === 'scene')
  assert.equal(freeSpeaker?.speaker, undefined)
  assert.equal(freeSpeaker?.elevenLabsVoiceId, undefined)
})
