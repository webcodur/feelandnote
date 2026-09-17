/*
  파일명: components/features/game/labyrinth/hooks/useLabyrinthAudio.ts
  기능: 미궁 게임 오디오 설정
  책임: 미궁 전용 BGM 경로를 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useGameAudio, RESULT_MUSIC, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/labyrinth";

/** 미궁 게임 BGM — 페이즈 매핑과 음악 재생기 카탈로그가 함께 쓴다 */
export const LABYRINTH_MUSIC = {
  intro: { src: `${BASE}/labyrinth-intro.mp3`, label: "미궁의 문", labelEn: "Gates of the Labyrinth" },
  gameplay: { src: `${BASE}/labyrinth-gameplay.mp3`, label: "끝없는 회랑", labelEn: "Endless Corridors" },
} satisfies Record<string, BgmTrack>;

const LABYRINTH_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxFiles: [],
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
        return [LABYRINTH_MUSIC.intro];
      case "loading":
      case "stage1":
      case "stage2":
      case "stage3":
      case "stage4":
      case "stage5":
        return [LABYRINTH_MUSIC.gameplay];
      case "result-win":
        return [RESULT_MUSIC.win];
      case "result-lose":
        return [RESULT_MUSIC.lose];
      default:
        return [];
    }
  },
};

export function useLabyrinthAudio() {
  return useGameAudio(LABYRINTH_AUDIO_CONFIG);
}
