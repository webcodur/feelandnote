import { ATLAS_NAV_LAYOUT } from "./atlasNavigationData";
import { EXPLORE_NAV_LAYOUT } from "@/components/shared/exploreNavLayout";

// Keep loading geometry tied to the shell at every breakpoint.
export const MYTH_LAYOUT = {
  shell: "scroll-mt-20 [overflow-anchor:none]",
  container: "mx-auto max-w-[1040px]",
  navigationOuter: "pb-5 md:pb-6",
  selectionPanel: "mx-auto max-w-[1040px]",
  selectionDetails: "grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-4",
  selectionWithoutArtwork: "grid-cols-1 md:grid-cols-1",
  selectionArtwork: "relative order-last aspect-[3/2] min-h-0 min-w-0 md:aspect-auto",
  selectionControls: "flex min-w-0 flex-col justify-center rounded-xl border border-white/20 bg-bg-secondary p-2 md:rounded-2xl md:p-4",
  membersOuter: "min-w-0 px-1 pb-6 md:px-0 md:pb-8",
  // 연대기의 국가 선택기도 쓰는 공통 칩 값.
  navigation: EXPLORE_NAV_LAYOUT.navigation,
  chipNav: EXPLORE_NAV_LAYOUT.chipNav,
  mobilePicker: EXPLORE_NAV_LAYOUT.mobilePicker,
  mobilePickerButton: "flex min-w-0 items-center justify-between gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:border-accent",
  navList: EXPLORE_NAV_LAYOUT.navList,
  regionChipShape: EXPLORE_NAV_LAYOUT.pill,
  memberList: "grid grid-cols-2 items-start gap-x-3 gap-y-6 min-[360px]:grid-cols-3 min-[480px]:grid-cols-4 md:gap-x-4 md:gap-y-7 lg:grid-cols-6",
  notice: "mx-2 mb-1 flex items-start justify-center gap-2 rounded-xl border border-accent/[0.12] bg-accent/[0.035] px-3 py-2.5 text-center text-xs leading-5 text-text-tertiary md:mx-3",
  overviewOuter: "min-w-0 px-4 pb-2 pt-2 md:px-6 md:pb-3",
  overviewImage: "@container absolute inset-0 block h-full w-full overflow-hidden rounded-xl",
  overviewButton: ATLAS_NAV_LAYOUT.action,
} as const;
