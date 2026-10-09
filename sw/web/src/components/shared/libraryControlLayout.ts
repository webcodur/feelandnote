/** 감상과 관련 도서 선택기의 공통 폭·버튼·본문 간격. */
export const LIBRARY_CONTROL_LAYOUT = {
  width: "w-full max-w-72 sm:w-fit sm:max-w-full",
  contentGap: "mb-8",
  chip: "h-auto min-h-11 min-w-0 gap-1 px-3 py-2 text-sm",
  secondary: "mx-auto w-full max-w-72",
  secondaryPicker: "sm:w-full sm:max-w-72",
  professionGrid: "mx-auto grid w-full min-w-0 max-w-4xl grid-cols-3 auto-rows-fr gap-2 md:grid-cols-5",
  // 5열 직군 선택기와 3열 읽기 목적 선택기가 같은 칩 폭을 사용한다.
  professionPageWidth: "w-full max-w-4xl md:w-[calc((min(100%,56rem)-2rem)*0.6+1rem)]",
  professionPagePicker: "w-full max-w-none sm:w-full sm:max-w-none",
  professionChip: "h-14 min-h-14 px-2 py-1.5 text-[13px] leading-5 sm:px-3 sm:text-sm",
} as const;
