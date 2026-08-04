/**
 * 상위 다섯 (Top Five) — 타입 정의
 *
 * 원형: Factle, Top 5, Daily Tens.
 * "오늘의 기준"이 주어지고 상위 5개를 순서까지 맞힌다.
 */

/** 문제 카테고리 종류 */
export type CategoryType =
  | "most_recorded_books"      // 가장 많이 기록된 책 (user_count 상위)
  | "faction_influence"        // 특정 세력에서 영향력 높은 인물
  | "profession_influence";    // 특정 직군에서 영향력 높은 인물

/** 하나의 후보 항목 */
export interface TopFiveCandidate {
  id: string;
  label: string;         // locale 적용된 표시 이름
  /** 실제 순위 (1~5면 정답, 6 이상이면 오답 후보) */
  rank: number;
  /** 정답 여부 (상위 5에 포함되는지) */
  isAnswer: boolean;
}

/** 서버가 생성한 출제 데이터 */
export interface TopFivePuzzle {
  /** 날짜 시드 (YYYY-MM-DD) */
  dateKey: string;
  /** 카테고리 종류 */
  categoryType: CategoryType;
  /** 출제 기준 라벨 (예: "가장 많이 기록된 책", "르네상스 마에스트로 영향력 순위") */
  categoryLabel: string;
  categoryLabelEn: string;
  /** 후보 목록 (10~15개, 셔플됨) — 정답 5개 + 오답 5~10개 */
  candidates: TopFiveCandidate[];
}

/** 유저의 한 번 배치 */
export interface SlotPlacement {
  /** 슬롯 인덱스 (0~4, 1위~5위에 대응) */
  slotIndex: number;
  /** 배치한 후보 id */
  candidateId: string;
}

/** 한 판의 결과 */
export interface TopFiveResult {
  /** 맞힌 항목 수 (순위 무관, 5개 중 몇 개가 실제 상위 5인지) */
  correctItems: number;
  /** 순위까지 정확히 맞힌 수 */
  exactPositions: number;
  /** 총점 */
  score: number;
  /** 각 슬롯의 판정 */
  slotResults: SlotResult[];
  /** 실제 정답 순서 (공개용) */
  correctOrder: TopFiveCandidate[];
}

/** 각 슬롯의 판정 결과 */
export interface SlotResult {
  slotIndex: number;
  candidateId: string;
  candidateLabel: string;
  /** 이 항목이 상위 5에 포함되는지 */
  isInTop5: boolean;
  /** 정확한 순위에 배치했는지 */
  isExactPosition: boolean;
  /** 실제 순위 (상위 5에 포함될 때만) */
  actualRank: number | null;
}

/** 게임 상태 */
export type TopFivePhase = "lobby" | "playing" | "result";

/** 배점 상수 */
export const SCORE_EXACT_POSITION = 20;  // 순위까지 맞힘
export const SCORE_IN_TOP5 = 10;         // 상위 5에 포함되나 순위 틀림
export const SCORE_WRONG = 0;            // 상위 5에 미포함
export const MAX_SCORE = SCORE_EXACT_POSITION * 5; // 100점 만점
export const SLOTS_COUNT = 5;
export const CANDIDATES_COUNT = 12; // 후보 수 (정답 5 + 오답 7)
