/**
 * 1-tts/config.ts — 상수·정책 값
 *
 * TTS 엔진 모델·보이스 매핑·정규화 파라미터·발화 스타일 정책 기본값.
 * 정책 상세는 ../1-tts.ts 헤더 주석 "발화 스타일·속도 정책" 참조.
 */

export type Voice = string

export type Role = 'narrator' | 'summary' | 'celeb'

// --- Gemini 모델 ---
export const MODEL = 'gemini-2.5-flash-preview-tts'

// --- 보이스 역할 ---
// VOICE.celeb은 episode.host.geminiVoice 가 있으면 main()에서 오버라이드된다.
export const VOICE = {
  narrator: 'Kore' as Voice,
  summary: 'Charon' as Voice,
  celeb: 'Puck' as Voice,
}

// --- 쇼츠 속도 prefix 기본값 ---
// 정책: ../1-tts.ts 헤더 주석 참조
//  - 적용: 쇼츠 narrator/summary (한·영 공통)
//  - 비적용: 롱폼 전체, 쇼츠 celeb-mid
//  - 우선순위: segment.style > episode.host.shortsSpeed > SHORTS_SPEED_DEFAULT
export const SHORTS_SPEED_DEFAULT = ''

// --- ElevenLabs ---
export const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY
export const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

// --- 라우드니스 정규화 (loudnorm 2-pass linear) ---
// 타겟 I=-17 LUFS: 정규화 제외 대상인 ElevenLabs 셀럽 보이스(native ~-17 LUFS)와
// 동일 레벨로 맞춰 나레이터·셀럽 혼합 렌더 시 볼륨 격차를 없앤다.
// 이전 -19는 ElevenLabs 대비 ~2 dB 작게 들려 "나레이션이 작다" 피드백 발생.
export const NORMALIZE_TARGET_I = -17
export const NORMALIZE_TARGET_TP = -1.5
export const NORMALIZE_TARGET_LRA = 11
