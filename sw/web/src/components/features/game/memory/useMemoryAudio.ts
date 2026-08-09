"use client";

import {
  useGameAudio,
  type GameAudioConfig,
} from "@/components/features/game/shared/hooks/useGameAudio";

export const MEMORY_SFX = {
  chooseDifficulty: "sfx-cmd-select.mp3",
  start: "sfx-start.mp3",
  reveal: "sfx-card-select.mp3",
  close: "sfx-card-deselect.mp3",
  match: "sfx-mandate-match.mp3",
  complete: "sfx-round-win.mp3",
} as const;

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
  return { ...useGameAudio(MEMORY_AUDIO_CONFIG), playMismatchSfx };
}
