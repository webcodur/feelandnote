// 시대 에세이
interface HistoryEraEssay {
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

interface ReadingMethod {
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

interface LessonStep {
  title: string;
  contentMarkdown: string;
  exampleId: string | null;
  /** 이미지 URL. "TODO: 설명" 형식이면 플레이스홀더로 표시 */
  imageUrl?: string | null;
  imageAlt?: string;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  /** 이 문제가 속하는 스텝 인덱스 (0-based) */
  stepIndex?: number;
}

export interface LessonSection {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  objectives: string[];
  steps: LessonStep[];
  sheetExamples: SheetExample[];
  imageUrl?: string;
  quiz?: QuizQuestion[];
}

export interface SheetExample {
  id: string;
  label: string;
  abc: string;
  caption?: string;
  playable: boolean;
}

export type ViewType = 'timeline' | 'catalog' | 'comparison' | 'lesson';

// timeline·catalog는 MuseumTimeline이, lesson은 AcademyLessonView가 그린다.
// comparison을 그리는 코드는 없다 — 아래 book/reading 참조.
export const SUB_CATEGORY_VIEW_TYPE: Record<string, ViewType> = {
  "book/typography": "catalog",
  // 미완성. MUSEUM_CATEGORY_IDS·ACADEMY_CATEGORY_IDS 어디에도 reading 서브카테고리가 없어 도달 불가하고,
  // comparison 뷰 구현도 없다. 데이터(BOOK_READING_HISTORY_TIMELINE)는 2개 era만 있다.
  // 살리려면 comparison 뷰 신규 구현 + 메뉴 등록 + 데이터 확충이 필요하다.
  "book/reading": "comparison",
  "book/system": "lesson",
  "music/harmony": "lesson",
  "video/light_and_camera": "lesson",
  "video/composition": "lesson",
  "video/editing": "lesson",
  "video/narrative": "lesson",
  "ai/foundations": "lesson",
  "ai/prompting": "lesson",
  "ai/creation": "lesson",
};

export const ACADEMY_CONTENT_FILTERS = {
  "video/light_and_camera": {
    lessonIds: ["nature_of_light", "three_point_lighting", "camera_anatomy", "exposure_triangle", "color_temperature", "lens_language", "depth_of_field", "lighting_practice"],
  },
  "video/composition": {
    lessonIds: ["frame_basics", "rule_of_thirds", "shot_sizes", "camera_angles", "camera_movement", "leading_lines", "depth_and_layers", "color_in_cinema"],
  },
  "video/editing": {
    lessonIds: ["what_is_editing", "types_of_cuts", "continuity_editing", "montage_theory", "rhythm_and_pacing", "transitions", "sound_editing", "color_grading"],
  },
  "video/narrative": {
    lessonIds: ["three_act_structure", "character_arc", "conflict_design", "dialogue_craft", "genre_and_tone", "subtext", "visual_storytelling", "scene_analysis"],
  },
  "music/harmony": {
    lessonIds: ["sound_and_pitch", "reading_notation", "rhythm_and_meter", "intervals", "major_scale", "minor_scale", "key_signatures", "triads", "seventh_chords", "chord_progressions", "non_chord_tones", "song_analysis"],
  },
  "book/system": {
    lessonIds: ["classification_system", "isbn", "editions", "book_anatomy", "translation", "references", "publishing_ecosystem", "out_of_print"],
  },
  "ai/foundations": {
    lessonIds: ["what_is_ai", "learning_from_data", "neural_network", "tokens_and_embeddings", "transformer_attention", "next_token_prediction", "hallucination", "training_pipeline"],
  },
  "ai/prompting": {
    lessonIds: ["prompt_anatomy", "context_window", "examples_and_format", "stepwise_reasoning", "iteration", "verification", "tools_and_search", "common_failures"],
  },
  "ai/creation": {
    lessonIds: ["generative_media", "diffusion", "voice_and_music", "ai_in_studio", "copyright", "detection", "bias", "human_role"],
  },
} as const;

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

import koBook from './library/ko/book.json';
import koVideo from './library/ko/video.json';
import koMusic from './library/ko/music.json';
import koGame from './library/ko/game.json';
import koMusicHarmony from './library/ko/music-harmony.json';
import koVideoAcademy from './library/ko/video-academy.json';
import koBookAcademy from './library/ko/book-academy.json';
import koAiAcademy from './library/ko/ai-academy.json';

import enBook from './library/en/book.json';
import enVideo from './library/en/video.json';
import enMusic from './library/en/music.json';
import enGame from './library/en/game.json';
import enMusicHarmony from './library/en/music-harmony.json';
import enVideoAcademy from './library/en/video-academy.json';
import enBookAcademy from './library/en/book-academy.json';
import enAiAcademy from './library/en/ai-academy.json';

interface LocaleData {
  book: Record<string, unknown>;
  video: Record<string, unknown>;
  music: Record<string, unknown>;
  game: Record<string, unknown>;
  musicHarmony: Record<string, unknown>;
  videoAcademy: Record<string, unknown>;
  bookAcademy: Record<string, unknown>;
  aiAcademy: Record<string, unknown>;
}

const DATA: Record<string, LocaleData> = {
  ko: { book: koBook, video: koVideo, music: koMusic, game: koGame, musicHarmony: koMusicHarmony, videoAcademy: koVideoAcademy, bookAcademy: koBookAcademy, aiAcademy: koAiAcademy },
  en: { book: enBook, video: enVideo, music: enMusic, game: enGame, musicHarmony: enMusicHarmony, videoAcademy: enVideoAcademy, bookAcademy: enBookAcademy, aiAcademy: enAiAcademy },
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
    videoLessons: d.videoAcademy.VIDEO_ACADEMY_LESSONS as LessonSection[],
    bookLessons: d.bookAcademy.BOOK_ACADEMY_LESSONS as LessonSection[],
    aiLessons: d.aiAcademy.AI_ACADEMY_LESSONS as LessonSection[],
  };
}

// 빌드 캐시: locale당 한 번만 생성
const cache: Record<string, ReturnType<typeof buildTimelines>> = {};

export function getLibraryData(locale: string) {
  if (!cache[locale]) {
    const d = DATA[locale] ?? DATA.ko;
    cache[locale] = buildTimelines(d);
  }
  return cache[locale];
}

// ─── MUSEUM 카테고리 (전시: timeline, catalog) ───

export const MUSEUM_CATEGORY_IDS = [
  {
    id: "book", available: true,
    subCategories: [
      { id: "media" },
      { id: "writing_tool" },
      { id: "typography" },
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

// ─── ACADEMY 카테고리 (교육: comparison, lesson) ───

export const ACADEMY_CATEGORY_IDS = [
  {
    id: "book", available: true,
    courses: [
      { id: "system" },
    ],
  },
  {
    id: "video", available: true,
    courses: [
      { id: "light_and_camera" },
      { id: "composition" },
      { id: "editing" },
      { id: "narrative" },
    ],
  },
  {
    id: "music", available: true,
    courses: [
      { id: "harmony" },
    ],
  },
  {
    id: "ai", available: true,
    courses: [
      { id: "foundations" },
      { id: "prompting" },
      { id: "creation" },
    ],
  },
] as const;

