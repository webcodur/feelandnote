export interface PortraitFigure {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface PortraitRound {
  target: PortraitFigure;
  choices: PortraitFigure[];
}

export type PortraitAnswerKind = "correct" | "wrong" | "timeout" | "skipped";
export type PortraitImageStatus = "loading" | "ready" | "error";

export interface PortraitAnswerState {
  selectedId: string | null;
  kind: PortraitAnswerKind;
  points: number;
}

export const PORTRAIT_ROUND_COUNT = 10;
export const PORTRAIT_CHOICE_COUNT = 4;
export const PORTRAIT_REVEAL_INTERVAL_MS = 3000;
export const PORTRAIT_REVEAL_POINTS = [1000, 750, 500, 250] as const;
