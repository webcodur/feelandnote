/*
  파일명: lib/game/voice/speechTone.ts
  기능: SpeechTone 유효성 검증
  책임: DB에서 가져온 speech_tone 문자열이 유효한 SpeechTone인지 확인한다.
        말투는 celeb_persona.speech_tone 컬럼에서 직접 관리한다.
*/

import type { SpeechTone } from "./types";

const VALID_TONES: Set<string> = new Set(["loyal", "composed", "bold", "humble", "gentle", "free"]);

/** DB 값이 유효한 SpeechTone인지 확인, 아니면 'free' 폴백 */
export function validateSpeechTone(value: string | null | undefined): SpeechTone {
  if (value && VALID_TONES.has(value)) return value as SpeechTone;
  return "free";
}
