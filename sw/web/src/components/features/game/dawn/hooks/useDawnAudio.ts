/*
  파일명: components/features/game/dawn/hooks/useDawnAudio.ts
  기능: 여명 게임 오디오 설정
  책임: 여명 전용 BGM 경로를 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/dawn/audio";

const DAWN_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
      case "playing":
      case "gameover":
        return [{ src: `${BASE}/bgm-main.mp3`, label: "여명" }];
      default:
        return [];
    }
  },
};

export function useDawnAudio() {
  return useGameAudio(DAWN_AUDIO_CONFIG);
}
