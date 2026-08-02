/*
  파일명: /lib/celeb/worldStyle.ts
  기능: 세계별 표현 규칙
  책임: 인물 사진을 감싸는 틀의 종류와 구획 번호 표기 방식을 세계에서 끌어낸다.
        그림 없이 테두리와 글자만으로 되는 차이라 배너와 달리 스크롤 내내 남는다.
*/

/** 사진을 감싸는 틀 */
export type WorldFrame =
  | "wood"    // 동아시아 전근대 — 목판 틀
  | "stone"   // 고대 지중해·근동 — 각진 석재 틀
  | "gilt"    // 르네상스~제정 — 가는 금선 이중 틀
  | "plain";  // 근현대 — 틀 없이 얇은 선만

/** 구획 번호를 어떻게 쓰나 */
export type WorldNumerals = "hanja" | "roman" | "arabic";

/** 좌측 상자·구획 제목의 서체 결. 전근대는 명조, 근현대는 고딕 */
export type WorldTitleFont = "serif" | "sans";

export interface WorldStyle {
  frame: WorldFrame;
  numerals: WorldNumerals;
  titleFont: WorldTitleFont;
}

/* 기기에 깔린 명조를 쓴다 — 내려받는 파일 없음. 기기별 편차가 거슬리면
   구획명·라벨은 전부 열거 가능하므로 서브셋 웹폰트로 통일할 수 있다 */
export const WORLD_SERIF_FONT = '"Noto Serif KR", "Nanum Myeongjo", Batang, "Songti SC", serif';

const HANJA_WORLDS = [
  "three-kingdoms-korea", "goryeo", "joseon",
  "warring-states-china", "han-china", "tang-song", "ming-qing",
  "ancient-japan", "samurai-japan", "edo",
];
const ROMAN_WORLDS = [
  "ancient-greece", "rome", "medieval-europe", "renaissance", "age-of-sail",
  "ancient-near-east", "islamic-golden-age", "medieval-rus",
];
const STONE_WORLDS = [
  "ancient-greece", "rome", "ancient-near-east", "islamic-golden-age",
  "ancient-india", "medieval-europe", "medieval-rus", "steppe", "myth",
];
const GILT_WORLDS = [
  "renaissance", "age-of-sail", "ottoman-persia", "mughal",
  "imperial-russia", "colonial-america", "industrial-europe",
];
/* 고딕(현행 서체)으로 남는 세계 — 근현대와 중립. 나머지는 전부 명조 */
const SANS_WORLDS = [
  "modern-korea", "modern-china", "modern-japan", "modern-india",
  "modern-middle-east", "soviet-east-europe", "modern-america", "modern-west",
  "world-wars", "neutral",
];

export function getWorldStyle(worldId: string): WorldStyle {
  const frame: WorldFrame = HANJA_WORLDS.includes(worldId)
    ? "wood"
    : STONE_WORLDS.includes(worldId)
      ? "stone"
      : GILT_WORLDS.includes(worldId)
        ? "gilt"
        : "plain";

  const numerals: WorldNumerals = HANJA_WORLDS.includes(worldId)
    ? "hanja"
    : ROMAN_WORLDS.includes(worldId)
      ? "roman"
      : "arabic";

  const titleFont: WorldTitleFont = SANS_WORLDS.includes(worldId) ? "sans" : "serif";

  return { frame, numerals, titleFont };
}

const HANJA = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** 구획 번호를 세계에 맞는 글자로 바꾼다. 1부터 시작한다 */
export function formatSectionNumber(index: number, numerals: WorldNumerals): string {
  if (index < 1) return "";
  if (numerals === "hanja") return HANJA[index - 1] ?? String(index);
  if (numerals === "roman") return ROMAN[index - 1] ?? String(index);
  return String(index).padStart(2, "0");
}
