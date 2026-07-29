/**
 * Gemini 보이스 정책 — 단일 원천(SSoT)
 *
 * CLI(sw/remotion/scripts/voice)와 BO(sw/web-bo)가 공유한다.
 * 과거 두 곳이 보이스 매핑·스타일 기본값·역할 판정을 각자 갖고 있어,
 * BO 미리듣기·생성이 롱폼 나레이터를 host.geminiVoice 로 뭉뚱그려 잘못 합성하는
 * 사고가 있었다. 역할→보이스/스타일 결정을 이 모듈로 통일한다.
 *
 * ElevenLabs 경로는 별개 통합(CLI→BO route)이라 여기서 다루지 않는다.
 */

export type Voice = string
export type Role = 'narrator' | 'summary' | 'celeb'
export type Scope = 'long' | 'shorts'

// --- Gemini 모델 ---
// gemini-v3 엔진 선택 시 3.1, 그 외 기본 2.5.
export const MODEL_GEMINI_25 = 'gemini-2.5-flash-preview-tts'
export const MODEL_GEMINI_31 = 'gemini-3.1-flash-tts-preview'

// --- 역할별 기본 보이스 ---
// celeb은 팩션·레거시 화면 호환용이다. 서재탐방 실제 인물은 ElevenLabs만 사용한다.
export const VOICE = {
  narrator: 'Charon' as Voice,
  soloNarrator: 'Charon' as Voice,
  shortsNarrator: 'Charon' as Voice,
  shortsHook: 'Charon' as Voice,
  summary: 'Charon' as Voice,
  celeb: 'Puck' as Voice,
}

// --- narrator/summary 발화 스타일 prefix 기본값 ---
export const NARRATOR_STYLE_DEFAULT = '편안하고 자연스럽게'

/**
 * 롱폼 구간키(파일명 베이스, 예: 'B1-celeb-intro','D03b-summary','B2-philosophy') → 역할.
 * 쇼츠는 segment.role 이 SSoT 라 이 함수 대상이 아니다(쇼츠는 role 을 직접 넘긴다).
 *
 * 주의: 'B1-celeb-intro' 는 이름에 celeb 이 들어가지만 3인칭 인물 소개라 나레이터다.
 */
export function roleForLongformKey(key: string): Role {
  // celeb 발화 — 명언·감상철학·책 인용
  if (key === 'A3-featured-quote') return 'celeb'
  if (key === 'B2-philosophy') return 'narrator'
  if (/^D\d{2}d\d+-quote$/.test(key)) return 'celeb'
  // 책 요약
  if (/-summary$/.test(key)) return 'summary'
  // 그 외 전부 나레이터 — title·context·after·service-intro·celeb-intro·outro·label 등
  return 'narrator'
}

/**
 * 역할 + 컨텍스트 → Gemini 보이스명.
 * 명시 오버라이드(segment.geminiVoice, 화자 풀 보이스)가 최우선.
 */
export function geminiVoiceForRole(
  role: Role,
  opts: {
    scope?: Scope
    isHook?: boolean
    hostGeminiVoice?: string
    segGeminiVoice?: string
    speakerVoice?: string
  } = {},
): Voice {
  const { scope = 'long', isHook = false, hostGeminiVoice, segGeminiVoice, speakerVoice } = opts
  if (segGeminiVoice) return segGeminiVoice
  if (speakerVoice) return speakerVoice
  if (role === 'celeb') return hostGeminiVoice || VOICE.celeb
  if (role === 'summary') return VOICE.summary
  // narrator
  if (scope === 'shorts') return isHook ? VOICE.shortsHook : VOICE.shortsNarrator
  return VOICE.narrator
}

/**
 * 역할 + 컨텍스트 → 발화 스타일 prefix.
 * 빈 문자열('')은 "스타일 없음" 옵트아웃이므로 그대로 통과시킨다.
 * 우선순위: segment.style > 저장된 voiceStyles[key] > (celeb) host.voiceStyle / (그 외) host.shortsSpeed > 기본값.
 */
export function stylePrefixForRole(
  role: Role,
  opts: {
    segStyle?: string
    savedStyle?: string
    hostVoiceStyle?: string
    hostShortsSpeed?: string
  } = {},
): string {
  const { segStyle, savedStyle, hostVoiceStyle, hostShortsSpeed } = opts
  if (segStyle !== undefined) return segStyle
  if (savedStyle !== undefined) return savedStyle
  if (role === 'celeb') return hostVoiceStyle ?? ''
  return hostShortsSpeed ?? NARRATOR_STYLE_DEFAULT
}
