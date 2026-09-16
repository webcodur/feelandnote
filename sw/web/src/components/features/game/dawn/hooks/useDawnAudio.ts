/*
  파일명: components/features/game/dawn/hooks/useDawnAudio.ts
  기능: 여명 게임 오디오 설정
  책임: 여명 전용 BGM 경로를 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, RESULT_MUSIC, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/dawn";

/** 여명 게임 BGM — 페이즈 매핑과 음악 재생기 카탈로그가 함께 쓴다 */
export const DAWN_MUSIC = {
  main: { src: `${BASE}/dawn-main.mp3`, label: "첫빛", labelEn: "First Light" },
  ingame: { src: `${BASE}/dawn-ingame--awaited-dawn.mp3`, label: "기다려온 여명", labelEn: "Awaited Dawn" },
  streak: { src: `${BASE}/dawn-streak--judgment-of-the-golden-thrones.mp3`, label: "황금 옥좌의 심판", labelEn: "Judgment of the Golden Thrones" },
} satisfies Record<string, BgmTrack>;

const DAWN_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [DAWN_MUSIC.main];
      case "playing":
        return [DAWN_MUSIC.ingame];
      case "playing-streak":
        return [DAWN_MUSIC.streak];
      case "gameover":
        return [RESULT_MUSIC.win];
      default:
        return [];
    }
  },
};

export function useDawnAudio() {
  return useGameAudio(DAWN_AUDIO_CONFIG);
}
