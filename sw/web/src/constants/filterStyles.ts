// 필터 버튼 스타일 (Single Source of Truth)

export const FILTER_BUTTON_STYLES = {
  // PC 필터 버튼
  base: "relative px-4 py-2 text-sm whitespace-nowrap shrink-0 cursor-pointer font-medium tracking-wide",
  active: "text-accent font-bold",
  inactive: "text-text-tertiary/50 hover:text-text-primary",
  disabled: "disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:text-text-tertiary/50",

  // 카운트 텍스트
  countActive: "text-accent/60 ml-1 text-xs font-normal",
  countInactive: "text-text-tertiary/40 ml-1 text-xs font-normal",

  // 컨테이너
  container: "relative flex items-center border-b border-accent/20",

  // 라벨
  label: "text-sm text-accent/80 font-serif font-bold shrink-0 mr-4 tracking-wide",

  // 공유 밑줄 (JS로 제어)
  underline: "absolute bottom-0 h-[2px] bg-accent shadow-[0_0_8px_rgba(212,175,55,0.4)] transition-all duration-300 ease-out",
} as const;

// 모바일 필터 칩 스타일
export const FILTER_CHIP_STYLES = {
  base: "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm whitespace-nowrap shrink-0 transition-all font-medium cursor-pointer",
  active: "bg-accent text-bg-main border-accent shadow-md shadow-accent/20",
  inactive: "bg-transparent text-text-secondary border-accent/30",
} as const;

// 바텀시트 필터 아이템 스타일
export const FILTER_BOTTOMSHEET_STYLES = {
  base: "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-all",
  active: "bg-accent/10 text-accent border-accent/50",
  inactive: "bg-transparent text-text-primary border-transparent hover:bg-white/5",
  disabled: "disabled:opacity-30 disabled:cursor-not-allowed",
} as const;
