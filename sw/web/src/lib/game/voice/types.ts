/*
  파일명: lib/game/voice/types.ts
  기능: 대사 시스템 타입 정의
  책임: 공용 셀럽 발화 허용값을 게임 대사 타입으로 노출한다.

  용어 구분:
  - dialogueLines: DB 개인화 대사 (celeb_dialogues 테이블, 인물별 고유)
  - defaultLines: 톤별 범용 대사 (코드 하드코딩, speech_tone 6종 기반).
    DB 개인화 불필요한 부수적 인터랙션에서 사용한다.
*/

import {
  CELEB_DIALOGUE_VARIANTS_PER_SITUATION,
  type CelebDialogueSituation,
  type CelebSpeechTone,
} from '@feelandnote/shared/constants/celeb-speech'

/** 말투 6종 */
export type SpeechTone = CelebSpeechTone

/** 대사 상황 (서비스 범용) */
export type DialogueType = CelebDialogueSituation

/** 인물별 고유 대사 구조 (7상황 × 3변형) */
export type DialogueLines = Record<DialogueType, [string, string, string]>

/** 변형 수 */
export const VARIANTS_PER_LINE = CELEB_DIALOGUE_VARIANTS_PER_SITUATION
