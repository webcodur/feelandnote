/*
  파일명: components/features/game/myth/troy/story/ch02.ts
  기능: 트로이 전쟁 2장 「깨진 휴전」 이야기 묶음
  책임: 한 파일이 200줄을 넘어 언어별로 나눈 이야기(ch02.ko.ts·ch02.en.ts)를 장 이야기 하나로 묶는다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";
import { CH02_EN } from "./ch02.en";
import { CH02_KO } from "./ch02.ko";

export const CH02: ChapterStoryBook = { ko: CH02_KO, en: CH02_EN };
