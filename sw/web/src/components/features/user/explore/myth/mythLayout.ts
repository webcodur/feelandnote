import hubStyles from "@/components/shared/HubSection.module.css";
import { EXPLORE_NAV_LAYOUT } from "@/components/shared/exploreNavLayout";
import { CELEB_GRID_LAYOUT } from "@/components/shared/celebGridLayout";

// Keep loading geometry tied to the shell at every breakpoint.
export const MYTH_LAYOUT = {
  shell: `mx-auto w-full max-w-4xl scroll-mt-20 [overflow-anchor:none] ${hubStyles.page} ${hubStyles.spacious}`,
  container: "w-full min-w-0",
  catalogGrid: "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3",
  selectionStack: "flex min-w-0 flex-col gap-5 md:gap-6",
  selectionHeader: "flex min-w-0 flex-col items-center gap-3 text-center",
  members: "min-w-0 outline-none [overflow-anchor:none]",
  memberHeader: "mt-3 flex w-full min-w-0 flex-col items-center gap-3 text-center md:mt-4",
  actions: "flex flex-wrap items-center justify-center gap-2",
  memberControls: "flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-3",
  descriptionList: "mx-auto w-full min-w-0 space-y-6 md:space-y-8",
  descriptionRow: "grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-line pb-6 last:border-b-0 md:grid-cols-[9rem_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-6 md:pb-8 md:data-[member-image=portrait]:grid-cols-[15rem_minmax(0,1fr)] lg:data-[member-image=portrait]:grid-cols-[18rem_minmax(0,1fr)]",
  membersOuter: "min-w-0",
  // 연대기의 국가 선택기도 쓰는 공통 칩 값.
  navigation: EXPLORE_NAV_LAYOUT.navigation,
  chipNav: EXPLORE_NAV_LAYOUT.chipNav,
  mobilePicker: EXPLORE_NAV_LAYOUT.mobilePicker,
  mobilePickerButton: "flex min-w-0 items-center justify-between gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:border-accent",
  navList: EXPLORE_NAV_LAYOUT.navList,
  regionChipShape: EXPLORE_NAV_LAYOUT.pill,
  memberList: `${CELEB_GRID_LAYOUT} items-start gap-y-6 md:gap-y-7`,
  memberName: "block truncate text-xs font-medium leading-tight md:text-sm",
  memberTitle: "mt-0.5 line-clamp-2 break-keep text-[11px] leading-tight text-text-secondary [overflow-wrap:anywhere] md:text-xs",
  notice: "mx-2 mb-1 flex items-start justify-center gap-2 rounded-xl border border-accent/[0.12] bg-accent/[0.035] px-3 py-2.5 text-center text-xs leading-5 text-text-tertiary md:mx-3",
  overviewOuter: "min-w-0",
  overviewText: "mx-auto max-w-3xl min-w-0 break-keep text-start text-[15px] leading-[1.8] text-text-primary md:text-base",
  overviewImage: "@container absolute inset-0 block h-full w-full overflow-hidden rounded-xl",
} as const;
