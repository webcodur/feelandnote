/**
 * 1-tts/tts.ts — TTS 디스패치 + 텍스트 헬퍼
 *
 * tts(): 엔진 분기와 스타일 prefix 결정. 정책 상세는 ../1-tts.ts 헤더 참조.
 * ttsText(): 에피소드 필드를 텍스트로 추출 (tts 오버라이드 우선).
 * applyReplacements(): episode.tts.replace 치환 적용.
 */

import { ENGINE, IS_EN } from './cli.js'
import { SHORTS_SPEED_DEFAULT, type Role, type Voice } from './config.js'
import { ep } from './state.js'
import { synthesizeGemini, synthesizeElevenlabs } from './engines.js'

/** 엔진별 합성 디스패치
 *
 * ElevenLabs: 셀럽 커스텀 보이스용 (--engine elevenlabs)
 * Gemini: 기본. 스타일 prefix를 텍스트 앞에 붙여 발화 속도/어조 지시.
 *
 * 스타일 우선순위: segment.style > host.shortsSpeed > SHORTS_SPEED_DEFAULT  (쇼츠 narrator/summary)
 *                  segment.style > host.voiceStyle                          (celeb)
 */
export async function tts(
  rawText: string,
  voiceName: Voice,
  outputFile: string,
  role: Role,
  isShort?: boolean,
  shortSegId?: string,
): Promise<number> {
  const text = rawText.replace(/\n/g, ' ')
  const episode = ep()

  if (ENGINE === 'elevenlabs') {
    return synthesizeElevenlabs(text, episode.host.elevenlabsVoiceId!, outputFile)
  }

  // 스타일 prefix 결정 — 정책은 ../1-tts.ts 헤더 참조
  let stylePrefix = ''
  if (isShort) {
    if (role === 'celeb') {
      // 쇼츠 celeb-mid: 정속, host.voiceStyle만 적용 (없으면 prefix 없음)
      stylePrefix = episode.host.voiceStyle || ''
    } else {
      // 쇼츠 narrator/summary: segment.style > host.shortsSpeed > SHORTS_SPEED_DEFAULT
      const shortsArr = Array.isArray((episode as any).shorts) ? (episode as any).shorts : []
      let segStyle: string | undefined
      if (shortSegId) {
        for (const cfg of shortsArr) {
          const found = cfg?.segments?.find((s: { id: string; style?: string }) => s.id === shortSegId)
          if (found) { segStyle = found.style; break }
        }
      }
      // 영문 에피소드의 segment.style 경고 — 한국어 발음·호흡 지시 prefix 유입 방지
      if (segStyle && IS_EN) {
        console.warn(`⚠ 영문 에피소드 segment(${shortSegId})에 style 지정됨. 한국어 발음 지시(예: "들숨...")는 영문에 부적합. 확인 필요: "${segStyle}"`)
      }
      stylePrefix = segStyle || episode.host.shortsSpeed || SHORTS_SPEED_DEFAULT
    }
  } else if (role === 'celeb' && episode.host.voiceStyle) {
    // 롱폼 celeb: host.voiceStyle만 적용
    stylePrefix = episode.host.voiceStyle
  }
  const styled = stylePrefix ? `${stylePrefix}: ${text}` : text

  return synthesizeGemini(styled, voiceName, outputFile)
}

// --- TTS 텍스트 추출 (tts 오버라이드 우선) ---

export function ttsText(field: string, bookIndex?: number): string {
  const episode = ep()
  const tts = episode.tts

  if (bookIndex !== undefined) {
    const book = episode.books[bookIndex]
    switch (field) {
      case 'title': {
        const titleOverride = tts?.titles?.[bookIndex]
        if (titleOverride) return titleOverride
        const year = book.stats?.publishYear
        return year ? `${book.title}, ${book.creator}, ${year}` : `${book.title}, ${book.creator}`
      }
      case 'summary': return applyReplacements(book.summary)
      case 'contextMain': return applyReplacements(book.contextMain)
      default: {
        const quoteMatch = field.match(/^quote:(\d+)$/)
        if (quoteMatch) {
          const pi = parseInt(quoteMatch[1], 10)
          return applyReplacements(book.quotePairs?.[pi]?.quote ?? '')
        }
        const afterMatch = field.match(/^after:(\d+)$/)
        if (afterMatch) {
          const pi = parseInt(afterMatch[1], 10)
          return applyReplacements(book.quotePairs?.[pi]?.after ?? '')
        }
        throw new Error(`Unknown book field: ${field}`)
      }
    }
  }

  switch (field) {
    case 'serviceGreeting': return applyReplacements(episode.narrator.serviceGreeting ?? '')
    case 'serviceIntro': return applyReplacements(episode.narrator.serviceIntro ?? '')
    case 'celebIntro': return applyReplacements(episode.narrator.celebIntro ?? '')
    case 'philosophy': return applyReplacements(episode.host.philosophy ?? '')
    case 'returnIntro': return applyReplacements(episode.narrator.returnIntro ?? '')
    case 'prevRecap': return applyReplacements(episode.narrator.prevRecap ?? '')
    case 'outro': return applyReplacements(episode.narrator.outro)
    default: throw new Error(`Unknown field: ${field}`)
  }
}

/** tts.replace 맵 적용 — 긴 키부터 치환하여 부분 매칭 충돌 방지 */
export function applyReplacements(text: string): string {
  const replace = ep().tts?.replace
  if (!replace) return text
  let result = text
  const sorted = Object.entries(replace).sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of sorted) {
    result = result.replaceAll(from, to)
  }
  return result
}
