/*
  파일명: components/features/game/battle/hooks/useBattleAudio.ts
  기능: 패권 게임 오디오 설정
  책임: 패권 전용 오디오 경로, SFX 목록, BGM 매핑을 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/suikoden/audio/battle";

const BATTLE_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [
    "sfx-card-deselect.mp3", "sfx-card-select.mp3", "sfx-card-pick.mp3",
    "sfx-clash-slash.mp3", "sfx-clash-clang.mp3",
    "sfx-cmd-select.mp3", "sfx-confirm.mp3", "sfx-deploy.mp3",
    "sfx-draft-ai.mp3", "sfx-draft-complete.mp3", "sfx-draft-pick.mp3",
    "sfx-enter-gate.mp3", "sfx-mandate-match.mp3", "sfx-rebellion.mp3",
    "sfx-reshuffle.mp3", "sfx-reveal.mp3", "sfx-round-draw.mp3",
    "sfx-round-lose.mp3", "sfx-round-win.mp3", "sfx-start.mp3",
  ],
  getBgmTracks: (state: string, context?: Record<string, unknown>): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [{ src: `${BASE}/bgm-intro.mp3`, label: "Intro" }];
      case "draft":
        return [{ src: `${BASE}/bgm-draft.mp3`, label: "Draft" }];
      case "battle":
        return [{ src: `${BASE}/bgm-battle.mp3`, label: "Battle" }];
      case "result":
        return context?.playerWins
          ? [{ src: `${BASE}/bgm-result-win.mp3`, label: "Victory" }]
          : [{ src: `${BASE}/bgm-result-lose.mp3`, label: "Defeat" }];
      default:
        return [];
    }
  },
};

export type { BgmTrack };

export function useBattleAudio() {
  return useGameAudio(BATTLE_AUDIO_CONFIG);
}
