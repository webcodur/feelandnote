/**
 * 인물 안내 형식 검사. 규칙 SSoT: docs/project/celeb/celeb-05-01-reading.md 「형식」.
 * 룰북은 값을 복제하지 않고 READING_FORMAT을 가리킨다. 글의 질은 사람이 읽어서 판정하며, 이 검사를
 * 통과했다는 사실이 품질 통과를 뜻하지 않는다.
 */

// 한국어 글자 수는 공백을 포함한 본문 길이, 문장 수는 음성 문장 강조와 같은 Intl.Segmenter 기준이다.
export const READING_FORMAT = {
  koChars: { min: 180, max: 340 },
  koSentences: { min: 3, max: 5 },
  enToKoLength: { min: 1.6, max: 3.2 },
} as const

export type ReadingIdentity = { nickname: string; nickname_en: string | null }

export function sentencesOf(text: string, locale: 'ko' | 'en'): string[] {
  return [...new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)]
    .map((item) => item.segment.trim())
    .filter(Boolean)
}

// 이름 끝 글자의 받침으로 주제 조사를 고른다. 한글이 아니면 둘 다 허용한다.
function topicParticles(name: string): string[] {
  const code = (name.trim().at(-1) ?? '').charCodeAt(0) - 0xac00
  if (!(code >= 0 && code <= 11171)) return ['은', '는']
  return code % 28 === 0 ? ['는'] : ['은']
}

export function readingFormatErrors(guideRaw: string, guideEnRaw: string, identity?: ReadingIdentity): string[] {
  const errors: string[] = []
  const guide = guideRaw.trim()
  const guideEn = guideEnRaw.trim()
  if (!guide) errors.push('한국어 안내 누락')
  if (guide && !/[가-힣]/.test(guide)) errors.push('한국어 안내 문자 깨짐')
  for (const [label, text] of [['한국어', guide], ['영어', guideEn]]) {
    if (text.includes('\uFFFD')) errors.push(`${label} 안내 문자 깨짐`)
    if (/https?:\/\/|\]\(|```|^#{1,6}\s/m.test(text)) errors.push(`${label} 안내 URL 또는 마크다운 혼입`)
    if (/\n/.test(text)) errors.push(`${label} 안내 줄바꿈`)
  }
  if (guide) {
    const length = [...guide].length
    const sentences = sentencesOf(guide, 'ko')
    if (length < READING_FORMAT.koChars.min || length > READING_FORMAT.koChars.max) errors.push(`한국어 분량 ${length}자`)
    if (sentences.length < READING_FORMAT.koSentences.min || sentences.length > READING_FORMAT.koSentences.max) errors.push(`한국어 문장 수 ${sentences.length}`)
    if (/[()（）[\]]/.test(guide)) errors.push('한국어 괄호')
    // 반각 <>는 〈〉 대신 작품명에 잘못 쓰인 경우뿐이라 같은 위반으로 본다.
    if (/[「」『』<>]/.test(guide)) errors.push('한국어 작품명 부호(《》·〈〉만 쓴다)')
    if (/(습니다|입니다|합니다|됩니다|세요|어요|해요)[.!?]/.test(guide)) errors.push('한국어 존댓말')
    if (/\b[A-Za-z]\.[A-Za-z]\./.test(guide)) errors.push('한국어 마침표 약칭')
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
      const ratio = guideEn.length / [...guide].length
      if (ratio < READING_FORMAT.enToKoLength.min || ratio > READING_FORMAT.enToKoLength.max) errors.push(`한영 분량 비 ${ratio.toFixed(2)}`)
    }
  }
  return errors
}
