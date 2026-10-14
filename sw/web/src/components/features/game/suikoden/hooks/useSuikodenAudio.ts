/*
  파일명: components/features/game/suikoden/hooks/useSuikodenAudio.ts
  기능: 천도 게임 오디오 설정
  책임: 천도 전용 BGM 매핑을 정의하고 useGameAudio에 위임한다.
*/
"use client";

import { useCallback } from 'react';

import { useGameAudio, type GameAudioConfig, type BgmTrack } from "@/components/features/game/shared/hooks/useGameAudio";

const BASE = "/assets/suikoden";
const SFX = { stratagem: 'sfx-clash-stratagem.mp3', reveal: 'sfx-reveal.mp3', click: 'sfx-cmd-select.mp3', pick: 'sfx-card-pick.mp3', confirm: 'sfx-confirm.mp3', deploy: 'sfx-deploy.mp3', start: 'sfx-start.mp3', win: 'sfx-round-win.mp3', lose: 'sfx-round-lose.mp3', assault: 'sfx-clash-assault.mp3', clang: 'sfx-clash-clang.mp3', govern: 'sfx-clash-govern.mp3', slash: 'sfx-clash-slash.mp3' } as const;
export type CheondoSfx = keyof typeof SFX;

/** 천도 게임 BGM — 페이즈 매핑과 음악 재생기 카탈로그가 함께 쓴다 */
export const SUIKODEN_MUSIC = {
  gangho: { src: `${BASE}/suikoden-main--name-of-gangho.mp3`, label: "강호의 이름으로", labelEn: "In the Name of Gangho" },
  wind: { src: `${BASE}/suikoden-ingame--words-of-wind.mp3`, label: "바람이 전한 말", labelEn: "Words of Wind" },
} satisfies Record<string, BgmTrack>;

const SUIKODEN_AUDIO_CONFIG: GameAudioConfig = {
  basePath: BASE,
  sfxBasePath: '/assets/common',
  sfxFiles: Object.values(SFX),
  getBgmTracks: (state: string): BgmTrack[] => {
    switch (state) {
      case "idle":
      case "title":
      case "codex":
      case "win":
      case "lose":
        return [SUIKODEN_MUSIC.gangho, SUIKODEN_MUSIC.wind];
      case "setup":
      case "select":
      case "wander":
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
  const audio = useGameAudio(SUIKODEN_AUDIO_CONFIG);
  const sfx = useCallback((name: CheondoSfx) => audio.playSfx(SFX[name]), [audio.playSfx]);
  return { ...audio, sfx };
}
