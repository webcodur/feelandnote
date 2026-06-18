/**
 * 2-synthesize/tts.ts — TTS 디스패치 + 텍스트 헬퍼
 *
 * tts(): 엔진 분기와 스타일 prefix 결정. 정책 상세는 ../2-synthesize.ts 헤더 참조.
 * ttsText(): 에피소드 필드를 텍스트로 추출 (tts 오버라이드 우선).
 * applyReplacements(): episode.tts.replace 치환 적용.
 */

import { ENGINE, IS_EN, args } from './cli.js'
import { NARRATOR_STYLE_DEFAULT, type Role, type Voice } from './config.js'
import { ep } from './state.js'
import { synthesizeGemini, synthesizeElevenlabs } from './engines.js'
import { bookFieldParts } from '../../../src/compositions/BookRecommend/field-parts'

// ── Voice meta types (라인별 ELE 합성 메타) ──
export type VoiceMeta = {
  tags?: string[]
  trail?: boolean
  emphasis?: Array<{ wordIndex: number[]; type: 'bold' | 'italic' }>
}

// ── Default fallback (CLI 인자/환경변수) ──
function defaultEleTags(): string[] {
  const flagIdx = args.indexOf('--default-tags')
  const raw = flagIdx >= 0 ? args[flagIdx + 1] : process.env.ELE_DEFAULT_TAGS
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function defaultEleTrail(): boolean {
  // 미지정 시 trail = true (기본 ON)
  const flagIdx = args.indexOf('--default-trail')
  const raw = flagIdx >= 0 ? args[flagIdx + 1] : process.env.ELE_DEFAULT_TRAIL
  if (raw === undefined || raw === null || raw === '') return true
  return !['false', 'off', '0', 'no'].includes(String(raw).toLowerCase())
}

/** ElevenLabs 합성 텍스트 빌더 — 라인 voice 메타 + default fallback */
export function buildEleText(text: string, meta?: VoiceMeta): string {
  const tags = meta?.tags && meta.tags.length > 0 ? meta.tags : defaultEleTags()
  const trail = typeof meta?.trail === 'boolean' ? meta.trail : defaultEleTrail()
  let t = text
  if (tags.length > 0) t = `[${tags.join(', ')}] ${t}`
  if (trail) t = `${t} ... ... ...`
  return t
}

/** 엔진별 합성 디스패치
 *
 * ElevenLabs: 셀럽 커스텀 보이스용 (--engine elevenlabs)
 * Gemini: 기본. 스타일 prefix를 텍스트 앞에 붙여 발화 속도/어조 지시.
 *
 * 스타일 우선순위: segment.style > host.shortsSpeed > NARRATOR_STYLE_DEFAULT  (쇼츠·롱폼 narrator/summary)
 *                  segment.style > host.voiceStyle                              (celeb)
 */
export async function tts(
  rawText: string,
  voiceName: Voice,
  outputFile: string,
  role: Role,
  isShort?: boolean,
  shortSegId?: string,
  voiceMeta?: VoiceMeta,
  forceGemini?: boolean,
  elevenlabsVoiceIdOverride?: string,
  stylePrefixOverride?: string,
): Promise<number> {
  const text = rawText.replace(/\n/g, ' ')
  const episode = ep()

  // forceGemini: segment.geminiVoice 명시 → ENGINE과 무관하게 Gemini 분기.
  // 캐릭터 보이스(다중 화자)는 ElevenLabs 셀럽 보이스를 우회한다.
  if (ENGINE === 'elevenlabs' && !forceGemini) {
    const eleText = buildEleText(text, voiceMeta)
    const voiceId = elevenlabsVoiceIdOverride ?? episode.host.elevenlabsVoiceId!
    return synthesizeElevenlabs(eleText, voiceId, outputFile)
  }

  // 다중 화자 라우팅 — ENGINE이 gemini라도 화자별 elevenlabsVoiceId 오버라이드가 있으면 ElevenLabs로 분기.
  // 롱폼 행별 xxxSpeaker / 쇼츠 segment.speaker가 가리키는 화자에 별도 voiceId가 등록된 경우다.
  // forceGemini(geminiVoice 명시)가 우선 — 캐릭터 보이스 의도라면 Gemini로 흐른다.
  if (elevenlabsVoiceIdOverride && !forceGemini) {
    const eleText = buildEleText(text, voiceMeta)
    return synthesizeElevenlabs(eleText, elevenlabsVoiceIdOverride, outputFile)
  }

  // 스타일 prefix 결정 — 정책은 ../2-synthesize.ts 헤더 참조
  // 롱폼 구간별 voiceStyles 오버라이드가 있으면 role 분기를 건너뛰고 그대로 사용.
  // 빈 문자열('')도 명시적 옵트아웃으로 인정해 prefix 없이 합성한다.
  let stylePrefix = ''
  if (stylePrefixOverride !== undefined) {
    stylePrefix = stylePrefixOverride
  } else if (role === 'celeb' && !forceGemini) {
    // celeb (쇼츠 celeb-mid + 롱폼 celeb): host.voiceStyle만 적용
    stylePrefix = episode.host.voiceStyle || ''
  } else if (forceGemini) {
    // 캐릭터 보이스: segment.style만 적용 (host.voiceStyle은 셀럽 본인 톤이므로 배제)
    let segStyle: string | undefined
    if (isShort && shortSegId) {
      const shortsArr = Array.isArray((episode as any).shorts) ? (episode as any).shorts : []
      for (const cfg of shortsArr) {
        const found = cfg?.segments?.find((s: { id: string; style?: string }) => s.id === shortSegId)
        if (found) { segStyle = found.style; break }
      }
    }
    stylePrefix = segStyle || ''
  } else {
    // narrator/summary (쇼츠·롱폼 공통): segment.style > host.shortsSpeed > NARRATOR_STYLE_DEFAULT
    let segStyle: string | undefined
    if (isShort && shortSegId) {
      const shortsArr = Array.isArray((episode as any).shorts) ? (episode as any).shorts : []
      for (const cfg of shortsArr) {
        const found = cfg?.segments?.find((s: { id: string; style?: string }) => s.id === shortSegId)
        if (found) { segStyle = found.style; break }
      }
    }
    // 영문 에피소드의 segment.style 경고 — 한국어 발음·호흡 지시 prefix 유입 방지
    if (segStyle && IS_EN) {
      console.warn(`⚠ 영문 에피소드 segment(${shortSegId})에 style 지정됨. 한국어 발음 지시(예: "숨소리...")는 영문에 부적합. 확인 필요: "${segStyle}"`)
    }
    // 빈 문자열("")은 명시적 옵트아웃으로 인정 — 사극체 등 본문 톤이 강해 prefix 지시가 부자연스러운 인물에 사용.
    // undefined·null만 fallthrough.
    stylePrefix = segStyle ?? episode.host.shortsSpeed ?? NARRATOR_STYLE_DEFAULT
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
        // 토막 분할 필드 — summary:N / contextMain:N (N = 토막 인덱스, 0-based)
        const summaryPartMatch = field.match(/^summary:(\d+)$/)
        if (summaryPartMatch) {
          const parts = bookFieldParts(book.summary, book.summaryParts)
          return applyReplacements(parts[parseInt(summaryPartMatch[1], 10)] ?? '')
        }
        const contextPartMatch = field.match(/^contextMain:(\d+)$/)
        if (contextPartMatch) {
          const parts = bookFieldParts(book.contextMain, book.contextMainParts)
          return applyReplacements(parts[parseInt(contextPartMatch[1], 10)] ?? '')
        }
        const quoteMatch = field.match(/^quote:(\d+)$/)
        if (quoteMatch) {
          const pi = parseInt(quoteMatch[1], 10)
          return applyReplacements(book.quotePairs?.[pi]?.quote ?? '')
        }
        // 후속 맥락 토막 — after:PI:AP (PI = 인용 쌍 인덱스, AP = 토막 인덱스, 둘 다 0-based)
        const afterPartMatch = field.match(/^after:(\d+):(\d+)$/)
        if (afterPartMatch) {
          const pi = parseInt(afterPartMatch[1], 10)
          const ap = parseInt(afterPartMatch[2], 10)
          const pair = book.quotePairs?.[pi]
          const parts = bookFieldParts(pair?.after, pair?.afterParts)
          return applyReplacements(parts[ap] ?? '')
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

/** tts.replace 맵 적용 — 긴 키부터 치환하여 부분 매칭 충돌 방지.
 *  쇼츠처럼 본체 밖 파일에 별도 tts.replace가 있을 때는 extraReplace로 주입한다. */
export function applyReplacements(text: string, extraReplace?: Record<string, string>): string {
  const base = ep().tts?.replace ?? {}
  const merged = { ...base, ...(extraReplace ?? {}) }
  if (Object.keys(merged).length === 0) return text
  let result = text
  const sorted = Object.entries(merged).sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of sorted) {
    result = result.replaceAll(from, to)
  }
  return result
}
