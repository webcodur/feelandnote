import {
  PORTRAIT_CHOICE_COUNT,
  PORTRAIT_ROUND_COUNT,
  type PortraitFigure,
  type PortraitRound,
} from "./types";

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createPortraitRounds(
  figures: readonly PortraitFigure[],
  roundCount = PORTRAIT_ROUND_COUNT,
  random: () => number = Math.random,
): PortraitRound[] {
  const uniqueFigures = Array.from(
    new Map(figures.map((figure) => [figure.id, figure])).values(),
  );

  if (uniqueFigures.length < PORTRAIT_CHOICE_COUNT) return [];

  return shuffle(uniqueFigures, random)
    .slice(0, Math.min(roundCount, uniqueFigures.length))
    .map((target) => {
      const distractors = shuffle(
        uniqueFigures.filter((figure) => figure.id !== target.id),
        random,
      ).slice(0, PORTRAIT_CHOICE_COUNT - 1);

      return {
        target,
        choices: shuffle([target, ...distractors], random),
      };
    });
}
