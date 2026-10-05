import { EXPLORE_NAV_LAYOUT } from "@/components/shared/exploreNavLayout";
import { CELEB_GRID_LAYOUT } from "@/components/shared/celebGridLayout";

// Keep loading geometry tied to the shell at every breakpoint.
export const MYTH_LAYOUT = {
  shell: "scroll-mt-20 [overflow-anchor:none]",
  container: "w-full min-w-0",
  navigationOuter: "pb-5 md:pb-6",
  selectionPanel: "w-full min-w-0",
  selectionDetails: "grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-4",
  selectionWithoutArtwork: "grid-cols-1 md:grid-cols-1",
  selectionArtwork: "relative order-last aspect-[3/2] min-h-0 min-w-0 md:aspect-auto",
  selectionControls: "flex min-w-0 flex-col justify-center rounded-xl border border-white/20 bg-bg-secondary p-2 md:rounded-2xl md:p-4",
  membersOuter: "min-w-0",
  // 제목 아래 본문 구획(구성원·책장·전체 목록)이 공유하는 구분선 리듬 — 간격은 다음 구획의 mt가 쥔다
  sectionDivider: "mt-8 border-t border-white/5 pt-6 md:mt-12 md:pt-8",
  // 연대기의 국가 선택기도 쓰는 공통 칩 값.
  navigation: EXPLORE_NAV_LAYOUT.navigation,
  chipNav: EXPLORE_NAV_LAYOUT.chipNav,
  mobilePicker: EXPLORE_NAV_LAYOUT.mobilePicker,
  mobilePickerButton: "flex min-w-0 items-center justify-between gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:border-accent",
  navList: EXPLORE_NAV_LAYOUT.navList,
  regionChipShape: EXPLORE_NAV_LAYOUT.pill,
  memberList: `${CELEB_GRID_LAYOUT} items-start gap-y-6 md:gap-y-7`,
  notice: "mx-2 mb-1 flex items-start justify-center gap-2 rounded-xl border border-accent/[0.12] bg-accent/[0.035] px-3 py-2.5 text-center text-xs leading-5 text-text-tertiary md:mx-3",
  overviewOuter: "min-w-0",
  factionShelfOuter: "min-w-0",
  factionShelfContainer: "w-full min-w-0",
  overviewImage: "@container absolute inset-0 block h-full w-full overflow-hidden rounded-xl",
  overviewButton: "inline-flex min-h-10 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-white/20 bg-bg-main px-2 py-2 text-[13px] font-semibold text-text-primary outline-none hover:border-accent hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent md:gap-1.5 md:text-sm",
} as const;
