/*
  파일명: components/features/game/hegemony/hooks/useHegemonyAudio.ts
  기능: 패권 오디오 설정
  책임: 패권 전용 배경음악·효과음 목록과 화면 단계별 배경음악을 정하고 useGameAudio에 넘긴다.
*/
"use client";

import { useGameAudio, RESULT_MUSIC, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/hegemony";

/** 패권 배경음악 — 단계별 연결과 음악 재생기 목록이 함께 쓴다 */
export const HEGEMONY_MUSIC = {
  main: { src: `${BASE}/hegemony-main--in-the-name-of-olympus.mp3`, label: "올림포스의 이름으로", labelEn: "In the Name of Olympus" },
  draft: { src: `${BASE}/hegemony-draft.mp3`, label: "운명의 선택", labelEn: "Draft of Fates" },
  battle: { src: `${BASE}/hegemony-battle.mp3`, label: "패권의 격돌", labelEn: "Clash of Sovereigns" },
} satisfies Record<string, BgmTrack>;

/** 화면에서 부르는 효과음 이름 → 파일 */
export const SFX = {
  enter: "sfx-enter-gate.mp3",
  confirm: "sfx-confirm.mp3",
  start: "sfx-start.mp3",
  select: "sfx-card-select.mp3",
  deselect: "sfx-card-deselect.mp3",
  pick: "sfx-draft-pick.mp3",
  aiPick: "sfx-draft-ai.mp3",
  draftDone: "sfx-draft-complete.mp3",
  reshuffle: "sfx-reshuffle.mp3",
  command: "sfx-cmd-select.mp3",
  deploy: "sfx-deploy.mp3",
  reveal: "sfx-reveal.mp3",
  mandate: "sfx-mandate-match.mp3",
  clashAssault: "sfx-clash-assault.mp3",
  clashStratagem: "sfx-clash-stratagem.mp3",
  clashGovern: "sfx-clash-govern.mp3",
  clang: "sfx-clash-clang.mp3",
  rebellion: "sfx-rebellion.mp3",
  roundWin: "sfx-round-win.mp3",
  roundLose: "sfx-round-lose.mp3",
  roundDraw: "sfx-round-draw.mp3",
} as const;

export type SfxName = keyof typeof SFX;

type BgmContext = Parameters<GameAudioConfig["getBgmTracks"]>[1];

const BGM_BY_STATE: Record<string, (context?: BgmContext) => BgmTrack[]> = {
  title: () => [HEGEMONY_MUSIC.main],
  draft: () => [HEGEMONY_MUSIC.draft],
  captain: () => [HEGEMONY_MUSIC.draft],
  battle: () => [HEGEMONY_MUSIC.battle],
  result: (context) => [context?.playerWins ? RESULT_MUSIC.win : RESULT_MUSIC.lose],
};

const HEGEMONY_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxBasePath: "/assets/common",
  sfxFiles: Object.values(SFX),
  getBgmTracks: (state, context) => BGM_BY_STATE[state]?.(context) ?? [],
};

export function useHegemonyAudio() {
  return useGameAudio(HEGEMONY_AUDIO_CONFIG);
}
