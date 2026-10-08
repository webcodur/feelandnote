/*
  파일명: /constants/breakpoints.ts
  기능: 앱 뼈대의 화면 폭 전환점
  책임: 자바스크립트가 폭을 물어야 할 때 쓰는 기준을 Tailwind 전환점과 같은 값으로 쥔다.
        헤더 메뉴는 md부터, 옆 레일은 SIDE_RAIL부터 선다. 하단 탭은 옆 레일이 서기 전까지 둔다.
        보이기·숨기기는 CSS로 한다. 이 값은 포털 자리처럼 CSS로 못 가르는 일에만 쓴다.
*/ // ------------------------------

export const BREAKPOINT_MD = 768;
export const BREAKPOINT_XL = 1280;
export const BREAKPOINT_SIDE_RAIL = 1340;

export const MEDIA_BELOW_MD = `(max-width: ${BREAKPOINT_MD - 1}px)`;
export const MEDIA_BELOW_SIDE_RAIL = `(max-width: ${BREAKPOINT_SIDE_RAIL - 1}px)`;
