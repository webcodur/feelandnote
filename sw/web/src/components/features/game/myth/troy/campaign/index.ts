/*
  파일명: components/features/game/myth/troy/campaign/index.ts
  기능: 트로이 전쟁 원정의 장 목록
  책임: 장마다 싸움판 자료와 이야기, 이긴 뒤 남길 이야기 표지(이야기상 죽음·호메로스와 다른 길)를 차례대로 묶는다.
        화면은 이 목록 하나로 장 고르기·잠금·다음 장을 정한다.
*/ // ------------------------------
import type { BattleState, ChapterBattle } from "../engine/battleTypes";
import type { ChapterStoryBook } from "../story/types";
import { CH01 } from "../story/ch01";
import { CH02 } from "../story/ch02";
import { CH03 } from "../story/ch03";
import { CH04 } from "../story/ch04";
import { CH05 } from "../story/ch05";
import { CH06 } from "../story/ch06";
import { CH07 } from "../story/ch07";
import { CH08 } from "../story/ch08";
import { CH09 } from "../story/ch09";
import { CH10 } from "../story/ch10";
import { CH01_BATTLE } from "./ch01";
import { CH02_BATTLE } from "./ch02";
import { CH03_BATTLE } from "./ch03";
import { CH04_BATTLE } from "./ch04";
import { CH05_BATTLE } from "./ch05";
import { CH06_BATTLE } from "./ch06";
import { CH07_BATTLE } from "./ch07";
import { CH08_BATTLE } from "./ch08";
import { CH09_BATTLE } from "./ch09";
import { CH10_BATTLE } from "./ch10";

export interface ChapterEntry {
  id: string;
  no: number;
  battle: ChapterBattle;
  story: ChapterStoryBook;
  // 이긴 판에서 남길 원정 표지(이야기상 죽음·다른 길)
  flagsAfterWin?: (state: BattleState) => string[];
  // 이 표지가 켜져 있으면 intro 대신 scenes의 intro-alt를 튼다
  introAltFlag?: string;
  // 이 표지가 켜져 있으면 outro 대신 outroAlt를 튼다(flagsAfterWin이 켠 표지)
  outroAltFlag?: string;
  // 장 이야기(intro) 뒤에 깔 3D 판의 표지(10장: 아직 닫힌 목마)
  introFlags?: string[];
}

// 쓰러졌으면 이야기대로 죽고, 살아서 이기면 호메로스와 다른 길이다
const fateOf = (slug: string) => (state: BattleState) => (state.fallen.includes(slug) ? [`dead:${slug}`] : [`alt:${slug}-saved`]);

export const CHAPTERS: ChapterEntry[] = [
  { id: "ch01", no: 1, battle: CH01_BATTLE, story: CH01 },
  { id: "ch02", no: 2, battle: CH02_BATTLE, story: CH02 },
  { id: "ch03", no: 3, battle: CH03_BATTLE, story: CH03 },
  { id: "ch04", no: 4, battle: CH04_BATTLE, story: CH04, flagsAfterWin: fateOf("patroclus"), outroAltFlag: "alt:patroclus-saved" },
  { id: "ch05", no: 5, battle: CH05_BATTLE, story: CH05, introAltFlag: "alt:patroclus-saved" },
  { id: "ch06", no: 6, battle: CH06_BATTLE, story: CH06 },
  { id: "ch07", no: 7, battle: CH07_BATTLE, story: CH07 },
  { id: "ch08", no: 8, battle: CH08_BATTLE, story: CH08, flagsAfterWin: fateOf("antilochus"), outroAltFlag: "alt:antilochus-saved" },
  { id: "ch09", no: 9, battle: CH09_BATTLE, story: CH09, flagsAfterWin: () => ["dead:achilles", "dead:ajax-the-great"] },
  { id: "ch10", no: 10, battle: CH10_BATTLE, story: CH10, introFlags: ["horse-closed"] },
];

export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);

export function chapterById(id: string): ChapterEntry | null {
  return CHAPTERS.find((c) => c.id === id) ?? null;
}

export function nextChapter(id: string): ChapterEntry | null {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i >= 0 ? CHAPTERS[i + 1] ?? null : null;
}
