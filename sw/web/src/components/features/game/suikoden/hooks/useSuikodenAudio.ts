/*
  파일명: components/features/game/suikoden/hooks/useSuikodenAudio.ts
  기능: 천도 게임 오디오 설정
  책임: 천도 전용 BGM 매핑을 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/suikoden";

/** 천도 게임 BGM — 페이즈 매핑과 음악 재생기 카탈로그가 함께 쓴다 */
export const SUIKODEN_MUSIC = {
  gangho: { src: `${BASE}/suikoden-main--name-of-gangho.mp3`, label: "강호의 이름으로", labelEn: "In the Name of Gangho" },
  wind: { src: `${BASE}/suikoden-ingame--words-of-wind.mp3`, label: "바람이 전한 말", labelEn: "Words of Wind" },
} satisfies Record<string, BgmTrack>;

const SUIKODEN_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [SUIKODEN_MUSIC.gangho, SUIKODEN_MUSIC.wind];
      case "setup":
      case "wandering":
      case "strategy":
      case "battle":
      case "disposition":
        return [SUIKODEN_MUSIC.wind, SUIKODEN_MUSIC.gangho];
      case "result":
        return [SUIKODEN_MUSIC.gangho, SUIKODEN_MUSIC.wind];
      default:
        return [];
    }
  },
};

export function useSuikodenAudio() {
  return useGameAudio(SUIKODEN_AUDIO_CONFIG);
}
