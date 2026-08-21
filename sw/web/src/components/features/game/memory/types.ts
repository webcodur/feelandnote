export type MemoryDifficulty = "easy" | "normal" | "hard";
export type MemoryPairResult = "match" | "mismatch" | null;

export interface MemoryFigure {
  id: string;
  name: string;
  avatarUrl: string;
  /** 결과 화면 연대기 정렬용 */
  birthYear: number;
  profession: string | null;
}

export interface MemoryCardData {
  instanceId: string;
  figure: MemoryFigure;
}

export interface DifficultyConfig {
  key: MemoryDifficulty;
  pairs: number;
  /** 가로 화면의 폭 상한 — 세로 화면은 상한 없이 높이에 맞춰 키운다 */
  maxWidthClassName: string;
  /** 열 수와 격자 비율 — 비율은 (열x4):(행x5)로, 카드 4:5에서 역산한 값이다. 세로 화면은 열을 하나 줄인다 */
  gridClassName: string;
}

export const MEMORY_DIFFICULTIES: readonly DifficultyConfig[] = [
  { key: "easy", pairs: 6, maxWidthClassName: "landscape:max-w-[60rem]", gridClassName: "grid-cols-3 landscape:grid-cols-4 aspect-[3/5] landscape:aspect-[16/15]" },
  { key: "normal", pairs: 10, maxWidthClassName: "landscape:max-w-[66rem]", gridClassName: "grid-cols-4 landscape:grid-cols-5 aspect-[16/25] landscape:aspect-square" },
  { key: "hard", pairs: 15, maxWidthClassName: "landscape:max-w-[74rem]", gridClassName: "grid-cols-5 landscape:grid-cols-6 aspect-[2/3] landscape:aspect-[24/25]" },
];
