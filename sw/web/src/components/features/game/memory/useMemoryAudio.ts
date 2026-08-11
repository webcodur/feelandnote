"use client";

import { useCallback } from "react";
import {
  useGameAudio,
  type GameAudioConfig,
} from "@/components/features/game/shared/hooks/useGameAudio";
import { getMemoryFlipAudioPlan, MEMORY_SFX } from "./audioPlan";
import type { MemoryPairResult } from "./types";

export { MEMORY_SFX } from "./audioPlan";

const MEMORY_AUDIO_CONFIG: GameAudioConfig = {
  basePath: "/assets/common",
  sfxFiles: Object.values(MEMORY_SFX),
  getBgmTracks: () => [],
  sfxVolume: 0.42,
};

let mismatchAudioContext: AudioContext | null = null;

function playMismatchSfx() {
  try {
    mismatchAudioContext ??= new AudioContext();
    const context = mismatchAudioContext;
    if (context.state === "suspended") void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(280, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(220, startAt + 0.12);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.075, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.14);
  } catch {
    // 오디오를 지원하지 않는 환경에서는 게임 진행만 유지한다.
  }
}

export function useMemoryAudio() {
  const gameAudio = useGameAudio(MEMORY_AUDIO_CONFIG);
  const { playSfx, sfxMuted } = gameAudio;
  const playFlipSfx = useCallback(() => {
    const plan = getMemoryFlipAudioPlan(null);
    for (const sfxFile of plan.immediateSfxFiles) playSfx(sfxFile);
  }, [playSfx]);
  const playResultSfx = useCallback((result: Exclude<MemoryPairResult, null>) => {
    const plan = getMemoryFlipAudioPlan(result);
    for (const sfxFile of plan.delayedSfxFiles) playSfx(sfxFile);
    if (plan.playDelayedMismatchTone && !sfxMuted) playMismatchSfx();
  }, [playSfx, sfxMuted]);

  return { ...gameAudio, playFlipSfx, playResultSfx };
}
