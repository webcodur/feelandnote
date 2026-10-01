/*
  파일명: components/features/game/myth/troy/story/types.ts
  기능: 트로이 전쟁 이야기 장면 자료형
  책임: 장마다 싸움 전·중·뒤에 흐르는 대화와 서술의 모양을 정한다. 장 자료(campaign)의 사건이 장면 id로 부른다.
        말하는 사람은 DB 인물 slug이거나 병사 같은 이름 키(speakers.ts), null이면 서술이다.
*/ // ------------------------------

export type StoryLocale = "ko" | "en";

export type LineTone = "calm" | "fierce" | "grief" | "awe" | "cunning";

export interface StoryLine {
  speaker: string | null;
  text: string;
  tone?: LineTone;
}

export interface StoryScene {
  id: string;
  lines: StoryLine[];
}

export interface ChapterStory {
  // 장 이름(예: 깨진 휴전)
  title: string;
  // 출전 한 줄(예: 『일리아스』 3~5권)
  source: string;
  // 장 고르기 화면에 서는 한두 문장
  summary: string;
  // 이기는 조건·지는 조건 한 문장씩
  objective: string;
  loss: string;
  intro: StoryScene;
  // 싸움 중 사건 장면. id는 장 자료가 부른다
  scenes: StoryScene[];
  outro: StoryScene;
  // 호메로스와 다른 길로 이겼을 때(없으면 outro)
  outroAlt?: StoryScene;
  defeat: StoryScene;
}

export type ChapterStoryBook = Record<StoryLocale, ChapterStory>;
