// Keep loading geometry tied to the atlas at every breakpoint.
export const MYTH_LAYOUT = {
  atlas: "scroll-mt-20 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(217,181,78,.045),transparent_30%),var(--color-bg-secondary)] [overflow-anchor:none]",
  container: "mx-auto max-w-[1040px]",
  navigationOuter: "px-4 pb-2 pt-4 md:px-6 md:pb-2 md:pt-6",
  navigation: "mx-auto grid max-w-[1040px] overflow-hidden rounded-[20px] border border-white/[0.08] bg-black/[0.16] p-2",
  nav: "min-w-0 rounded-xl px-2 py-1.5 md:px-3",
  /* 지역·신화 칩 줄은 PC 전용이다. 모바일은 버튼 두 개로 접고 누르면 아래에서 창이 올라온다 */
  chipNav: "hidden min-w-0 rounded-xl px-2 py-1.5 md:block md:px-3",
  mobilePicker: "grid grid-cols-2 gap-2 px-2 py-1.5 md:hidden",
  /* 모바일 버튼은 둘 다 네모다 — 나란히 선 두 버튼의 모양이 갈리면 어색하다. PC 칩 줄만 알약·네모로 가른다 */
  mobilePickerButton: "flex min-w-0 items-center justify-between gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:border-accent",
  /* 지역·신화·인물 세 줄은 모두 한 줄짜리 가로 목록이다 — 접지 않고 손·마우스로 민다(ui-rail).
     칩이 적어 폭이 남으면 가운데 두되, 넘칠 때 앞머리가 잘리지 않게 safe 정렬을 쓴다 */
  navList: "scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1 select-none pointer-coarse:snap-x md:justify-center-safe",
  /* 지역은 알약, 신화는 네모 — 두 줄의 칩이 같은 모양이면 어느 줄을 고르는지 헷갈린다 */
  regionChipShape: "rounded-full",
  traditionChipShape: "rounded-lg",
  /* 그룹은 칩이 아니라 밑줄 탭 — 지역(알약)·신화(네모)보다 한 단계 아래라는 것이 모양으로 보인다 */
  groupTab: "flex shrink-0 snap-start items-center border-b-2 px-2.5 py-1.5 text-sm font-semibold",
  memberList: "scrollbar-hide -mx-1 flex gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 select-none pointer-coarse:snap-x md:gap-3",
  notice: "mx-2 mb-1 flex items-start justify-center gap-2 rounded-xl border border-accent/[0.12] bg-accent/[0.035] px-3 py-2.5 text-center text-xs leading-5 text-text-tertiary md:mx-3",
  railCardSize: "w-[96px] md:w-[108px]",
  overviewOuter: "min-w-0 px-4 pb-4 pt-2 md:px-6 md:pb-6",
  overview: "overflow-hidden rounded-[24px] border border-white/[0.08] bg-black",
  artwork: "relative aspect-[3/2] w-full overflow-hidden",
  /* 그룹 개요 — 넓은 화면은 전승 개요와 같은 3:2 판에 왼쪽 핵심 인물·오른쪽 패널, 좁은 화면은 위아래로 쌓는다 */
  groupFrame: "relative bg-black lg:aspect-[3/2]",
  groupStage: "relative flex w-full flex-col justify-center bg-[radial-gradient(circle_at_30%_0%,rgba(217,181,78,.12),transparent_60%)] px-5 pb-6 pt-6 md:px-7 lg:absolute lg:inset-y-0 lg:start-0 lg:w-[57%] lg:py-8",
  /* 핵심 인물 칸 — 세 칸 폭을 고정해 두 명뿐인 그룹도 칸 크기가 같고 가운데 모인다 */
  groupCoreList: "mt-3 flex justify-center gap-3",
  groupCoreItem: "w-[calc((100%-1.5rem)/3)] min-w-0",
  overviewPanel: "relative z-10 bg-black px-5 pb-6 pt-5 md:px-7 md:pb-7 md:pt-6 lg:absolute lg:inset-y-0 lg:end-0 lg:flex lg:w-[43%] lg:items-center lg:bg-transparent lg:px-6 lg:py-8 xl:px-8",
  overviewBody: "flex w-full min-w-0 flex-col lg:h-[430px] lg:rounded-[20px] lg:border lg:border-white/[0.09] lg:bg-black/[0.88] lg:p-6 lg:shadow-[0_18px_44px_rgba(0,0,0,.28)]",
  overviewHeader: "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
  overviewStats: "min-w-0 text-end text-[11px] font-semibold leading-5 text-text-tertiary md:text-xs",
  description: "scrollbar-thin mt-4 h-56 overflow-y-auto pe-2 [overflow-anchor:none] md:h-64 lg:min-h-0 lg:flex-1",
  entryLabel: "text-[11px] font-bold tracking-[.14em]",
  entryTitle: "mt-0.5 min-h-10 line-clamp-2 text-sm font-bold leading-5",
  entryCreator: "mt-0.5 h-4 truncate text-xs text-text-secondary",
} as const;
