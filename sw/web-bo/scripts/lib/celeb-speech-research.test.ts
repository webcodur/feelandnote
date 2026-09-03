import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NO_VERIFIED_QUOTE_EN,
  NO_VERIFIED_QUOTE_KO,
  speechLinesSha256,
  validateSpeechResearch,
  type SpeechResearch,
} from './celeb-speech-research'

const currentLines = { greeting: ['기존', '대사', '셋'] }

const base = (): SpeechResearch => ({
  schemaVersion: 1,
  identity: { summary: '동명이인을 구별한 인물 신원', sourceUrl: 'https://example.org/identity' },
  representativeFacts: [
    { fact: '대표 활동 하나', sourceUrl: 'https://example.org/fact-1' },
    { fact: '대표 선택 둘', sourceUrl: 'https://example.org/fact-2' },
  ],
  voiceSamples: [{
    original: 'These are verified words.',
    originalLanguage: 'en',
    quoteKo: '확인한 실제 발언입니다',
    quoteEn: 'These are verified words.',
    sourceUrl: 'https://example.org/interview',
  }],
  dialogueAnchors: ['고유 어휘', '판단 습관', '갈등 방식'],
  searchedChannels: ['공식 인터뷰', '저서'],
  searchQueries: ['이름 인터뷰', 'Name speech', '이름 원어 발언'],
  inspectedSources: [
    { sourceUrl: 'https://example.org/interview', finding: '본문에서 직접 발언과 화자를 확인했다.' },
    { sourceUrl: 'https://example.net/profile', finding: '신원과 대표 활동을 확인했다.' },
  ],
  quoteOutcome: 'verified',
  dialogueDecision: 'KEEP',
  dialogueAssessment: '기존 21개가 조사 근거와 충돌하지 않는다.',
  expectedLinesSha256: speechLinesSha256(currentLines),
})

test('검증 발언과 KEEP 패치를 허용한다', () => {
  assert.doesNotThrow(() => validateSpeechResearch({
    research: base(),
    currentLines,
    proposedQuoteKo: '확인한 실제 발언입니다',
    proposedQuoteEn: 'These are verified words.',
    hasKoDialoguePatch: false,
  }))
})

test('조사 없이 한마디를 넣지 못한다', () => {
  assert.throws(() => validateSpeechResearch({
    research: undefined,
    currentLines,
    proposedQuoteKo: '지어낸 말',
    proposedQuoteEn: 'Fabricated.',
    hasKoDialoguePatch: false,
  }), /speech_research/)
})

test('unavailable은 조사 경로와 표준 문구를 요구한다', () => {
  const research = base()
  research.quoteOutcome = 'unavailable'
  research.voiceSamples = []
  research.unavailableReason = '공식 기록과 원어 자료에도 직접화법이 남지 않았다.'
  research.inspectedSources.push({
    sourceUrl: 'https://archive.example.com/source',
    finding: '보존 기록에 직접화법이 없고 제3자 서술만 있다.',
  })
  assert.doesNotThrow(() => validateSpeechResearch({
    research,
    currentLines,
    proposedQuoteKo: NO_VERIFIED_QUOTE_KO,
    proposedQuoteEn: NO_VERIFIED_QUOTE_EN,
    hasKoDialoguePatch: false,
  }))
})

test('preserved는 기존 한마디를 그대로 두고 상황 대사만 교정할 수 있다', () => {
  const lines = { ...currentLines, quote: '기존 한마디' }
  const research = base()
  research.quoteOutcome = 'preserved'
  research.voiceSamples = []
  research.dialogueDecision = 'REVISE'
  research.expectedLinesSha256 = speechLinesSha256(lines)
  assert.doesNotThrow(() => validateSpeechResearch({
    research,
    currentLines: lines,
    currentLinesEn: { quote: 'Existing quote' },
    proposedQuoteKo: '기존 한마디',
    proposedQuoteEn: 'Existing quote',
    hasKoDialoguePatch: true,
  }))
})

test('preserved는 기존 영문 한마디가 없으면 없는 상태를 보존한다', () => {
  const lines = { ...currentLines, quote: '기존 한마디' }
  const research = base()
  research.quoteOutcome = 'preserved'
  research.voiceSamples = []
  research.dialogueDecision = 'REVISE'
  research.expectedLinesSha256 = speechLinesSha256(lines)
  assert.doesNotThrow(() => validateSpeechResearch({
    research,
    currentLines: lines,
    currentLinesEn: {},
    proposedQuoteKo: '기존 한마디',
    proposedQuoteEn: undefined,
    hasKoDialoguePatch: true,
  }))
})

test('preserved는 비어 있던 영문 한마디를 새로 만들지 못한다', () => {
  const lines = { ...currentLines, quote: '기존 한마디' }
  const research = base()
  research.quoteOutcome = 'preserved'
  research.voiceSamples = []
  research.dialogueDecision = 'REVISE'
  research.expectedLinesSha256 = speechLinesSha256(lines)
  assert.throws(() => validateSpeechResearch({
    research,
    currentLines: lines,
    currentLinesEn: {},
    proposedQuoteKo: '기존 한마디',
    proposedQuoteEn: 'Created quote',
    hasKoDialoguePatch: true,
  }), /새로 만들지 않는다/)
})

test('preserved가 한국어 한마디를 바꾸면 거부한다', () => {
  const lines = { ...currentLines, quote: '기존 한마디' }
  const research = base()
  research.quoteOutcome = 'preserved'
  research.voiceSamples = []
  research.dialogueDecision = 'REVISE'
  research.expectedLinesSha256 = speechLinesSha256(lines)
  assert.throws(() => validateSpeechResearch({
    research,
    currentLines: lines,
    currentLinesEn: { quote: 'Existing quote' },
    proposedQuoteKo: '바꾼 한마디',
    proposedQuoteEn: 'Existing quote',
    hasKoDialoguePatch: true,
  }), /현재값을 그대로/)
})

test('preserved가 영문 한마디를 바꾸면 거부한다', () => {
  const lines = { ...currentLines, quote: '기존 한마디' }
  const research = base()
  research.quoteOutcome = 'preserved'
  research.voiceSamples = []
  research.dialogueDecision = 'REVISE'
  research.expectedLinesSha256 = speechLinesSha256(lines)
  assert.throws(() => validateSpeechResearch({
    research,
    currentLines: lines,
    currentLinesEn: { quote: 'Existing quote' },
    proposedQuoteKo: '기존 한마디',
    proposedQuoteEn: 'Changed quote',
    hasKoDialoguePatch: true,
  }), /영문 한마디 현재값/)
})

test('KEEP이 기존 21개를 보내면 거부한다', () => {
  assert.throws(() => validateSpeechResearch({
    research: base(),
    currentLines,
    proposedQuoteKo: '확인한 실제 발언입니다',
    proposedQuoteEn: 'These are verified words.',
    hasKoDialoguePatch: true,
  }), /KEEP/)
})

test('명언 모음 사이트 단독 근거를 거부한다', () => {
  const research = base()
  research.voiceSamples[0].sourceUrl = 'https://www.brainyquote.com/example'
  assert.throws(() => validateSpeechResearch({
    research,
    currentLines,
    proposedQuoteKo: '확인한 실제 발언입니다',
    proposedQuoteEn: 'These are verified words.',
    hasKoDialoguePatch: false,
  }), /명언 모음/)
})

test('영어 직접 발언을 다듬어 quoteEn에 넣으면 거부한다', () => {
  const research = base()
  research.voiceSamples[0].original = 'These were the exact original words.'
  assert.throws(() => validateSpeechResearch({
    research,
    currentLines,
    proposedQuoteKo: '확인한 실제 발언입니다',
    proposedQuoteEn: 'These are verified words.',
    hasKoDialoguePatch: false,
  }), /영어 직접 발언/)
})
