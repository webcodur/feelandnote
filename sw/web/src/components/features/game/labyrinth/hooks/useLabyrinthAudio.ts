/*
  파일명: components/features/game/labyrinth/hooks/useLabyrinthAudio.ts
  기능: 미궁 게임 오디오 설정
  책임: 미궁 전용 BGM 경로를 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/labyrinth/audio";

const LABYRINTH_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [{ src: `${BASE}/bgm-lobby.mp3`, label: "미궁 — Lobby" }];
      case "loading":
      case "stage1":
      case "stage2":
      case "stage3":
      case "stage4":
      case "stage5":
      case "result":
        return [{ src: `${BASE}/bgm-gameplay.mp3`, label: "미궁 — Gameplay" }];
      default:
        return [];
    }
  },
};

export function useLabyrinthAudio() {
  return useGameAudio(LABYRINTH_AUDIO_CONFIG);
}
