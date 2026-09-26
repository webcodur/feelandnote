/*
  파일명: /components/shared/exploreNavLayout.ts
  기능: 탐색 도감 선택기(ExploreNav)의 모양 값
  책임: 신화 탐색과 세력도감이 같은 상자·선택 칩 모양을 쓴다. 지시문 없는 일반 모듈이라 서버 컴포넌트(골격 화면)도 값을 그대로 읽는다.
*/

export const EXPLORE_NAV_LAYOUT = {
  /** 줄들을 쌓는 상자 */
  navigation: "mx-auto grid max-w-[1040px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/[0.16] p-1.5",
  /* 바깥 윤곽선이 따로 있는 화면(신화 탐색)은 좁은 화면에서 상자를 한 겹 걷어 바깥 선 바로 다음에 항목이 선다 */
  navigationBareMobile: "max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0",
  /** 상위 선택 패널 안에 넣을 때는 자체 상자 없이 줄만 그린다. */
  navigationBare: "rounded-none border-0 bg-transparent p-0",
  navigationWrapped: "md:h-full md:min-h-0 md:grid-rows-[minmax(0,1fr)]",
  /** 칩 줄은 넓은 화면 전용이다. 좁은 화면은 줄마다 단추 하나로 접고 누르면 창에서 고른다 */
  chipNav: "hidden min-w-0 rounded-xl px-1.5 py-1 md:block md:px-2",
  chipNavWrapped: "md:h-full md:min-h-0 md:px-0 md:py-0",
  /** 좁은 화면 단추 격자 — 기본은 반 폭, 넓은 줄(wide)은 한 줄 전체 */
  mobilePicker: "grid grid-cols-2 gap-2 px-2 py-1.5 md:hidden",
  /* 한 줄짜리 가로 목록이다 — 접지 않고 손·마우스로 민다(ui-rail).
     칩이 적어 폭이 남으면 가운데 두되, 넘칠 때 앞머리가 잘리지 않게 safe 정렬을 쓴다 */
  navList: "scrollbar-hide -mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 select-none pointer-coarse:snap-x md:justify-center-safe",
  navListLarge: "md:gap-2",
  /** 그룹이 넘치면 내부에서 스크롤하고, 짧거나 끝에 닿으면 페이지 스크롤을 이어 간다. */
  navListWrapped: "custom-scrollbar flex h-full min-h-0 flex-wrap content-start items-start gap-2 overflow-x-hidden overflow-y-auto p-1 [overflow-anchor:none]",
  /* 탐색 계열의 기본 칩. 신화·팩션 상단은 chipLarge를 더해 PC에서 넉넉하게 표시한다. */
  chip: "flex h-7 shrink-0 snap-start items-center justify-center gap-1.5 border px-2.5 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  chipLarge: "md:h-10 md:px-4 md:text-base",
  chipWrapped: "max-w-full cursor-pointer text-start md:h-auto md:min-h-10 md:py-2 md:leading-snug",
  chipSelected: "border-accent bg-accent/10 text-accent hover:bg-accent/20 shadow-[inset_0_0_0_1px_rgba(217,181,78,.1)]",
  chipIdle: {
    pill: "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-accent/[0.05] hover:text-accent",
    square: "border-white/[0.18] bg-white/[0.04] text-text-secondary hover:border-accent/60 hover:bg-white/[0.07] hover:text-text-primary",
  },
  /* 윗줄은 알약, 아랫줄은 네모 — 두 줄의 칩이 같은 모양이면 어느 줄을 고르는지 헷갈린다 */
  pill: "rounded-full",
  square: "rounded-md",
  /* 그룹도 선택 전부터 전체 윤곽선을 보이는 칩으로 표시한다. */
  groupTab: "rounded-lg",
} as const;
