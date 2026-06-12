/*
  파일명: /components/features/user/explore/personaAxis.ts
  기능: persona 축 공유 상수
  책임: 4그룹 탭 구성 + 축별 고유 컬러 + 축별 단축 라벨 단일원천.
*/ // ------------------------------

export const GROUPS = [
  { keys: ["temperance", "diligence", "reflection", "courage"], ko: "내적 덕목", en: "Inner Virtues" },
  { keys: ["loyalty", "benevolence", "fairness", "humility"], ko: "외적 덕목", en: "Outer Virtues" },
  { keys: ["command", "martial", "intellect", "charm"], ko: "능력", en: "Abilities" },
  { keys: ["pessimism_optimism", "conservative_progressive", "individual_social", "cautious_bold"], ko: "성향", en: "Dispositions" },
] as const;

/** 축별 고유 컬러 */
export const AXIS_COLORS: Record<string, string> = {
  // 내면 덕목
  temperance: "#7eb8da",
  diligence: "#e8a838",
  reflection: "#a78bfa",
  courage: "#ef5350",
  // 외면 덕목
  loyalty: "#f06292",
  benevolence: "#66bb6a",
  fairness: "#4fc3f7",
  humility: "#b0bec5",
  // 능력
  command: "#ff7043",
  martial: "#d32f2f",
  intellect: "#42a5f5",
  charm: "#ec407a",
  // 성향 (양극단)
  pessimism_optimism: "#fdd835",
  conservative_progressive: "#26c6da",
  individual_social: "#ab47bc",
  cautious_bold: "#ff9800",
};

/** 축별 단축 라벨 (Paragon 등 수식어 생략) */
export const AXIS_SHORT_LABELS: Record<string, { ko: string; en: string }> = {
  // 내면 덕목
  temperance: { ko: "절제", en: "Temperance" },
  diligence: { ko: "근면", en: "Diligence" },
  reflection: { ko: "성찰", en: "Reflection" },
  courage: { ko: "용기", en: "Courage" },
  // 외면 덕목
  loyalty: { ko: "충의", en: "Loyalty" },
  benevolence: { ko: "자비", en: "Benevolence" },
  fairness: { ko: "공정", en: "Fairness" },
  humility: { ko: "겸양", en: "Humility" },
  // 능력
  command: { ko: "통솔", en: "Command" },
  martial: { ko: "무력", en: "Martial" },
  intellect: { ko: "지략", en: "Intellect" },
  charm: { ko: "매력", en: "Charm" },
};
