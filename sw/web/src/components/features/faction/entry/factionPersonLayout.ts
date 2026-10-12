import sectionSpacing from "@/components/shared/HubSection.module.css";

/** 신화·일반 팩션 인물 모달의 공통 읽기 폭과 간격. */
export const FACTION_PERSON_LAYOUT = {
  modal: "overflow-hidden rounded-2xl border border-white/15 bg-bg-main shadow-2xl",
  article: "px-5 pb-6 pt-12 sm:px-7 md:px-8 md:pb-8 md:pt-8",
  body: `${sectionSpacing.section} ${sectionSpacing.afterDivider} space-y-4 border-t border-line text-start`,
  paragraphs: "space-y-3 break-keep text-[15px] leading-7 text-text-primary md:text-base md:leading-8",
  shelf: `${sectionSpacing.section} ${sectionSpacing.afterDivider} border-t border-line`,
} as const;
