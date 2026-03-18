import type { Command } from "@/lib/game/types";

// ─── 상수 ───

export const VB = 120; // viewBox 크기
export const CX = 60;  // 중심 X
export const CY = 60;  // 중심 Y

// ─── 포즈 타입 ───

export type FighterPose =
  | "idle"
  | "charge"
  | "slash"
  | "guard"
  | "hit"
  | "fallen";

export interface DuelFighterProps {
  avatarUrl: string | null;
  nickname: string;
  pose: FighterPose;
  flipped?: boolean;
  momentum?: number;
  command?: Command;
  className?: string;
}
