/*
  파일명: lib/game/types.ts
  기능: 패권 v6 동시 행동 전략 게임 타입 정의
  책임: 게임 전체에서 사용하는 타입을 단일 원천으로 관리한다.
*/

import type { AbilityKey } from "@/lib/persona/constants";
import type { SpeechTone, DialogueLines } from "@/lib/game/voice/types";

// ─── 도메인 (영향력 6대 영역) ───

export type Domain = "political" | "strategic" | "tech" | "social" | "economic" | "cultural";

export const DOMAINS: Domain[] = ["political", "strategic", "tech", "social", "economic", "cultural"];

export const DOMAIN_LABELS: Record<Domain, string> = {
  political: "정치",
  strategic: "전략",
  tech: "기술",
  social: "사회",
  economic: "경제",
  cultural: "문화",
};

export const DOMAIN_LABELS_FULL: Record<Domain, string> = {
  political: "정치·외교",
  strategic: "전략·안보",
  tech: "기술·과학",
  social: "사회·윤리",
  economic: "산업·경제",
  cultural: "문화·예술",
};

export const DOMAIN_LABELS_EN: Record<Domain, string> = {
  political: "POLITICAL",
  strategic: "STRATEGIC",
  tech: "TECH",
  social: "SOCIAL",
  economic: "ECONOMIC",
  cultural: "CULTURAL",
};

// ─── 카드 ───

export interface BattleCard {
  id: string;
  nickname: string;
  profession: string;
  title: string;
  nationality: string;
  avatarUrl: string | null;
  portraitUrl: string | null;
  quotes: string;
  gender: boolean | null;
  speechTone: SpeechTone;
  influence: Record<Domain, number>; // 0-10
  /** 능력치 4개 — 단일원천: persona/constants.ts AbilityKey */
  ability: Record<AbilityKey, number>;
  /** 인물별 고유 대사 (없으면 공통 대사 폴백) */
  dialogueLines?: DialogueLines;
}

// ─── 명령 체계 (3명령 RPS) ───

export type Command = "assault" | "stratagem" | "govern";

export const COMMANDS: Command[] = ["assault", "stratagem", "govern"];

export const COMMAND_LABELS: Record<Command, string> = {
  assault: "전투",
  stratagem: "책략",
  govern: "내정",
};

export const COMMAND_DESCRIPTIONS: Record<Command, string> = {
  assault: "상대 국력 직접 타격. 민심 -3",
  stratagem: "상대 민심 공격",
  govern: "국력·민심 회복 + 버린패 회수. 카드 유지",
};

// ─── 국가 상태 ───

export const INITIAL_POWER = 30;
export const INITIAL_MORALE = 50;
export const MAX_POWER = 35;
export const MAX_MORALE = 60;

export interface NationState {
  power: number;  // 국력 (초기 30, 0 이하 = 패배)
  morale: number; // 민심 (초기 50, 0 이하 = 반란)
}

// ─── v6 게임 페이즈 ───

export type GamePhase = "idle" | "loading" | "draft" | "captain" | "battle" | "result";

export type Difficulty = "normal" | "hard";

// ─── 드래프트 상태 ───

export interface DraftState {
  pool: BattleCard[];           // 15장 풀
  playerPicks: BattleCard[];    // 플레이어 픽
  aiPicks: BattleCard[];        // AI 픽
  currentPicker: "player" | "ai" | "done";
  round: number;                // 1-14 (교대 픽)
}

// ─── 배틀 서브 페이즈 ───

export type BattleSubPhase = "selecting" | "clashing" | "resolving";

// ─── 상성 결과 ───

export type CounterResult = "win" | "lose" | "draw";

// ─── 라운드 행동 ───

export interface RoundAction {
  cardId: string;
  command: Command;
  recoverId?: string;
  card: BattleCard;
  aptitude: number;
  mandateBonus: boolean;
  effectiveAptitude: number;
}

// ─── 라운드 기록 ───

export interface RoundRecord {
  round: number;
  player: RoundAction;
  ai: RoundAction;
  counterResult: CounterResult;   // 플레이어 관점
  result: string;
  powerDelta: { player: number; ai: number };
  moraleDelta: { player: number; ai: number };
  rebellion: { player: boolean; ai: boolean };
  nationAfter: { player: NationState; ai: NationState };
}

// ─── 천명 (라운드 보너스) ───

export interface Mandate {
  command: Command;
  label: string;
  description: string;
}

export const MANDATE_POOL: Mandate[] = [
  { command: "assault",   label: "풍운의 천명", description: "전투 적성 ×1.5" },
  { command: "stratagem", label: "암중의 천명", description: "책략 적성 ×1.5" },
  { command: "govern",    label: "태평의 천명", description: "내정 적성 ×1.5" },
];

export const MANDATE_BONUS = 1.5;

// ─── 주장 (지휘관 오라) ───

/** 주장이 손패에 있을 때 아군 전원 적성 보너스 */
export const CAPTAIN_AURA_BONUS = 0.15;
/** 주장이 직접 출전할 때 본인 적성 배수 */
export const CAPTAIN_PLAY_BONUS = 1.5;

// ─── 게임 상태 ───

export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  // 드래프트
  draft: DraftState;
  // 배틀
  playerHand: BattleCard[];
  aiHand: BattleCard[];
  playerDiscard: BattleCard[];
  aiDiscard: BattleCard[];
  playerNation: NationState;
  aiNation: NationState;
  // 라운드 기반
  currentRound: number;
  battleSubPhase: BattleSubPhase;
  roundRecords: RoundRecord[];
  pendingRound: { playerAction: RoundAction; aiAction: RoundAction } | null;
  // 천명
  mandates: Mandate[];       // 셔플된 천명 순서
  mandateIndex: number;       // 현재 천명 인덱스
  // 주장
  playerCaptainId: string | null;
  aiCaptainId: string | null;
}
