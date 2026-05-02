/**
 * 2-synthesize/config.ts — 상수·정책 값
 *
 * TTS 엔진 모델·보이스 매핑·정규화 파라미터·발화 스타일 정책 기본값.
 * 정책 상세는 ../2-synthesize.ts 헤더 주석 "발화 스타일·속도 정책" 참조.
 */
import 'dotenv/config'

export type Voice = string

export type Role = 'narrator' | 'summary' | 'celeb'

// --- Gemini 모델 ---
export const MODEL = 'gemini-2.5-flash-preview-tts'

// --- 보이스 역할 ---
// VOICE.celeb은 episode.host.geminiVoice 가 있으면 main()에서 오버라이드된다.
export const VOICE = {
  narrator: 'Kore' as Voice,
  shortsNarrator: 'Charon' as Voice,
  shortsHook: 'Charon' as Voice,
  summary: 'Charon' as Voice,
  celeb: 'Puck' as Voice,
}

// --- narrator/summary 발화 스타일 prefix 기본값 ---
// 정책: ../2-synthesize.ts 헤더 주석 참조
//  - 적용: 쇼츠·롱폼 narrator/summary (한·영 공통, 전역 기본)
//  - 비적용: celeb (voiceStyle 별도)
//  - 우선순위: segment.style > episode.host.shortsSpeed(레거시 오버라이드) > NARRATOR_STYLE_DEFAULT
export const NARRATOR_STYLE_DEFAULT = '편안하고 자연스럽게'

// --- ElevenLabs ---
// CLI는 ElevenLabs API를 직접 호출하지 않고 BO route를 통과시킨다.
// BO UI(VoiceTimingEditor·ExpandedVoicePanel)와 100% 동일한 코드 경로 사용을 보장한다.
// 단일원천: sw/remotion-bo/src/app/api/[series]/voice/elevenlabs/preview/route.ts
// 과거 사고(2026-04-28): CLI engines.ts가 v2 모델로 분기되어 audio tag([calm] 등)가
// 발음으로 합성된 사고. BO route는 v3였는데 CLI만 v2여서 분기. 이 통일로 분기 차단.
export const BO_BASE_URL = (process.env.BO_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
export const BO_SERIES = process.env.BO_SERIES ?? 'book-recommend'

// --- 라우드니스 정규화 (loudnorm 2-pass linear) ---
// 타겟 I=-17 LUFS: 정규화 제외 대상인 ElevenLabs 셀럽 보이스(native ~-17 LUFS)와
// 동일 레벨로 맞춰 나레이터·셀럽 혼합 렌더 시 볼륨 격차를 없앤다.
// 이전 -19는 ElevenLabs 대비 ~2 dB 작게 들려 "나레이션이 작다" 피드백 발생.
export const NORMALIZE_TARGET_I = -17
export const NORMALIZE_TARGET_TP = -1.5
export const NORMALIZE_TARGET_LRA = 11
