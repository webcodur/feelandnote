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
  base: "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm whitespace-nowrap shrink-0 transition-colors duration-100 font-medium cursor-pointer",
  active: "bg-accent text-bg-main border-accent shadow-md shadow-accent/20",
  inactive: "bg-white/5 text-text-primary border-accent/40 hover:border-accent/60 hover:bg-white/10",
} as const;

// 바텀시트/모달 필터 아이템 스타일
export const FILTER_BOTTOMSHEET_STYLES = {
  base: "w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-colors duration-100",
  active: "bg-accent/10 text-accent border-accent/50",
  inactive: "bg-transparent text-text-primary border-transparent hover:bg-white/5",
  disabled: "disabled:opacity-30 disabled:cursor-not-allowed",
} as const;

// PC 드롭다운 스타일
export const FILTER_DROPDOWN_STYLES = {
  // 드롭다운 컨테이너
  container: "absolute top-full left-0 mt-1 min-w-[160px] max-h-[320px] overflow-y-auto bg-bg-card border border-accent/30 rounded-lg shadow-xl z-50",
  // 드롭다운 아이템
  item: {
    base: "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors duration-100",
    active: "bg-accent/10 text-accent font-medium",
    inactive: "text-text-primary hover:bg-white/5",
    disabled: "opacity-30 cursor-not-allowed",
  },
} as const;
