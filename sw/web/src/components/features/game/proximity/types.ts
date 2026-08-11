/**
 * 근접도(Proximity) 게임 타입 정의
 *
 * 원형: Metazooa(계통수 거리), Globle(지리 거리), Contexto(의미 거리)
 * 오늘의 인물이 숨어 있고, 추측할 때마다 정답과의 거리를 알려준다.
 */

import type { SpectrumStats } from '@/lib/spectrum/types';

/** 자동완성용 후보 인물 (가볍게) */
export interface ProximityCeleb {
  id: string;
  nickname: string;
  nickname_en: string | null;
  profession: string | null;
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
}

/** 거리 계산에 쓰이는 전체 벡터 (spectrum 16축 포함) */
export interface ProximityCelebFull extends ProximityCeleb {
  stats: SpectrumStats;
}

/** 추측 결과: 방금 추측한 인물과 정답 사이의 거리 힌트 */
export interface ProximityGuessResult {
  celeb: ProximityCeleb;
  /** 0~100 (100=정답, 0=최대 거리). 온도 표현. */
  temperature: number;
  /** 축별 힌트: 어느 축이 가깝고 먼지 */
  axisHints: ProximityAxisHint[];
  /** 정답 여부 */
  isCorrect: boolean;
}

/** 축별 힌트 — 시대·지역·직군·성향 중 가까운/먼 축을 알려준다 */
export interface ProximityAxisHint {
  axis: ProximityAxis;
  /** 'close' | 'medium' | 'far' */
  proximity: 'close' | 'medium' | 'far';
  /** 화면 표시용 부가 정보 (예: "같은 시대", "같은 직군") */
  detail?: string;
}

export type ProximityAxis = 'era' | 'region' | 'profession' | 'spectrum';

/** 게임 상태 */
export type ProximityPhase = 'lobby' | 'playing' | 'result';

/** 한 판의 전체 상태 */
export interface ProximityGameState {
  target: ProximityCelebFull;
  guesses: ProximityGuessResult[];
  phase: ProximityPhase;
  /** 포기 여부 */
  gaveUp: boolean;
}

// 게임 상수
export const PROXIMITY_MAX_GUESSES = 15;
/** 온도 100 = 정답, 0 = 최대 거리 */
export const PROXIMITY_TEMPERATURE_CORRECT = 100;
