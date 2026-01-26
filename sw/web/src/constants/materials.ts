/*
  오라 시스템 - 단일 원천 (Single Source of Truth)

  9단계 오라 (1이 최하, 9가 최상) - 내부 코드용, UI 노출 X

  | 오라 | 칭호 | 재질 | 컬러 | 구분 포인트 |
  |------|------|------|------|-------------|
  | 1 | 필멸자 | 목판 | Brown | 유일한 유기물, 가장 낮은 가치 |
  | 2 | 순례자 | 석판 | Dark Grey | 무겁고 탁한 회색 (무광) |
  | 3 | 수사 | 동 | Bronze/Orange | 금속광택의 시작, 따뜻한 구리색 |
  | 4 | 전도사 | 은 | Silver/White | 밝고 매끄러운 금속광 |
  | 5 | 사제 | 금 | Gold/Yellow | 누구나 아는 '은보다 위'의 상징 |
  | 6 | 신관 | 에메랄드 | Green | 금속을 벗어난 '보석' 단계의 시작 |
  | 7 | 선지자 | 크림슨레드 | Deep Red | 보석 중 가장 강렬하고 위엄 있는 색 |
  | 8 | 사도 | 다이아 | Cyan/Ice | 투명하고 차가운, 범접할 수 없는 광채 |
  | 9 | 불멸자 | 홀로그래픽 | Rainbow | 모든 색을 품은 초월적 빛의 효과 |

  컴포넌트 용도:
  - 셀럽: 액자(Frame), 카드(Card), 뱃지(Badge)
  - 노멀: 명판(Nameplate)
*/

import type { CardVariant } from "@/components/features/home/neo-celeb-card/types";

// #region 타입 정의
// 9개 재질
export type MaterialKey =
  | "wood"        // 1등급 - 목판
  | "stone"       // 2등급 - 석판
  | "bronze"      // 3등급 - 동
  | "silver"      // 4등급 - 은
  | "gold"        // 5등급 - 금
  | "emerald"     // 6등급 - 에메랄드
  | "crimson"     // 7등급 - 크림슨레드
  | "diamond"     // 8등급 - 다이아
  | "holographic" // 9등급 - 홀로그래픽
;

// 오라 (1~9, 높을수록 상위) - 내부 코드용, UI 노출 X
export type Aura = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 오라 칭호 (직업)
export type AuraTitle =
  | "MORTAL"      // 필멸자 (1)
  | "PILGRIM"     // 순례자 (2)
  | "MONK"        // 수사 (3)
  | "EVANGELIST"  // 전도사 (4)
  | "PRIEST"      // 사제 (5)
  | "ARCHON"      // 신관 (6)
  | "PROPHET"     // 선지자 (7)
  | "APOSTLE"     // 사도 (8)
  | "IMMORTAL"    // 불멸자 (9)
;

// 하위 호환용 (deprecated)
export type Level = 1 | 2 | 3 | 4 | 5;
export type CelebLevel = "COSMIC" | "TITAN" | "GIGANTIC" | "SAGE" | "HERO";
export type NormalLevel = "PROPHET" | "PRIEST" | "PILGRIM" | "NOVICE" | "MORTAL";

export interface MaterialConfig {
  key: MaterialKey;
  label: string;
  koreanLabel: string;

  // 오라 시스템
  aura: Aura;
  auraTitle: AuraTitle;
  auraTitleKo: string;
  romanNumeral: string;

  // 색상 (카드 기준)
  colors: {
    primary: string;
    secondary: string;
    light: string;
    dark: string;
    border: string;
    text: string;
    textOnSurface: string;
  };

  // 그라데이션 (카드 surface 기준)
  gradient: {
    surface: string;
    border: string;
    simple: string;
  };

  // 그림자
  shadow: {
    base: string;
    hover: string;
    glow: string;
  };

  // 텍스처 URL (있는 경우)
  textureUrl?: string;

  // LP 효과 (금속 계열만 해당)
  lp?: {
    gradient: string;
    duration?: string;
    blendMode?: string;
  };

  // 카드 variant 매핑
  cardVariant: CardVariant;

  // 하위 호환용 (deprecated)
  level: Level;
  celebLevel: CelebLevel;
  normalLevel: NormalLevel;
}
// #endregion

// #region 재질 설정 (9등급제)
export const MATERIALS: Record<MaterialKey, MaterialConfig> = {
  // 1등급 - 필멸자 (목판)
  wood: {
    key: "wood",
    label: "Wood",
    koreanLabel: "목판",
    aura: 1,
    auraTitle: "MORTAL",
    auraTitleKo: "필멸자",
    romanNumeral: "I",
    colors: {
      primary: "#5d4037",
      secondary: "#3e2723",
      light: "#8d6e63",
      dark: "#2d1f1a",
      border: "#8d6e63",
      text: "#3e2723",
      textOnSurface: "#efebe9",
    },
    gradient: {
      surface: "linear-gradient(135deg, #3e2723 0%, #5d4037 40%, #4e342e 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #3e2723 0%, #8d6e63 25%, #5d4037 50%, #a1887f 75%, #3e2723 100%)",
      simple: "linear-gradient(135deg, #8d6e63 0%, #5d4037 40%, #3e2723 100%)",
    },
    shadow: {
      base: "0 10px 20px rgba(62, 39, 35, 0.5)",
      hover: "0 0 25px rgba(141, 110, 99, 0.4), 0 0 40px rgba(93, 64, 55, 0.3)",
      glow: "drop-shadow(0 0 8px rgba(141, 110, 99, 0.4))",
    },
    textureUrl: "https://www.transparenttextures.com/patterns/wood-pattern.png",
    cardVariant: "novice",
    level: 1,
    celebLevel: "HERO",
    normalLevel: "MORTAL",
  },

  // 2등급 - 순례자 (석판)
  stone: {
    key: "stone",
    label: "Stone",
    koreanLabel: "석판",
    aura: 2,
    auraTitle: "PILGRIM",
    auraTitleKo: "순례자",
    romanNumeral: "II",
    colors: {
      primary: "#4a4a4a",
      secondary: "#2d2d2d",
      light: "#6b6b6b",
      dark: "#1a1a1a",
      border: "#5a5a5a",
      text: "#1a1a1a",
      textOnSurface: "#e0e0e0",
    },
    gradient: {
      surface: "linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 40%, #4a4a4a 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #2d2d2d 0%, #5a5a5a 25%, #4a4a4a 50%, #6b6b6b 75%, #2d2d2d 100%)",
      simple: "linear-gradient(135deg, #5a5a5a 0%, #4a4a4a 40%, #2d2d2d 100%)",
    },
    shadow: {
      base: "0 8px 16px rgba(45, 45, 45, 0.5)",
      hover: "0 0 20px rgba(90, 90, 90, 0.3), 0 0 30px rgba(74, 74, 74, 0.2)",
      glow: "drop-shadow(0 0 8px rgba(90, 90, 90, 0.4))",
    },
    textureUrl: "https://www.transparenttextures.com/patterns/dust.png",
    cardVariant: "stone",
    level: 2,
    celebLevel: "SAGE",
    normalLevel: "NOVICE",
  },

  // 3등급 - 수사 (동)
  bronze: {
    key: "bronze",
    label: "Bronze",
    koreanLabel: "동",
    aura: 3,
    auraTitle: "MONK",
    auraTitleKo: "수사",
    romanNumeral: "III",
    colors: {
      primary: "#CD7F32",
      secondary: "#8B5A2B",
      light: "#E6A55A",
      dark: "#5C4033",
      border: "#B87333",
      text: "#3E2723",
      textOnSurface: "#FFF8F0",
    },
    gradient: {
      surface: "radial-gradient(ellipse farthest-corner at right bottom, #E6A55A 0%, #CD7F32 8%, #A0522D 30%, #8B5A2B 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #FFF8F0 0%, #E6A55A 8%, #CD7F32 25%, #8B5A2B 62.5%, #5C4033 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #8B5A2B 0%, #CD7F32 25%, #E6A55A 50%, #CD7F32 75%, #8B5A2B 100%)",
      simple: "linear-gradient(135deg, #E6A55A 0%, #CD7F32 40%, #8B5A2B 100%)",
    },
    shadow: {
      base: "0 8px 20px rgba(205, 127, 50, 0.3)",
      hover: "0 0 30px rgba(205, 127, 50, 0.5), 0 0 50px rgba(205, 127, 50, 0.3)",
      glow: "drop-shadow(0 0 10px rgba(205, 127, 50, 0.5))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(205, 127, 50, 0.7) 20%, transparent 40%)",
    },
    cardVariant: "bronze",
    level: 3,
    celebLevel: "GIGANTIC",
    normalLevel: "PILGRIM",
  },

  // 4등급 - 전도사 (은)
  silver: {
    key: "silver",
    label: "Silver",
    koreanLabel: "은",
    aura: 4,
    auraTitle: "EVANGELIST",
    auraTitleKo: "전도사",
    romanNumeral: "IV",
    colors: {
      primary: "#C0C0C0",
      secondary: "#808080",
      light: "#F7F7F7",
      dark: "#606060",
      border: "#A0A0A0",
      text: "#404040",
      textOnSurface: "#FFFFFF",
    },
    gradient: {
      surface: "radial-gradient(ellipse farthest-corner at right bottom, #F7F7F7 0%, #E0E0E0 8%, #B0B0B0 30%, #909090 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #FFFFFF 0%, #FAFAFA 8%, #E8E8E8 25%, #A0A0A0 62.5%, #808080 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #808080 0%, #C0C0C0 25%, #FFFFFF 50%, #C0C0C0 75%, #808080 100%)",
      simple: "linear-gradient(135deg, #FFFFFF 0%, #C0C0C0 40%, #808080 100%)",
    },
    shadow: {
      base: "0 8px 20px rgba(192, 192, 192, 0.3)",
      hover: "0 0 30px rgba(192, 192, 192, 0.5), 0 0 60px rgba(192, 192, 192, 0.3)",
      glow: "drop-shadow(0 0 12px rgba(192, 192, 192, 0.5))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255, 255, 255, 0.8) 20%, transparent 40%)",
    },
    cardVariant: "silver",
    level: 4,
    celebLevel: "TITAN",
    normalLevel: "PRIEST",
  },

  // 5등급 - 사제 (금)
  gold: {
    key: "gold",
    label: "Gold",
    koreanLabel: "금",
    aura: 5,
    auraTitle: "PRIEST",
    auraTitleKo: "사제",
    romanNumeral: "V",
    colors: {
      primary: "#D4AF37",
      secondary: "#5d4a1f",
      light: "#FCF6BA",
      dark: "#8A6E2F",
      border: "#BF953F",
      text: "#5d4a1f",
      textOnSurface: "#FFFEF0",
    },
    gradient: {
      surface: "radial-gradient(ellipse farthest-corner at right bottom, #FEDB37 0%, #FDB931 8%, #9f7928 30%, #8A6E2F 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #FFFFFF 0%, #FFFFAC 8%, #D1B464 25%, #5d4a1f 62.5%, #5d4a1f 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #AA771C 0%, #BF953F 20%, #FCF6BA 40%, #B38728 60%, #FBF5B7 80%, #AA771C 100%)",
      simple: "linear-gradient(135deg, #FCF6BA 0%, #D4AF37 40%, #8A6E2F 100%)",
    },
    shadow: {
      base: "0 8px 20px rgba(212, 175, 55, 0.3)",
      hover: "0 0 30px rgba(212, 175, 55, 0.5), 0 0 60px rgba(212, 175, 55, 0.3)",
      glow: "drop-shadow(0 0 15px rgba(212, 175, 55, 0.6))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255, 215, 0, 0.7) 20%, transparent 40%)",
    },
    cardVariant: "gold",
    level: 5,
    celebLevel: "COSMIC",
    normalLevel: "PROPHET",
  },

  // 6등급 - 신관 (에메랄드)
  emerald: {
    key: "emerald",
    label: "Emerald",
    koreanLabel: "에메랄드",
    aura: 6,
    auraTitle: "ARCHON",
    auraTitleKo: "신관",
    romanNumeral: "VI",
    colors: {
      primary: "#006400",
      secondary: "#004d00",
      light: "#2E8B57",
      dark: "#002a00",
      border: "#004d00",
      text: "#F0FFF0",
      textOnSurface: "#E8F5E9",
    },
    gradient: {
      surface: "radial-gradient(ellipse farthest-corner at right bottom, #2E8B57 0%, #006400 30%, #004d00 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #50C878 0%, #2E8B57 25%, #006400 62.5%, #002a00 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #004d00 0%, #2E8B57 25%, #50C878 50%, #2E8B57 75%, #004d00 100%)",
      simple: "linear-gradient(135deg, #2E8B57 0%, #006400 40%, #002a00 100%)",
    },
    shadow: {
      base: "0 8px 20px rgba(0, 50, 0, 0.5)",
      hover: "0 0 30px rgba(0, 100, 0, 0.6), 0 0 60px rgba(0, 80, 0, 0.4)",
      glow: "drop-shadow(0 0 15px rgba(0, 100, 0, 0.7))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(80, 200, 120, 0.7) 20%, transparent 40%)",
    },
    cardVariant: "emerald",
    level: 5,
    celebLevel: "COSMIC",
    normalLevel: "PROPHET",
  },

  // 7등급 - 선지자 (크림슨레드)
  crimson: {
    key: "crimson",
    label: "Crimson",
    koreanLabel: "크림슨",
    aura: 7,
    auraTitle: "PROPHET",
    auraTitleKo: "선지자",
    romanNumeral: "VII",
    colors: {
      primary: "#8B0000",
      secondary: "#4a0000",
      light: "#CD5C5C",
      dark: "#2d0000",
      border: "#B22222",
      text: "#ffd0d0",
      textOnSurface: "#FFF0F0",
    },
    gradient: {
      surface: "radial-gradient(ellipse farthest-corner at right bottom, #CD5C5C 0%, #8B0000 8%, #6B0000 30%, #4a0000 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #FFF0F0 0%, #CD5C5C 8%, #8B0000 25%, #4a0000 62.5%, #2d0000 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #4a0000 0%, #8B0000 25%, #CD5C5C 50%, #8B0000 75%, #4a0000 100%)",
      simple: "linear-gradient(135deg, #CD5C5C 0%, #8B0000 40%, #4a0000 100%)",
    },
    shadow: {
      base: "0 10px 30px rgba(139, 0, 0, 0.5)",
      hover: "0 0 40px rgba(139, 0, 0, 0.6), 0 0 80px rgba(139, 0, 0, 0.4)",
      glow: "drop-shadow(0 0 20px rgba(139, 0, 0, 0.7))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(139, 0, 0, 0.7) 20%, transparent 40%)",
    },
    cardVariant: "crimson",
    level: 5,
    celebLevel: "COSMIC",
    normalLevel: "PROPHET",
  },

  // 8등급 - 사도 (다이아)
  diamond: {
    key: "diamond",
    label: "Diamond",
    koreanLabel: "다이아",
    aura: 8,
    auraTitle: "APOSTLE",
    auraTitleKo: "사도",
    romanNumeral: "VIII",
    colors: {
      primary: "#004e92",
      secondary: "#020024",
      light: "#4fc3f7",
      dark: "#002f6c",
      border: "#1e3a8a",
      text: "#E0F7FA",
      textOnSurface: "#E0F7FA",
    },
    gradient: {
      surface: "linear-gradient(135deg, #004e92 0%, #002f6c 50%, #020024 100%)",
      border: "conic-gradient(from 0deg at 50% 50%, #020024 0%, #004e92 25%, #4fc3f7 50%, #004e92 75%, #020024 100%)",
      simple: "linear-gradient(135deg, #004e92 0%, #002f6c 50%, #020024 100%)",
    },
    shadow: {
      base: "0 10px 40px rgba(0, 78, 146, 0.6)",
      hover: "0 0 50px rgba(0, 78, 146, 0.8), 0 0 100px rgba(2, 0, 36, 0.6)",
      glow: "drop-shadow(0 0 20px rgba(0, 78, 146, 0.8))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(185, 242, 255, 0.8) 20%, transparent 40%)",
    },
    cardVariant: "diamond",
    level: 5,
    celebLevel: "COSMIC",
    normalLevel: "PROPHET",
  },

  // 9등급 - 불멸자 (홀로그래픽)
  holographic: {
    key: "holographic",
    label: "Holographic",
    koreanLabel: "홀로그래픽",
    aura: 9,
    auraTitle: "IMMORTAL",
    auraTitleKo: "불멸자",
    romanNumeral: "IX",
    colors: {
      primary: "#FF00FF",
      secondary: "#00FFFF",
      light: "#FFFFFF",
      dark: "#7B68EE",
      border: "#40E0D0",
      text: "#1a001a",
      textOnSurface: "#FFFFFF",
    },
    gradient: {
      surface: "linear-gradient(125deg, #ff0080, #ff8c00, #40e0d0, #7b68ee, #ff0080)",
      border: "conic-gradient(from 0deg at 50% 50%, #FF0080 0%, #FF8C00 20%, #40E0D0 40%, #7B68EE 60%, #FF0080 80%, #FF0080 100%)",
      simple: "linear-gradient(125deg, #ff0080, #ff8c00, #40e0d0, #7b68ee, #ff0080)",
    },
    shadow: {
      base: "0 10px 50px rgba(255, 0, 128, 0.3), 0 10px 50px rgba(64, 224, 208, 0.3)",
      hover: "0 0 60px rgba(255, 0, 128, 0.5), 0 0 60px rgba(64, 224, 208, 0.5), 0 0 100px rgba(123, 104, 238, 0.4)",
      glow: "drop-shadow(0 0 25px rgba(255, 0, 128, 0.6)) drop-shadow(0 0 25px rgba(64, 224, 208, 0.6))",
    },
    lp: {
      gradient: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255, 0, 128, 0.6) 10%, rgba(64, 224, 208, 0.6) 20%, transparent 30%)",
    },
    cardVariant: "holographic",
    level: 5,
    celebLevel: "COSMIC",
    normalLevel: "PROPHET",
  },
};
// #endregion

// #region 유틸리티

// 재질 순서 (등급순 - 낮은 순 → 높은 순)
export const MATERIAL_ORDER: MaterialKey[] = [
  "wood", "stone", "bronze", "silver", "gold", "emerald", "crimson", "diamond", "holographic"
];

// 재질 순서 (역순 - 높은 순 → 낮은 순)
export const MATERIAL_ORDER_DESC: MaterialKey[] = [
  "holographic", "diamond", "crimson", "emerald", "gold", "silver", "bronze", "stone", "wood"
];

export const getMaterial = (key: MaterialKey): MaterialConfig => MATERIALS[key];

// 오라로 재질 조회
export const getMaterialByAura = (aura: Aura): MaterialConfig => {
  const auraMap: Record<Aura, MaterialKey> = {
    1: "wood",
    2: "stone",
    3: "bronze",
    4: "silver",
    5: "gold",
    6: "emerald",
    7: "crimson",
    8: "diamond",
    9: "holographic",
  };
  return MATERIALS[auraMap[aura]];
};

// 오라 칭호로 재질 조회
export const AURA_TITLE_TO_MATERIAL: Record<AuraTitle, MaterialConfig> = {
  MORTAL: MATERIALS.wood,
  PILGRIM: MATERIALS.stone,
  MONK: MATERIALS.bronze,
  EVANGELIST: MATERIALS.silver,
  PRIEST: MATERIALS.gold,
  ARCHON: MATERIALS.emerald,
  PROPHET: MATERIALS.crimson,
  APOSTLE: MATERIALS.diamond,
  IMMORTAL: MATERIALS.holographic,
};

// 오라 칭호 라벨
export const AURA_TITLE_LABELS: Record<AuraTitle, { en: string; ko: string }> = {
  MORTAL: { en: "MORTAL", ko: "필멸자" },
  PILGRIM: { en: "PILGRIM", ko: "순례자" },
  MONK: { en: "MONK", ko: "수사" },
  EVANGELIST: { en: "EVANGELIST", ko: "전도사" },
  PRIEST: { en: "PRIEST", ko: "사제" },
  ARCHON: { en: "ARCHON", ko: "신관" },
  PROPHET: { en: "PROPHET", ko: "선지자" },
  APOSTLE: { en: "APOSTLE", ko: "사도" },
  IMMORTAL: { en: "IMMORTAL", ko: "불멸자" },
};

// 오라 순서 (낮은 순 → 높은 순)
export const AURA_ORDER: Aura[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 오라 순서 (높은 순 → 낮은 순 - 차트/랭킹 등 상위권 우선 노출 시 사용)
export const AURA_ORDER_DESC: Aura[] = [9, 8, 7, 6, 5, 4, 3, 2, 1];

// 오라 칭호 순서 (낮은 순 → 높은 순)
export const AURA_TITLE_ORDER: AuraTitle[] = [
  "MORTAL", "PILGRIM", "MONK", "EVANGELIST", "PRIEST", "ARCHON", "PROPHET", "APOSTLE", "IMMORTAL"
];

// 하위 호환용 (deprecated) - Grade 별칭
export type Grade = Aura;
export type GradeTitle = AuraTitle;
export const getMaterialByGrade = getMaterialByAura;

// 하위 호환용 (deprecated)
export const getMaterialByLevel = (level: Level): MaterialConfig => {
  const levelMap: Record<Level, MaterialKey> = {
    5: "gold",
    4: "silver",
    3: "bronze",
    2: "stone",
    1: "wood",
  };
  return MATERIALS[levelMap[level]];
};

export const CELEB_LEVEL_TO_MATERIAL: Record<CelebLevel, MaterialConfig> = {
  COSMIC: MATERIALS.gold,
  TITAN: MATERIALS.silver,
  GIGANTIC: MATERIALS.bronze,
  SAGE: MATERIALS.stone,
  HERO: MATERIALS.wood,
};

export const NORMAL_LEVEL_TO_MATERIAL: Record<NormalLevel, MaterialConfig> = {
  PROPHET: MATERIALS.gold,
  PRIEST: MATERIALS.silver,
  PILGRIM: MATERIALS.bronze,
  NOVICE: MATERIALS.stone,
  MORTAL: MATERIALS.wood,
};

export const CELEB_LEVEL_LABELS: Record<CelebLevel, { en: string; ko: string }> = {
  COSMIC: { en: "COSMIC", ko: "코스믹" },
  TITAN: { en: "TITAN", ko: "타이탄" },
  GIGANTIC: { en: "GIGANTIC", ko: "기간틱" },
  SAGE: { en: "SAGE", ko: "세이지" },
  HERO: { en: "HERO", ko: "히어로" },
};

export const NORMAL_LEVEL_LABELS: Record<NormalLevel, { en: string; ko: string }> = {
  PROPHET: { en: "PROPHET", ko: "예언자" },
  PRIEST: { en: "PRIEST", ko: "성직자" },
  PILGRIM: { en: "PILGRIM", ko: "순례자" },
  NOVICE: { en: "NOVICE", ko: "초심자" },
  MORTAL: { en: "MORTAL", ko: "필멸자" },
};
// #endregion

// #region 오라 백분위 임계값 (수능식 등급 컷)
/**
 * 오라 백분위 기준 (수능 등급 컷과 동일)
 * 오라가 높을수록(9에 가까울수록) 상위
 */
export const AURA_PERCENTILES: Record<Aura, { min: number; max: number }> = {
  9: { min: 0, max: 4 },     // 상위 4% 이내
  8: { min: 4, max: 11 },    // 상위 11% 이내
  7: { min: 11, max: 23 },   // 상위 23% 이내
  6: { min: 23, max: 40 },   // 상위 40% 이내
  5: { min: 40, max: 60 },   // 상위 60% 이내
  4: { min: 60, max: 77 },   // 상위 77% 이내
  3: { min: 77, max: 89 },   // 상위 89% 이내
  2: { min: 89, max: 96 },   // 상위 96% 이내
  1: { min: 96, max: 100 },  // 나머지
};

/**
 * percentile(상위 몇 %)로 오라 계산
 * @param percentile 상위 몇 % (0~100)
 */
export function getAuraByPercentile(percentile: number): Aura {
  if (percentile <= 4) return 9;
  if (percentile <= 11) return 8;
  if (percentile <= 23) return 7;
  if (percentile <= 40) return 6;
  if (percentile <= 60) return 5;
  if (percentile <= 77) return 4;
  if (percentile <= 89) return 3;
  if (percentile <= 96) return 2;
  return 1;
}

/**
 * 순위와 전체 수로 percentile 계산
 */
export function calculatePercentile(ranking: number, total: number): number {
  if (total <= 0) return 100;
  return (ranking / total) * 100;
}

/**
 * 순위와 전체 수로 오라 계산
 */
export function getAuraByRanking(ranking: number, total: number): Aura {
  const percentile = calculatePercentile(ranking, total);
  return getAuraByPercentile(percentile);
}

/**
 * 점수(0~100)로 오라 계산 (81~: 9등급, 71~: 8등급 ...)
 * @param score 총점 (0~100)
 */
export function getAuraByScore(score: number): Aura {
  if (score >= 81) return 9;
  if (score >= 71) return 8;
  if (score >= 61) return 7;
  if (score >= 51) return 6;
  if (score >= 41) return 5;
  if (score >= 31) return 4;
  if (score >= 21) return 3;
  if (score >= 11) return 2;
  return 1;
}

/**
 * Aura → MaterialKey 변환
 */
export function getMaterialKeyFromAura(aura: Aura): MaterialKey {
  return getMaterialByAura(aura).key;
}

/**
 * Aura → MaterialConfig 변환
 */
export function getMaterialFromAura(aura: Aura): MaterialConfig {
  return getMaterialByAura(aura);
}

/**
 * Aura → AuraTitle 변환
 */
export function getAuraTitleFromAura(aura: Aura): AuraTitle {
  return getMaterialByAura(aura).auraTitle;
}

/**
 * percentile → MaterialKey 변환 (오라 시스템 SSOT)
 * @param percentile 상위 몇 % (0~100)
 */
export function getMaterialKeyByPercentile(percentile: number): MaterialKey {
  const aura = getAuraByPercentile(percentile);
  return getMaterialKeyFromAura(aura);
}

/**
 * percentile → MaterialConfig 변환 (오라 시스템 SSOT)
 * @param percentile 상위 몇 % (0~100)
 */
export function getMaterialConfigByPercentile(percentile: number): MaterialConfig {
  const aura = getAuraByPercentile(percentile);
  return getMaterialByAura(aura);
}

/**
 * score → MaterialKey 변환
 * @param score 총점 (0~100)
 */
export function getMaterialKeyByScore(score: number): MaterialKey {
  const aura = getAuraByScore(score);
  return getMaterialKeyFromAura(aura);
}

/**
 * score → MaterialConfig 변환
 * @param score 총점 (0~100)
 */
export function getMaterialConfigByScore(score: number): MaterialConfig {
  const aura = getAuraByScore(score);
  return getMaterialByAura(aura);
}

// 하위 호환용 (deprecated) - Grade 별칭
export const getGradeByPercentile = getAuraByPercentile;
export const getGradeByRanking = getAuraByRanking;
export const getMaterialKeyFromGrade = getMaterialKeyFromAura;
export const getMaterialFromGrade = getMaterialFromAura;
export const getGradeTitleFromGrade = getAuraTitleFromAura;

// 하위 호환용 (deprecated)
export const CELEB_LEVEL_PERCENTILES: Record<CelebLevel, number> = {
  COSMIC: 4,
  TITAN: 11,
  GIGANTIC: 23,
  SAGE: 40,
  HERO: 100,
};

export const CELEB_LEVEL_ORDER: CelebLevel[] = [
  "COSMIC", "TITAN", "GIGANTIC", "SAGE", "HERO"
];

export function getCelebLevelByPercentile(percentile: number): CelebLevel {
  if (percentile <= 4) return "COSMIC";
  if (percentile <= 11) return "TITAN";
  if (percentile <= 23) return "GIGANTIC";
  if (percentile <= 40) return "SAGE";
  return "HERO";
}

export function getCelebLevelByRanking(ranking: number, total: number): CelebLevel {
  const percentile = calculatePercentile(ranking, total);
  return getCelebLevelByPercentile(percentile);
}

export function getMaterialFromCelebLevel(level: CelebLevel): MaterialKey {
  return CELEB_LEVEL_TO_MATERIAL[level].key;
}

export function getMaterialConfigFromCelebLevel(level: CelebLevel): MaterialConfig {
  return CELEB_LEVEL_TO_MATERIAL[level];
}
// #endregion
