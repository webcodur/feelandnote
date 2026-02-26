/*
  파일명: lib/game/voice/types.ts
  기능: 대사 시스템 타입 정의
  책임: SpeechTone, DialogueType, DialogueLines 타입을 단일 원천으로 관리한다.
*/

/** 말투 6종 */
export type SpeechTone = "loyal" | "composed" | "bold" | "humble" | "gentle" | "free";

/** 대사 상황 (서비스 범용) */
export type DialogueType =
  | "select"        // 인물 활성화/부름
  | "deploy"        // 임무 투입/출전
  | "battle_win"    // 성공/승리
  | "battle_draw"   // 무승부/미결
  | "battle_lose"   // 실패/패배
  | "clash_attack"; // 순간 행동/기합

/** 인물별 고유 대사 구조 (6상황 × 3변형) */
export type DialogueLines = Record<DialogueType, [string, string, string]>;

/** 변형 수 */
export const VARIANTS_PER_LINE = 3;
