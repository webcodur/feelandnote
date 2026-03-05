/*
  파일명: lib/game/voice/types.ts
  기능: 대사 시스템 타입 정의
  책임: SpeechTone, DialogueType, DialogueLines, DefaultLines 타입을 단일 원천으로 관리한다.

  용어 구분:
  - dialogueLines: DB 개인화 대사 (celeb_dialogues 테이블, 인물별 고유)
  - defaultLines: 톤별 범용 대사 (코드 하드코딩, speech_tone 6종 기반).
    DB 개인화 불필요한 부수적 인터랙션에서 사용한다.
*/

/** 말투 6종 */
export type SpeechTone = "loyal" | "composed" | "bold" | "humble" | "gentle" | "free";

/** 대사 상황 (서비스 범용) */
export type DialogueType =
  | "greeting"      // 첫인사/프로필 조회
  | "roll_call"     // 호명 응답/부름에 답함
  | "deploy"        // 임무 투입/출전
  | "battle_win"    // 성공/승리
  | "battle_draw"   // 무승부/미결
  | "battle_lose"   // 실패/패배
  | "clash_attack"; // 순간 행동/기합

/** 인물별 고유 대사 구조 (7상황 × 3변형) */
export type DialogueLines = Record<DialogueType, [string, string, string]>;

/** 톤별 범용 대사 구조 (speech_tone → 상황별 변형 배열) */
export type DefaultLines = Record<SpeechTone, Record<string, string[]>>;

/** 변형 수 */
export const VARIANTS_PER_LINE = 3;
