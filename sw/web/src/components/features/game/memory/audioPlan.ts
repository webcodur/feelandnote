import type { MemoryPairResult } from "./types";

export const MEMORY_SFX = {
  chooseDifficulty: "sfx-cmd-select.mp3",
  start: "sfx-start.mp3",
  reveal: "sfx-card-select.mp3",
  close: "sfx-card-deselect.mp3",
  match: "sfx-memory-match.mp3",
  complete: "sfx-round-win.mp3",
} as const;

export const MEMORY_RESULT_TIMING = {
  effectDelayMs: 180,
  effectTransitionMs: 180,
  matchFinishMs: 720,
  mismatchFinishMs: 820,
} as const;

interface MemoryFlipAudioPlan {
  immediateSfxFiles: string[];
  delayedSfxFiles: string[];
  playDelayedMismatchTone: boolean;
}

export function getMemoryFlipAudioPlan(
  result: MemoryPairResult,
): MemoryFlipAudioPlan {
  if (result === "match") {
    return {
      immediateSfxFiles: [MEMORY_SFX.reveal],
      delayedSfxFiles: [MEMORY_SFX.match],
      playDelayedMismatchTone: false,
    };
  }

  return {
    immediateSfxFiles: [MEMORY_SFX.reveal],
    delayedSfxFiles: [],
    playDelayedMismatchTone: result === "mismatch",
  };
}

export function showsMemorySuccessEffect(
  result: MemoryPairResult,
  effectActive: boolean,
  matched = false,
) {
  return matched || (result === "match" && effectActive);
}
