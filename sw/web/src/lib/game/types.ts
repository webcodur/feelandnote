/*
  파일명: lib/game/types.ts
  기능: 영향력 대전 게임 타입 정의
  책임: 게임 전체에서 사용하는 타입을 단일 원천으로 관리한다.
*/

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

export const DOMAIN_LABELS_EN: Record<Domain, string> = {
  political: "POLITICAL",
  strategic: "STRATEGIC",
  tech: "TECH",
  social: "SOCIAL",
  economic: "ECONOMIC",
  cultural: "CULTURAL",
};

export type Tier = "S" | "A" | "B" | "C" | "D" | "E";

export interface BattleCard {
  id: string;
  nickname: string;
  profession: string;
  title: string;
  nationality: string;
  avatarUrl: string | null;
  quotes: string;
  tier: Tier;
  influence: Record<Domain, number>; // 0-10
  ability: {
    command: number;
    martial: number;
    intellect: number;
    charisma: number;
  }; // 0-100
}

export interface RoundResult {
  domain: Domain;
  playerCard: BattleCard;
  aiCard: BattleCard;
  playerDomainScore: number;
  aiDomainScore: number;
  pointsAwarded: { player: number; ai: number };
  isTiebreak: boolean;
  aiStrategy?: string;
}

export type GamePhase = "idle" | "loading" | "draft" | "battle" | "revealing" | "result";

export interface GameState {
  phase: GamePhase;
  pool: BattleCard[]; // 12명 드래프트 풀
  domainOrder: Domain[];
  currentRound: number; // 0-5
  playerHand: BattleCard[];
  aiHand: BattleCard[];
  playerScore: number;
  aiScore: number;
  rounds: RoundResult[];
  draftTurn: number; // 드래프트 진행도 (0-11)
  nextDomain: Domain | null; // 다음 영역 미리보기
}

// 스네이크 드래프트 순서: P→AI→AI→P→P→AI→AI→P→P→AI→AI→P
export const DRAFT_ORDER: ("player" | "ai")[] = [
  "player", "ai", "ai", "player", "player", "ai",
  "ai", "player", "player", "ai", "ai", "player",
];

// 타이브레이크 매핑: 영역 → 능력
export const TIEBREAK_MAP: Record<Domain, keyof BattleCard["ability"]> = {
  political: "command",
  strategic: "martial",
  tech: "intellect",
  social: "charisma",
  economic: "command",
  cultural: "charisma",
};

/** 등급 서열 (높을수록 강함) */
export const TIER_RANK: Record<Tier, number> = {
  S: 6, A: 5, B: 4, C: 3, D: 2, E: 1,
};

export const TIER_COLORS: Record<Tier, string> = {
  S: "text-red-400 bg-red-500/10 border-red-500/30",
  A: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  B: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  C: "text-green-400 bg-green-500/10 border-green-500/30",
  D: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  E: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};
