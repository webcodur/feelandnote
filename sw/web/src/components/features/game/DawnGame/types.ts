/*
  파일명: DawnGame/types.ts
  기능: 여명(Dawn) 게임 타입 및 상수
*/
import type { CelebProfile } from "@/types/home";

export type GameState = "idle" | "playing" | "gameover";
export type Difficulty = "easy" | "hard";
export type HintType = "century" | "highlight" | "eliminate" | null;

export const INITIAL_LIVES = 3;
export const INITIAL_TORCHES = 2;

export interface DawnCeleb extends CelebProfile {
  birthYear: number;
}
