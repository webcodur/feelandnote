import type { MemoryCardData, MemoryFigure } from "./types";

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function createMemoryBoard(
  figures: readonly MemoryFigure[],
  pairCount: number,
): MemoryCardData[] {
  const selected = shuffle(figures).slice(0, pairCount);
  const pairs = selected.flatMap((figure) => [
    { instanceId: `${figure.id}-a`, figure },
    { instanceId: `${figure.id}-b`, figure },
  ]);
  return shuffle(pairs);
}
