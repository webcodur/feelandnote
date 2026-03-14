/*
  파일명: components/features/game/labyrinth/hooks/useLabyrinthAudio.ts
  기능: 미궁 게임 오디오 설정
  책임: 미궁 전용 BGM 경로를 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/labyrinth";

const LABYRINTH_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [{ src: `${BASE}/labyrinth-main--deliberation-of-stone.mp3`, label: "Deliberation of Stone" }];
      case "loading":
      case "stage1":
      case "stage2":
      case "stage3":
      case "stage4":
      case "stage5":
        return [{ src: `${BASE}/labyrinth-gameplay.mp3`, label: "미궁 — Gameplay" }];
      case "result-win":
        return [{ src: "/assets/common/bgm-result-win.mp3", label: "Victory" }];
      case "result-lose":
        return [{ src: "/assets/common/bgm-result-lose.mp3", label: "Defeat" }];
      default:
        return [];
    }
  },
};

export function useLabyrinthAudio() {
  return useGameAudio(LABYRINTH_AUDIO_CONFIG);
}
