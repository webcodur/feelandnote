/*
  음악 재생기가 들어가는 자리들. 재생기 하나가 화면 형편에 따라 여는 단추와 창을 이 자리로 옮겨 세운다.
  - 하단 내비 탭 칸: 휴대폰에서 여는 단추가 탭 하나로 선다.
  - 하단 내비 위 자리: 휴대폰 창이 내비(와 그 위에 붙은 띠) 바로 위로 올라온다.
  - 헤더 자리: PC에서 여는 단추가 프로필 옆에 선다.
  - 게임 전체 화면 층: 이 층이 떠 있으면 헤더·내비가 가려지므로 재생기는 떠 있는 단추로 돌아간다.
*/
import { createLayoutSlot } from "./layoutSlot";

const navTab = createLayoutSlot();
const navPanel = createLayoutSlot();
const header = createLayoutSlot();
const gameFullScreen = createLayoutSlot();

export const setMusicNavTabSlot = navTab.setElement;
export const useMusicNavTabSlot = navTab.useElement;

export const setMusicNavPanelSlot = navPanel.setElement;
export const useMusicNavPanelSlot = navPanel.useElement;

export const setMusicHeaderSlot = header.setElement;
export const useMusicHeaderSlot = header.useElement;

export const setGameFullScreenLayer = gameFullScreen.setElement;
export const useGameFullScreenLayer = gameFullScreen.useElement;
