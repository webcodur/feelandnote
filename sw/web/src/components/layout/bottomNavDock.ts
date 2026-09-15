/*
  모바일 하단 내비 바로 위의 자리.
  하단 내비와 한 몸으로 붙어야 하는 띠는 따로 fixed를 세우지 않고 이 자리에 포털로 들어간다.
  fixed 두 벌을 높이 계산으로 맞붙이면 모바일 브라우저가 스크롤 중 툴바를 접고 펼 때
  둘을 따로 옮겨 사이가 벌어진다. 같은 고정 틀 안에 있으면 벌어질 수 없다.
*/
import { createLayoutSlot } from "./layoutSlot";

const dock = createLayoutSlot();

export const setBottomNavDock = dock.setElement;

// 하단 내비가 서 있으면 그 위 자리, 없으면 null
export const useBottomNavDock = dock.useElement;
