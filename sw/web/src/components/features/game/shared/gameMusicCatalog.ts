/*
  파일명: components/features/game/shared/gameMusicCatalog.ts
  기능: 게임 배경음악 카탈로그
  책임: 각 게임의 BGM 원곡을 묶음으로 모아 음악 재생기 목록에 상시 제공한다.
        원곡 정의는 각 게임의 오디오 설정 파일이 쥐고, 묶음 이름은
        layout.musicPlayer.gameGroups 메시지 키가 쥔다(여기서는 모으기만 한다).
*/

import { RESULT_MUSIC, type BgmTrack } from "./hooks/useGameAudio";
import { SUIKODEN_MUSIC } from "../suikoden/hooks/useSuikodenAudio";
import { BATTLE_MUSIC } from "../battle/hooks/useBattleAudio";
import { DAWN_MUSIC } from "../dawn/hooks/useDawnAudio";
import { LABYRINTH_MUSIC } from "../labyrinth/hooks/useLabyrinthAudio";
import { MEMORY_MUSIC } from "../memory/useMemoryAudio";

export interface GameMusicGroup {
  /** 묶음 식별자 — 목록 행 id, gameGroups 메시지 키, 게임 자리 링크(/rest#key)에 쓴다 */
  key: string;
  /** 묶음이 가리키는 게임 자리. 없으면 행에 바로가기를 붙이지 않는다 */
  href: string | null;
  tracks: BgmTrack[];
}

export const GAME_MUSIC_GROUPS: GameMusicGroup[] = [
  {
    key: "suikoden",
    href: "/rest#suikoden",
    tracks: [SUIKODEN_MUSIC.gangho, SUIKODEN_MUSIC.wind],
  },
  {
    key: "hegemony",
    href: "/rest#hegemony",
    tracks: [BATTLE_MUSIC.main, BATTLE_MUSIC.draft, BATTLE_MUSIC.battle],
  },
  {
    key: "dawn",
    href: "/rest#dawn",
    tracks: [DAWN_MUSIC.main, DAWN_MUSIC.ingame, DAWN_MUSIC.streak],
  },
  {
    key: "labyrinth",
    href: "/rest#labyrinth",
    tracks: [LABYRINTH_MUSIC.intro, LABYRINTH_MUSIC.gameplay],
  },
  {
    key: "memory",
    href: "/rest#memory",
    tracks: [MEMORY_MUSIC.main],
  },
  {
    key: "result",
    href: null,
    tracks: [RESULT_MUSIC.win, RESULT_MUSIC.lose],
  },
];
