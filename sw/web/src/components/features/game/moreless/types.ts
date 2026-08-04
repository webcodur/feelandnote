/**
 * 어느 쪽(More or Less) 게임 타입 정의
 *
 * 원형: More or Less, Juxtastat, Steamry, TimeSwipe
 * 두 인물의 영향력 점수를 비교해 큰 쪽을 고른다.
 * 맞히면 계속, 틀리면 끝. 연속 정답 기록이 전부다.
 */

/** 게임에서 사용하는 인물 정보 */
export interface MorelessCeleb {
  id: string;
  nickname: string;
  nickname_en: string | null;
  profession: string | null;
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  /** 영향력 총점 (0~100) — 비교 기준값. 선택 전에는 가린다. */
  total_score: number;
}

/** 한 라운드의 문제 (두 인물) */
export interface MorelessPair {
  left: MorelessCeleb;
  right: MorelessCeleb;
}

/** 선택 결과 */
export interface MorelessRoundResult {
  pair: MorelessPair;
  /** 유저가 고른 쪽 */
  chosen: 'left' | 'right';
  /** 정답 여부 */
  correct: boolean;
}

/** 게임 상태 */
export type MorelessPhase = 'lobby' | 'playing' | 'reveal' | 'result';

// ─── 게임 상수 ───

/** 최소 점수 격차 — 이보다 작으면 찍기이므로 출제하지 않는다 */
export const MIN_SCORE_GAP = 5;

/** 한 판에서 같은 인물이 재등장하기까지 최소 라운드 간격 */
export const REAPPEAR_COOLDOWN = 4;

/** 정답 공개 후 다음 문제까지 대기 시간 (ms) */
export const REVEAL_DELAY_MS = 1200;

/** 점수 표시 애니메이션 시간 (ms) */
export const SCORE_ANIMATE_MS = 600;
