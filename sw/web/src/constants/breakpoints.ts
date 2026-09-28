/*
  파일명: /constants/breakpoints.ts
  기능: 앱 뼈대의 화면 폭 전환점
  책임: 자바스크립트가 폭을 물어야 할 때 쓰는 기준을 Tailwind 전환점과 같은 값으로 쥔다.
        뼈대 전환은 두 곳뿐이다 — md(768): 하단 탭 ↔ 헤더 메뉴, xl(1280): 옆 레일이 서는 폭.
        보이기·숨기기는 CSS(md:hidden 등)로 한다. 이 값은 포털 자리처럼 CSS로 못 가르는 일에만 쓴다.
*/ // ------------------------------

export const BREAKPOINT_MD = 768;
export const BREAKPOINT_XL = 1280;

export const MEDIA_BELOW_MD = `(max-width: ${BREAKPOINT_MD - 1}px)`;
