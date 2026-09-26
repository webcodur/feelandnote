/*
  음악 재생기가 들어가는 자리들. 재생기 하나가 화면 형편에 따라 여는 단추와 창을 이 자리로 옮겨 세운다.
  - 하단 내비 탭 칸: 휴대폰에서 여는 단추가 탭 하나로 선다.
  - 하단 내비 틀 안 자리: 휴대폰 창이 여기로 포털해 내비의 고정 층 안에서 화면 가운데 모달로 선다.
  - 게임 전체 화면 층: 이 층이 떠 있으면 내비가 가려지므로 재생기는 떠 있는 단추로 돌아간다.
  - 게임 헤더 칸: 게임 전체 화면이 뜬 휴대폰에서 여는 단추가 헤더 우측으로 들어간다.
  자리가 하나도 없으면(PC) 재생기는 오른쪽 아래 떠 있는 단추로 선다.
*/
import { createLayoutSlot } from "./layoutSlot";

const navTab = createLayoutSlot();
const navPanel = createLayoutSlot();
const gameFullScreen = createLayoutSlot();
const gameMusicTab = createLayoutSlot();

export const setMusicNavTabSlot = navTab.setElement;
export const useMusicNavTabSlot = navTab.useElement;

export const setMusicNavPanelSlot = navPanel.setElement;
export const useMusicNavPanelSlot = navPanel.useElement;

export const setGameFullScreenLayer = gameFullScreen.setElement;
export const useGameFullScreenLayer = gameFullScreen.useElement;

export const setGameMusicTabSlot = gameMusicTab.setElement;
export const useGameMusicTabSlot = gameMusicTab.useElement;
