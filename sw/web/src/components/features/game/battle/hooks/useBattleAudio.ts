/*
  파일명: components/features/game/battle/hooks/useBattleAudio.ts
  기능: 패권 게임 오디오 설정
  책임: 패권 전용 오디오 경로, SFX 목록, BGM 매핑을 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/hegemony";

const BATTLE_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxBasePath: "/assets/common",
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
        return [{ src: `${BASE}/hegemony-main--in-the-name-of-olympus.mp3`, label: "올림포스의 이름으로" }];
      case "draft":
        return [{ src: `${BASE}/hegemony-draft.mp3`, label: "Draft" }];
      case "battle":
        return [{ src: `${BASE}/hegemony-battle.mp3`, label: "Battle" }];
      case "result":
        return context?.playerWins
          ? [{ src: "/assets/common/bgm-result-win.mp3", label: "Victory" }]
          : [{ src: "/assets/common/bgm-result-lose.mp3", label: "Defeat" }];
      default:
        return [];
    }
  },
};

export type { BgmTrack };

export function useBattleAudio() {
  return useGameAudio(BATTLE_AUDIO_CONFIG);
}
