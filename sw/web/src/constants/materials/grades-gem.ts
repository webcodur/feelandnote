/*
  재질 정의 (6~9등급 + 흑요석) - 에메랄드·크림슨·다이아·홀로그래픽·흑요석
*/

import type { MaterialConfig } from "./types";

// #region 6~9등급 재질
// 6등급 - 신관 (에메랄드)
export const emerald: MaterialConfig = {
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
};

// 7등급 - 선지자 (크림슨레드)
export const crimson: MaterialConfig = {
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
};

// 8등급 - 사도 (다이아)
export const diamond: MaterialConfig = {
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
};

// 9등급 - 불멸자 (홀로그래픽)
export const holographic: MaterialConfig = {
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
};
// #endregion

// #region 오라 시스템 외 재질
// 통일 프레임용 - 흑요석 (오라 시스템 외)
export const obsidian: MaterialConfig = {
  key: "obsidian",
  label: "Obsidian",
  koreanLabel: "흑요석",
  aura: 1,
  auraTitle: "MORTAL",
  auraTitleKo: "필멸자",
  romanNumeral: "0",
  colors: {
    primary: "#1a1a1a",
    secondary: "#0d0d0d",
    light: "#2a2a2a",
    dark: "#050505",
    border: "#252525",
    text: "#808080",
    textOnSurface: "#a0a0a0",
  },
  gradient: {
    surface: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #050505 100%)",
    border: "conic-gradient(from 0deg at 50% 50%, #0d0d0d 0%, #2a2a2a 25%, #1a1a1a 50%, #2a2a2a 75%, #0d0d0d 100%)",
    simple: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)",
  },
  shadow: {
    base: "0 6px 12px rgba(0, 0, 0, 0.6)",
    hover: "0 0 15px rgba(40, 40, 40, 0.3), 0 0 25px rgba(20, 20, 20, 0.2)",
    glow: "drop-shadow(0 0 6px rgba(40, 40, 40, 0.3))",
  },
  cardVariant: "novice",
  level: 1,
  celebLevel: "HERO",
  normalLevel: "MORTAL",
};
// #endregion
