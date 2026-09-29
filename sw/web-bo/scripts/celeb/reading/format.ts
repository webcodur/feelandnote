/**
 * 인물 안내 형식 검사. 규칙 SSoT: docs/project/celeb/celeb-05-01-reading.md 「형식」.
 * 룰북은 값을 복제하지 않고 READING_FORMAT을 가리킨다. 글의 질은 사람이 읽어서 판정하며, 이 검사를
 * 통과했다는 사실이 품질 통과를 뜻하지 않는다.
 */

// 한국어 글자 수는 공백을 포함한 본문 길이, 문장 수는 음성 문장 강조와 같은 Intl.Segmenter 기준이다.
// 분할 규칙의 단일 원천은 음성 타이밍 모듈(.mjs)이다.
import { readingSentences } from '../reading-voice-timing.mjs'

export const READING_FORMAT = {
  koChars: { min: 180, max: 340 },
  koSentences: { min: 3, max: 5 },
  enToKoLength: { min: 1.6, max: 3.2 },
  // 긴 본문은 문장 경계에서 두 문단으로 나눈다. 기준 글자 수는 줄바꿈을 뺀 공백 포함 글자 수다.
  paragraphs: { max: 3, koSplitFrom: 300, enSplitFrom: 450 },
} as const

export type ReadingIdentity = { nickname: string; nickname_en: string | null }

// 음성 문장 강조와 같은 분할기를 쓴다. 이름 속 라틴 약자(사무엘 L. 잭슨, J.K. 롤링)는 경계로 보지 않는다.
export function sentencesOf(text: string, locale: 'ko' | 'en'): string[] {
  return readingSentences(text, locale).map((part: { textStart: number; textEnd: number }) => text.slice(part.textStart, part.textEnd).trim()).filter(Boolean)
}

// 이름 끝 글자의 받침으로 주제 조사를 고른다. 한글이 아니면 둘 다 허용한다.
function topicParticles(name: string): string[] {
  const code = (name.trim().at(-1) ?? '').charCodeAt(0) - 0xac00
  if (!(code >= 0 && code <= 11171)) return ['은', '는']
  return code % 28 === 0 ? ['는'] : ['은']
}

// 문단은 빈 줄 하나(\n\n)로 나눈다. 글자 수는 줄바꿈을 빼고 센다.
export const PARAGRAPH_BREAK = '\n\n'
export const paragraphsOf = (text: string): string[] => text.trim().split(PARAGRAPH_BREAK)
export const readingLength = (text: string): number => [...text.trim().replace(/\n/g, '')].length

function paragraphErrors(label: string, text: string, requireSplit: boolean): string[] {
  const errors: string[] = []
  const paragraphs = paragraphsOf(text)
  if (paragraphs.some((part) => /\n/.test(part))) errors.push(`${label} 안내 줄바꿈(문단 사이는 빈 줄 하나)`)
  if (paragraphs.some((part) => part !== part.trim() || !part)) errors.push(`${label} 문단 앞뒤 공백`)
  if (paragraphs.length > READING_FORMAT.paragraphs.max) errors.push(`${label} 문단 ${paragraphs.length}개`)
  if (paragraphs.slice(0, -1).some((part) => !/[.?!]$/.test(part))) errors.push(`${label} 문단이 문장 중간에서 끊김`)
  const threshold = label === '한국어' ? READING_FORMAT.paragraphs.koSplitFrom : READING_FORMAT.paragraphs.enSplitFrom
  if (requireSplit && paragraphs.length === 1 && readingLength(text) >= threshold) errors.push(`${label} 문단 나눔 필요(${threshold}자 이상)`)
  return errors
}

// requireParagraphs는 새로 쓰는 원고 검사에만 켠다. DB 전수 검사에서는 긴 한 문단을 위반으로 세지 않는다.
export function readingFormatErrors(guideRaw: string, guideEnRaw: string, identity?: ReadingIdentity, options: { requireParagraphs?: boolean } = {}): string[] {
  const errors: string[] = []
  const guide = guideRaw.trim()
  const guideEn = guideEnRaw.trim()
  if (!guide) errors.push('한국어 안내 누락')
  if (guide && !/[가-힣]/.test(guide)) errors.push('한국어 안내 문자 깨짐')
  for (const [label, text] of [['한국어', guide], ['영어', guideEn]]) {
    if (text.includes('\uFFFD')) errors.push(`${label} 안내 문자 깨짐`)
    if (/https?:\/\/|\]\(|```|^#{1,6}\s/m.test(text)) errors.push(`${label} 안내 URL 또는 마크다운 혼입`)
    if (text) errors.push(...paragraphErrors(label, text, Boolean(options.requireParagraphs)))
  }
  if (guide) {
    const length = readingLength(guide)
    const sentences = sentencesOf(guide, 'ko')
    if (length < READING_FORMAT.koChars.min || length > READING_FORMAT.koChars.max) errors.push(`한국어 분량 ${length}자`)
    if (sentences.length < READING_FORMAT.koSentences.min || sentences.length > READING_FORMAT.koSentences.max) errors.push(`한국어 문장 수 ${sentences.length}`)
    if (/[()（）[\]]/.test(guide)) errors.push('한국어 괄호')
    // 반각 <>는 〈〉 대신 작품명에 잘못 쓰인 경우뿐이라 같은 위반으로 본다.
    if (/[「」『』<>]/.test(guide)) errors.push('한국어 작품명 부호(《》·〈〉만 쓴다)')
    if (/(습니다|입니다|합니다|됩니다|세요|어요|해요)[.!?]/.test(guide)) errors.push('한국어 존댓말')
    if (/《[^》]*[.!?][^》]*》|〈[^〉]*[.!?][^〉]*〉/.test(guide)) errors.push('한국어 작품명 안 문장부호')
    const first = sentences[0] ?? ''
    if (identity?.nickname && !topicParticles(identity.nickname).some((particle) => first.startsWith(`${identity.nickname}${particle} `))) {
      errors.push('한국어 첫 문장이 「이름은/는」으로 시작하지 않음')
    }
    if (!/이다\.$/.test(first)) errors.push('한국어 첫 문장이 「…이다.」 정체 설명이 아님')
  }
  if (guideEn) {
    if (/[\uac00-\ud7a3《》〈〉「」『』]/.test(guideEn)) errors.push('영어 안내에 한글 또는 한국어 부호')
    if (identity?.nickname_en && !guideEn.startsWith(identity.nickname_en)) errors.push('영어 첫 문장이 영문 이름으로 시작하지 않음')
    if (guide) {
      const ratio = guideEn.replace(/\n/g, '').length / readingLength(guide)
      if (ratio < READING_FORMAT.enToKoLength.min || ratio > READING_FORMAT.enToKoLength.max) errors.push(`한영 분량 비 ${ratio.toFixed(2)}`)
    }
  }
  return errors
}
