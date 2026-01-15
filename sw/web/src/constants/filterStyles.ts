// 필터 버튼 스타일 (Single Source of Truth)

export const FILTER_BUTTON_STYLES = {
  // PC 필터 버튼
  base: "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
  active: "bg-accent text-white",
  inactive: "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary",
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed",

  // 카운트 텍스트
  countActive: "text-white/80",
  countInactive: "text-text-tertiary",

  // 컨테이너
  container: "flex items-center gap-1.5",

  // 라벨
  label: "text-xs text-text-tertiary shrink-0 w-8",
} as const;

// 모바일 필터 칩 스타일
export const FILTER_CHIP_STYLES = {
  base: "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
  active: "bg-accent text-white",
  inactive: "bg-white/10 text-text-secondary",
} as const;

// 바텀시트 필터 아이템 스타일
export const FILTER_BOTTOMSHEET_STYLES = {
  base: "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
  active: "bg-accent/10 text-accent",
  inactive: "bg-white/5 text-text-primary hover:bg-white/10",
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
} as const;
