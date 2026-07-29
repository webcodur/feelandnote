/**
 * 2-synthesize/config.ts — 상수·정책 값
 *
 * TTS 엔진 모델·보이스 매핑·정규화 파라미터·발화 스타일 정책 기본값.
 * 정책 상세는 ../2-synthesize.ts 헤더 주석 "발화 스타일·속도 정책" 참조.
 */
import 'dotenv/config'

// 보이스 매핑·역할 판정·스타일 결정의 단일원천은 공유 패키지다.
// BO(sw/web-bo)도 같은 모듈을 import 해 미러링 부채를 없앤다.
import {
  VOICE,
  NARRATOR_STYLE_DEFAULT,
  MODEL_GEMINI_25,
  MODEL_GEMINI_31,
  type Voice,
  type Role,
} from '@feelandnote/shared/lib/voice-policy'

export { VOICE, NARRATOR_STYLE_DEFAULT, MODEL_GEMINI_25, MODEL_GEMINI_31 }
export type { Voice, Role }

/** @deprecated 기본 모델 별칭 — 신규 코드는 cli.GEMINI_MODEL 사용 */
export const MODEL = MODEL_GEMINI_25

// --- 라우드니스 정규화 (loudnorm 2-pass linear) ---
// 타겟 I=-17 LUFS: 정규화 제외 대상인 ElevenLabs 셀럽 보이스(native ~-17 LUFS)와
// 동일 레벨로 맞춰 나레이터·셀럽 혼합 렌더 시 볼륨 격차를 없앤다.
// 이전 -19는 ElevenLabs 대비 ~2 dB 작게 들려 "나레이션이 작다" 피드백 발생.
export const NORMALIZE_TARGET_I = -17
export const NORMALIZE_TARGET_TP = -1.5
export const NORMALIZE_TARGET_LRA = 11
