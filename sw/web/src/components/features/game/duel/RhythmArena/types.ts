import type { RhythmJudgment, Lane } from "@/lib/game/rhythmEngine";

// ─── Props ───

export interface RhythmArenaProps {
  playerCard: import("@/lib/game/types").BattleCard;
  aiCard: import("@/lib/game/types").BattleCard;
  onComplete: (winner: "player" | "ai" | "draw") => void;
}

// ─── 판정 스타일 ───

export const JUDGMENT_STYLE: Record<RhythmJudgment, { color: string; label: string }> = {
  perfect: { color: "#d4af37", label: "PERFECT" },
  good: { color: "#c0c0c0", label: "GOOD" },
  miss: { color: "#a03030", label: "MISS" },
};

// ─── 상수 ───

export const JUDGE_RATIO = 0.78;    // 플레이 영역 높이의 78% 지점에 타겟 배치
export const NOTE_R = 16;           // 노트 반지름
export const TARGET_R = 24;         // 타겟 동심원 반지름
const LANE_GAP = 72;         // 레인 간 중심 간격
export const LANE_COUNT = 3;
export const LANE_KEYS = ["Q", "W", "E"] as const;
export const LANE_KEY_CODES: Record<string, Lane> = { KeyQ: 0, KeyW: 1, KeyE: 2 };

// 레인 X 오프셋 (중앙 기준): -72, 0, +72
export const laneX = (lane: number) => (lane - 1) * LANE_GAP;

export type Phase = "intro" | "countdown" | "playing" | "aiTurn" | "result";
