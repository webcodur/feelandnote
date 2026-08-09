export type MemoryDifficulty = "easy" | "normal" | "hard";
export type MemoryPairResult = "match" | "mismatch" | null;

export interface MemoryFigure {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface MemoryCardData {
  instanceId: string;
  figure: MemoryFigure;
}

export interface DifficultyConfig {
  key: MemoryDifficulty;
  pairs: number;
  gridClassName: string;
}

export const MEMORY_DIFFICULTIES: readonly DifficultyConfig[] = [
  { key: "easy", pairs: 6, gridClassName: "grid-cols-4 max-w-2xl" },
  { key: "normal", pairs: 10, gridClassName: "grid-cols-4 sm:grid-cols-5 max-w-3xl" },
  { key: "hard", pairs: 15, gridClassName: "grid-cols-5 sm:grid-cols-6 max-w-4xl" },
];
