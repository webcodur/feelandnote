/**
 * 경로 잇기 (Travel) — 타입 정의
 * 원형: Travle, The Wiki Game. 출발 인물에서 도착 인물까지
 * 관계(공유 콘텐츠·같은 세력)를 밟아 이동한다.
 */

/** 인접 관계의 종류 */
export type EdgeType = "content" | "tag";

/** 인접 관계를 설명하는 한 건 */
export interface EdgeReason {
  type: EdgeType;
  /** 공유 콘텐츠 제목 또는 세력 이름 */
  label: string;
}

/** 보드에 올라가는 인물 */
export interface TravelCeleb {
  id: string;
  nickname: string;
  nicknameEn: string;
  slug: string;
  avatarUrl: string | null;
  profession: string | null;
  nationality: string | null;
}

/** 인접 리스트의 한 간선 */
export interface AdjacencyEdge {
  /** 이웃 인물 id */
  targetId: string;
  /** 왜 이어졌는지 (복수 가능 — 같은 책도 읽고 같은 세력일 수도) */
  reasons: EdgeReason[];
}

/** 전체 그래프 구조 (인접 리스트) */
export interface TravelGraph {
  /** celeb id → 이웃 목록 */
  adjacency: Record<string, AdjacencyEdge[]>;
  /** celeb id → 기본 정보 */
  celebs: Record<string, TravelCeleb>;
}

/** 한 판의 출제 */
export interface TravelPuzzle {
  /** 출발 인물 id */
  startId: string;
  /** 도착 인물 id */
  endId: string;
  /** BFS 최단 경로 길이 */
  optimalLength: number;
  /** 이동 횟수 예산 (최단 + 여유분) */
  budget: number;
}

/** 한 번의 이동 기록 */
export interface TravelStep {
  /** 이동한 인물 id */
  celebId: string;
  /** 이전 인물과의 연결 이유 */
  reason: EdgeReason;
}

/** 게임 상태 */
export type TravelPhase = "lobby" | "playing" | "result";

/** 결과 종류 */
export type TravelOutcome = "success" | "over_budget" | "give_up";

/** 결과 데이터 */
export interface TravelResult {
  outcome: TravelOutcome;
  /** 플레이어가 밟은 경로 (출발 제외) */
  path: TravelStep[];
  /** BFS 최단 경로 (참고용) */
  optimalPath: string[];
  /** 예산 */
  budget: number;
  /** 채점 (0~100) */
  score: number;
}

/** 게임 상수 */
export const MAX_NEIGHBORS_SHOWN = 20;
export const BUDGET_EXTRA = 3;
export const MIN_OPTIMAL_PATH = 3;
export const MAX_OPTIMAL_PATH = 6;
