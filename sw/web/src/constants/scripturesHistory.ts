// 콘텐츠 역사 분류 탭
export interface HistorySubCategory {
  id: string;
  label: string;
  description: string;
}

export interface HistoryCategory {
  id: string;
  label: string;
  description: string;
  available: boolean;
  subCategories?: HistorySubCategory[];
}

export interface HistoryEraEssay {
  title: string;
  author: string;
  contentMarkdown: string;
  readTime: number;
}

// ─── 서체 도감 / 독서법 비교 타입 ────────────────────────

export interface TypographyClass {
  id: string;
  name: string;
  nameEn: string;
  period: string;
  description: string;
  characteristics: string[];
  representatives: string[];
  useCases: string[];
  imageUrl?: string;
  essay?: HistoryEraEssay;
}

export interface ReadingMethod {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  brainRegions: string[];
  memoryEffect: string;
  comprehension: string;
  bestFor: string[];
  speed: 'slow' | 'medium' | 'fast' | 'variable';
  imageUrl?: string;
  essay?: HistoryEraEssay;
}

// ─── 화성학 레슨 타입 ────────────────────────────────────

export interface LessonSection {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  partLabel: string;
  description: string;
  objectives: string[];
  readTime: number;
  contentMarkdown: string;
  sheetExamples: SheetExample[];
  imageUrl?: string;
}

export interface SheetExample {
  id: string;
  label: string;
  abc: string;
  caption?: string;
  playable: boolean;
}

export type ViewType = 'timeline' | 'catalog' | 'comparison' | 'lesson';

export const SUB_CATEGORY_VIEW_TYPE: Record<string, ViewType> = {
  "book/typography": "catalog",
  "book/reading": "comparison",
  "music/harmony": "lesson",
};

export interface HistoryEra {
  id: string;
  name: string;
  period: string;
  media: string;
  description: string;
  contents: string[];
  imageUrl?: string;
  essay?: HistoryEraEssay;
  startYear: number;   // 기원전은 음수 (예: -3000)
  endYear?: number;    // 생략 시 현재까지
}

// ─── locale별 데이터 ─────────────────────────────────────

import koBook from './scriptures/ko/book.json';
import koVideo from './scriptures/ko/video.json';
import koMusic from './scriptures/ko/music.json';
import koGame from './scriptures/ko/game.json';
import koMusicHarmony from './scriptures/ko/music-harmony.json';

import enBook from './scriptures/en/book.json';
import enVideo from './scriptures/en/video.json';
import enMusic from './scriptures/en/music.json';
import enGame from './scriptures/en/game.json';
import enMusicHarmony from './scriptures/en/music-harmony.json';

interface LocaleData {
  book: Record<string, unknown>;
  video: Record<string, unknown>;
  music: Record<string, unknown>;
  game: Record<string, unknown>;
  musicHarmony: Record<string, unknown>;
}

const DATA: Record<string, LocaleData> = {
  ko: { book: koBook, video: koVideo, music: koMusic, game: koGame, musicHarmony: koMusicHarmony },
  en: { book: enBook, video: enVideo, music: enMusic, game: enGame, musicHarmony: enMusicHarmony },
};

function buildTimelines(d: LocaleData) {
  const book = d.book;
  const video = d.video;
  const music = d.music;
  const game = d.game;

  const contentTimeline = book.CONTENT_HISTORY_TIMELINE as HistoryEra[];
  const writingToolTimeline = book.WRITING_TOOL_HISTORY_TIMELINE as HistoryEra[];
  const typoTimeline = book.BOOK_TYPO_HISTORY_TIMELINE as HistoryEra[];
  const readingTimeline = book.BOOK_READING_HISTORY_TIMELINE as HistoryEra[];

  const videoTimeline = video.VIDEO_HISTORY_TIMELINE as HistoryEra[];
  const videoTechTimeline = video.VIDEO_TECH_HISTORY_TIMELINE as HistoryEra[];
  const videoSpaceTimeline = video.VIDEO_SPACE_HISTORY_TIMELINE as HistoryEra[];

  const musicTimeline = music.MUSIC_HISTORY_TIMELINE as HistoryEra[];
  const musicInstTimeline = music.MUSIC_INST_HISTORY_TIMELINE as HistoryEra[];
  const musicExpTimeline = music.MUSIC_EXP_HISTORY_TIMELINE as HistoryEra[];

  const gameTimeline = game.GAME_HISTORY_TIMELINE as HistoryEra[];
  const gameIntfTimeline = game.GAME_INTF_HISTORY_TIMELINE as HistoryEra[];
  const gameGfxTimeline = game.GAME_GFX_HISTORY_TIMELINE as HistoryEra[];

  const timelines: Record<string, HistoryEra[]> = {
    book: contentTimeline,
    "book/media": contentTimeline,
    "book/writing_tool": writingToolTimeline,
    "book/typography": typoTimeline,
    "book/reading": readingTimeline,
    video: videoTimeline,
    "video/media": videoTimeline,
    "video/technique": videoTechTimeline,
    "video/space": videoSpaceTimeline,
    music: musicTimeline,
    "music/media": musicTimeline,
    "music/instrument": musicInstTimeline,
    "music/experience": musicExpTimeline,
    game: gameTimeline,
    "game/platform": gameTimeline,
    "game/interface": gameIntfTimeline,
    "game/graphics": gameGfxTimeline,
  };

  return {
    timelines,
    defaultTimeline: contentTimeline,
    typographyClasses: book.TYPOGRAPHY_CLASSES as TypographyClass[],
    readingMethods: book.READING_METHODS as ReadingMethod[],
    harmonyLessons: d.musicHarmony.MUSIC_HARMONY_LESSONS as LessonSection[],
  };
}

// 빌드 캐시: locale당 한 번만 생성
const cache: Record<string, ReturnType<typeof buildTimelines>> = {};

export function getScripturesData(locale: string) {
  if (!cache[locale]) {
    const d = DATA[locale] ?? DATA.ko;
    cache[locale] = buildTimelines(d);
  }
  return cache[locale];
}

// ─── HISTORY_CATEGORIES 구조 (label/description은 t() 번역용 id 기반) ───

export const HISTORY_CATEGORY_IDS = [
  {
    id: "book", available: true,
    subCategories: [
      { id: "media" },
      { id: "writing_tool" },
      { id: "typography" },
      { id: "reading" },
    ],
  },
  {
    id: "video", available: true,
    subCategories: [
      { id: "media" },
      { id: "technique" },
      { id: "space" },
    ],
  },
  {
    id: "music", available: true,
    subCategories: [
      { id: "media" },
      { id: "instrument" },
      { id: "experience" },
      { id: "harmony" },
    ],
  },
  {
    id: "game", available: true,
    subCategories: [
      { id: "platform" },
      { id: "interface" },
      { id: "graphics" },
    ],
  },
] as const;

// ─── 하위 호환: 기존 개별 export (ko 데이터 기본) ─────────

const _koData = getScripturesData('ko');

export const CONTENT_HISTORY_TIMELINE = _koData.defaultTimeline;
export const HISTORY_TIMELINES = _koData.timelines;
export const TYPOGRAPHY_CLASSES = _koData.typographyClasses;
export const READING_METHODS = _koData.readingMethods;
export const HARMONY_LESSONS = _koData.harmonyLessons;

export const WRITING_TOOL_HISTORY_TIMELINE = koBook.WRITING_TOOL_HISTORY_TIMELINE as HistoryEra[];
export const BOOK_TYPO_HISTORY_TIMELINE = koBook.BOOK_TYPO_HISTORY_TIMELINE as HistoryEra[];
export const BOOK_READING_HISTORY_TIMELINE = koBook.BOOK_READING_HISTORY_TIMELINE as HistoryEra[];
export const VIDEO_HISTORY_TIMELINE = koVideo.VIDEO_HISTORY_TIMELINE as HistoryEra[];
export const VIDEO_TECH_HISTORY_TIMELINE = koVideo.VIDEO_TECH_HISTORY_TIMELINE as HistoryEra[];
export const VIDEO_SPACE_HISTORY_TIMELINE = koVideo.VIDEO_SPACE_HISTORY_TIMELINE as HistoryEra[];
export const MUSIC_HISTORY_TIMELINE = koMusic.MUSIC_HISTORY_TIMELINE as HistoryEra[];
export const MUSIC_INST_HISTORY_TIMELINE = koMusic.MUSIC_INST_HISTORY_TIMELINE as HistoryEra[];
export const MUSIC_EXP_HISTORY_TIMELINE = koMusic.MUSIC_EXP_HISTORY_TIMELINE as HistoryEra[];
export const GAME_HISTORY_TIMELINE = koGame.GAME_HISTORY_TIMELINE as HistoryEra[];
export const GAME_INTF_HISTORY_TIMELINE = koGame.GAME_INTF_HISTORY_TIMELINE as HistoryEra[];
export const GAME_GFX_HISTORY_TIMELINE = koGame.GAME_GFX_HISTORY_TIMELINE as HistoryEra[];
