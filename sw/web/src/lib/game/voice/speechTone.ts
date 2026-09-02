/*
  파일명: lib/game/voice/speechTone.ts
  기능: SpeechTone 유효성 검증
  책임: DB에서 가져온 speech_tone 문자열이 유효한 SpeechTone인지 확인한다.
        말투는 celebs.speech_tone 컬럼에서 직접 관리한다.
*/

import { isCelebSpeechTone } from '@feelandnote/shared/constants/celeb-speech'
import type { SpeechTone } from './types'

/** DB 값이 유효한 SpeechTone인지 확인, 아니면 'free' 폴백 */
export function validateSpeechTone(value: string | null | undefined): SpeechTone {
  return isCelebSpeechTone(value) ? value : 'free'
}
