/*
  파일명: lib/game/hegemony/session/types.ts
  기능: 한 판의 진행 상태와 행동 타입
  책임: 화면 흐름(타이틀→선발→주장→대전→결과)과 대전 단계(복귀→작전→공개→일기토→결과)를 한 상태로 표현한다.
        모든 무작위는 판 씨앗(seed)에서 갈라 쓰므로 상태 전이는 순수 함수다.
*/

import type { BattleCard, Command } from "../../types";
import type { Difficulty } from "../constants";
import type { DraftState } from "../draft";
import type { DuelWinner, GameWinner, Play, RoundRecord, SideState } from "../types";

export type Phase = "title" | "loading" | "draft" | "captain" | "battle" | "result";

/**
 * recall   손패가 비어 쉬던 인물 가운데 한 명을 불러온다
 * plan     인물과 명령을 고른다
 * reveal   양측 출전을 공개한다 (연출)
 * duelOffer 같은 명령 접전에서 밀릴 때 일기토를 신청할지 묻는다
 * duel     일기토 진행 중
 * outcome  라운드 결과를 보여 준다
 */
export type BattleStep = "recall" | "plan" | "reveal" | "duelOffer" | "duel" | "outcome";

export interface BattleState {
  round: number;
  step: BattleStep;
  mandates: Command[];
  player: SideState;
  ai: SideState;
  /** 이번 라운드에 확정된 양측 출전 (공개 단계부터) */
  plays: { player: Play; ai: Play } | null;
  recallOptions: BattleCard[];
  records: RoundRecord[];
  winner: GameWinner | null;
  /** 기권으로 끝났는가 */
  forfeited: boolean;
}

export interface HegemonyState {
  phase: Phase;
  difficulty: Difficulty;
  seed: number;
  /** 서버에서 받은 전체 후보 (다시 뽑기용) */
  roster: BattleCard[];
  draft: DraftState | null;
  battle: BattleState | null;
  error: "load" | "notEnough" | null;
}

export type HegemonyAction =
  | { type: "load"; difficulty: Difficulty; seed: number }
  | { type: "loadFailed"; reason: "load" | "notEnough" }
  | { type: "draftReady"; roster: BattleCard[]; pool: BattleCard[] }
  | { type: "draftReshuffled"; seed: number; pool: BattleCard[] }
  | { type: "draftPick"; cardId: string }
  | { type: "draftAiPick" }
  | { type: "draftAuto" }
  | { type: "draftConfirm" }
  | { type: "captain"; cardId: string }
  | { type: "recall"; cardId: string }
  | { type: "lockIn"; play: Play }
  | { type: "revealDone" }
  | { type: "duelAccept" }
  | { type: "duelDecline" }
  | { type: "duelResult"; winner: DuelWinner }
  | { type: "nextRound" }
  | { type: "forfeit" }
  | { type: "reset" };

export type ActionOf<T extends HegemonyAction["type"]> = Extract<HegemonyAction, { type: T }>;
