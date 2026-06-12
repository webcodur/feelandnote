/*
  재질 정의 (1~5등급) - 목판·석판·동·은·금
*/

import type { MaterialConfig } from "./types";

// #region 1~5등급 재질
// 1등급 - 필멸자 (목판)
export const wood: MaterialConfig = {
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
};

// 2등급 - 순례자 (석판)
export const stone: MaterialConfig = {
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
};

// 3등급 - 수사 (동)
export const bronze: MaterialConfig = {
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
};

// 4등급 - 전도사 (은)
export const silver: MaterialConfig = {
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
};

// 5등급 - 사제 (금)
export const gold: MaterialConfig = {
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
};
// #endregion
