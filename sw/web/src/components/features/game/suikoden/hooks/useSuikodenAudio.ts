/*
  파일명: components/features/game/suikoden/hooks/useSuikodenAudio.ts
  기능: 천도 게임 오디오 설정
  책임: 천도 전용 BGM 매핑을 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/suikoden";

const SUIKODEN_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [
          { src: `${BASE}/suikoden-main--name-of-gangho.mp3`, label: "강호의 이름으로" },
          { src: `${BASE}/suikoden-ingame--words-of-wind.mp3`, label: "바람이 전한 말" },
        ];
      case "setup":
      case "wandering":
      case "strategy":
      case "battle":
      case "disposition":
        return [
          { src: `${BASE}/suikoden-ingame--words-of-wind.mp3`, label: "바람이 전한 말" },
          { src: `${BASE}/suikoden-main--name-of-gangho.mp3`, label: "강호의 이름으로" },
        ];
      case "result":
        return [
          { src: `${BASE}/suikoden-main--name-of-gangho.mp3`, label: "강호의 이름으로" },
          { src: `${BASE}/suikoden-ingame--words-of-wind.mp3`, label: "바람이 전한 말" },
        ];
      default:
        return [];
    }
  },
};

export function useSuikodenAudio() {
  return useGameAudio(SUIKODEN_AUDIO_CONFIG);
}
