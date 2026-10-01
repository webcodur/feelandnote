/*
  파일명: components/features/game/duel/shared/types.ts
  기능: 일기토 미니게임 공통 타입
  책임: 세 미니게임(설전·격돌·지략전)이 같은 모양으로 받는 인물과 끝났을 때 알리는 함수를 정한다.
*/

import type { BattleCard } from "@/lib/game/types";
import type { DuelWinner } from "@/lib/game/hegemony/types";

export type { DuelWinner };

export interface ArenaProps {
  playerCard: BattleCard;
  aiCard: BattleCard;
  /** 효과음을 껐으면 미니게임 소리도 내지 않는다 */
  muted?: boolean;
  onComplete: (winner: DuelWinner) => void;
}

/** 결과 창을 띄운 뒤 저절로 대전 화면으로 돌아가기까지 (ms) */
export const RESULT_HOLD_MS = 2200;
