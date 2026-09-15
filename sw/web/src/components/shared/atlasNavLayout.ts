/*
  파일명: /components/shared/atlasNavLayout.ts
  기능: 탐색 도감 선택기(AtlasNav)의 모양 값
  책임: 신화 탐색과 세력도감이 같은 상자·칩 줄·밑줄 탭 모양을 쓴다. 지시문 없는 일반 모듈이라 서버 컴포넌트(골격 화면)도 값을 그대로 읽는다.
*/

export const ATLAS_NAV_LAYOUT = {
  /** 줄들을 쌓는 상자 */
  navigation: "mx-auto grid max-w-[1040px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/[0.16] p-1.5",
  /** 칩 줄은 넓은 화면 전용이다. 좁은 화면은 줄마다 단추 하나로 접고 누르면 창에서 고른다 */
  chipNav: "hidden min-w-0 rounded-xl px-1.5 py-1 md:block md:px-2",
  /** 좁은 화면 단추 격자 — 기본은 반 폭, 넓은 줄(wide)은 한 줄 전체 */
  mobilePicker: "grid grid-cols-2 gap-2 px-2 py-1.5 md:hidden",
  /* 한 줄짜리 가로 목록이다 — 접지 않고 손·마우스로 민다(ui-rail).
     칩이 적어 폭이 남으면 가운데 두되, 넘칠 때 앞머리가 잘리지 않게 safe 정렬을 쓴다 */
  navList: "scrollbar-hide -mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 select-none pointer-coarse:snap-x md:justify-center-safe",
  /* 칩 한 개 — 글자 크기는 두고 여백만 줄였다. 높이를 값으로 못박아 골격 화면도 같은 높이를 읽는다.
     탐색 계열의 칩 줄(도감 선택기·연대기 대륙·국가·시대)이 모두 이 값을 쓴다 */
  chip: "flex h-7 shrink-0 snap-start items-center justify-center gap-1.5 border px-2.5 text-center text-sm font-semibold",
  chipSelected: "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]",
  chipIdle: {
    pill: "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent",
    square: "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-white/[0.07] hover:text-text-primary",
  },
  /* 윗줄은 알약, 아랫줄은 네모 — 두 줄의 칩이 같은 모양이면 어느 줄을 고르는지 헷갈린다 */
  pill: "rounded-full",
  square: "rounded-md",
  /* 셋째 줄은 칩이 아니라 밑줄 탭 — 알약·네모보다 한 단계 아래라는 것이 모양으로 보인다 */
  groupTab: "flex h-7 shrink-0 snap-start items-center border-b-2 px-2 text-sm font-semibold",
} as const;
