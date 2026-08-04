/**
 * 넷씩 넷 (Groups) — 타입 정의
 * 원형: NYT Connections. 16명의 인물을 4묶음으로 분류한다.
 */

/** 묶음 기준으로 사용할 수 있는 축 (DB 실재) */
export type GroupAxis = "tag" | "profession" | "nationality";

/** 난이도 색상 (NYT Connections 관례) */
export const DIFFICULTY_COLORS = [
  "#f9df6d", // 노랑 — 쉬움
  "#a0c35a", // 초록 — 보통
  "#b0c4ef", // 파랑 — 어려움
  "#ba81c5", // 보라 — 매우 어려움
] as const;

export const MAX_MISTAKES = 4;
export const GROUP_SIZE = 4;
export const TOTAL_ITEMS = 16;

/** 한 묶음의 정의 */
export interface GroupDef {
  /** 묶음 이름 (한국어 또는 영어 — locale에 따라) */
  label: string;
  /** 난이도 0~3 (0=쉬움) */
  difficulty: number;
  /** 어떤 축인지 */
  axis: GroupAxis;
  /** 해당 축의 실제 값 (예: tag slug, profession key, nationality name) */
  axisValue: string;
}

/** 보드에 올라가는 인물 한 명 */
export interface GroupItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** 이 인물이 속하는 묶음 인덱스 (0~3) */
  groupIndex: number;
}

/** 하루 한 판의 전체 퍼즐 */
export interface GroupsPuzzle {
  /** 날짜 시드 (YYYY-MM-DD) */
  dateKey: string;
  /** 4개 묶음 정의 */
  groups: [GroupDef, GroupDef, GroupDef, GroupDef];
  /** 16명 인물 (섞인 상태) */
  items: GroupItem[];
}

/** 맞힌 묶음 기록 */
export interface SolvedGroup {
  groupIndex: number;
  items: GroupItem[];
}

/** 게임 진행 상태 */
export type GamePhase = "lobby" | "playing" | "result";

/** 추측 결과 */
export interface GuessResult {
  selectedIds: string[];
  correct: boolean;
  /** 맞은 개수 (0~4) */
  matchCount: number;
  /** 정답이었던 묶음 인덱스 (correct=true일 때만) */
  groupIndex?: number;
}
