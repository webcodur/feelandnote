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

export const HISTORY_CATEGORIES: HistoryCategory[] = [
  {
    id: "book", label: "책", description: "점토판에서 전자책까지, 기록 매체 5천 년의 연대기", available: true,
    subCategories: [
      { id: "media", label: "매체", description: "점토판에서 전자책까지, 기록 매체 5천 년의 연대기" },
      { id: "writing_tool", label: "필기구", description: "갈대 펜에서 디지털 펜까지, 글자를 새기는 도구의 변천사" },
      { id: "typography", label: "서체", description: "그림 문자에서 디지털 폰트까지, 글꼴 디자인의 진화사" },
      { id: "reading", label: "독서", description: "음독에서 묵독, 하이퍼텍스트까지, 읽기 행위의 변천사" },
    ],
  },
  {
    id: "video", label: "영상", description: "환등기에서 스트리밍까지, 움직이는 빛의 역사", available: true,
    subCategories: [
      { id: "media", label: "매체", description: "환등기에서 스트리밍까지, 상영 매체와 포맷의 발전" },
      { id: "technique", label: "기법·효과", description: "옵티컬 일루전에서 CGI까지, 상상을 현실로 만드는 기술의 진화" },
      { id: "space", label: "공간", description: "단관 극장에서 거실의 스크린까지, 관람 경험의 변화" },
    ]
  },
  {
    id: "music", label: "음악", description: "구전 선율에서 디지털 음원까지, 소리의 기록사", available: true,
    subCategories: [
      { id: "media", label: "매체", description: "구전 선율에서 디지털 음원까지, 소리 저장과 전송의 역사" },
      { id: "instrument", label: "악기", description: "타악기에서 디지털 신시사이저까지, 소리를 만들어내는 도구의 진화" },
      { id: "experience", label: "청취", description: "제의장에서 알고리즘까지, 음악을 듣는 공간과 방식의 변천사" },
    ]
  },
  {
    id: "game", label: "게임", description: "주사위에서 가상현실까지, 놀이의 진화사", available: true,
    subCategories: [
      { id: "platform", label: "플랫폼", description: "보드게임에서 클라우드까지, 게임이 구동되는 환경의 변천사" },
      { id: "interface", label: "인터페이스", description: "주사위에서 VR 컨트롤러까지, 게임을 조작하는 방식의 진화" },
      { id: "graphics", label: "그래픽", description: "텍스트에서 레이트레이싱까지, 게임이 세계를 그려내는 기술의 진화" },
    ]
  },
];

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

export type ViewType = 'timeline' | 'catalog' | 'comparison';

export const SUB_CATEGORY_VIEW_TYPE: Record<string, ViewType> = {
  "book/typography": "catalog",
  "book/reading": "comparison",
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
export const PLACEHOLDER_ERA: HistoryEra = {
  id: "placeholder",
  name: "집필 중",
  period: "현재",
  startYear: 2024,
  media: "준비 중",
  description: "현재 지혜의 서고 큐레이터가 해당 분야의 기록을 정리하고 있습니다.",
  contents: ["집필 중"],
  essay: {
    title: "기록의 조각들을 모으는 중입니다",
    author: "지혜의 서고 큐레이터",
    readTime: 1,
    contentMarkdown: "현재 지혜의 서고 큐레이터가 해당 분야의 역사적 기록과 파편들을 수집하여 일목요연하게 정리하고 있습니다.\n\n조만간 새로운 지혜의 연대기가 공개될 예정이오니, 잠시만 기다려 주시길 바랍니다."
  }
};



// ─── 영상 타임라인 ───────────────────────────────────────

// ─── 음악 타임라인 ───────────────────────────────────────

// ─── 게임 타임라인 ───────────────────────────────────────

// ─── 필기구 타임라인 ───────────────────────────────────────

// ─── 카테고리-데이터 매핑 ─────────────────────────────────

import bookData from './scriptures/book.json';
import videoData from './scriptures/video.json';
import musicData from './scriptures/music.json';
import gameData from './scriptures/game.json';

const CONTENT_HISTORY_TIMELINE = bookData.CONTENT_HISTORY_TIMELINE as HistoryEra[];
const WRITING_TOOL_HISTORY_TIMELINE = bookData.WRITING_TOOL_HISTORY_TIMELINE as HistoryEra[];
const BOOK_TYPO_HISTORY_TIMELINE = bookData.BOOK_TYPO_HISTORY_TIMELINE as HistoryEra[];
const BOOK_READING_HISTORY_TIMELINE = bookData.BOOK_READING_HISTORY_TIMELINE as HistoryEra[];

export const TYPOGRAPHY_CLASSES = (bookData as Record<string, unknown>).TYPOGRAPHY_CLASSES as TypographyClass[];
export const READING_METHODS = (bookData as Record<string, unknown>).READING_METHODS as ReadingMethod[];

const VIDEO_HISTORY_TIMELINE = videoData.VIDEO_HISTORY_TIMELINE as HistoryEra[];
const VIDEO_TECH_HISTORY_TIMELINE = videoData.VIDEO_TECH_HISTORY_TIMELINE as HistoryEra[];
const VIDEO_SPACE_HISTORY_TIMELINE = videoData.VIDEO_SPACE_HISTORY_TIMELINE as HistoryEra[];

const MUSIC_HISTORY_TIMELINE = musicData.MUSIC_HISTORY_TIMELINE as HistoryEra[];
const MUSIC_INST_HISTORY_TIMELINE = musicData.MUSIC_INST_HISTORY_TIMELINE as HistoryEra[];
const MUSIC_EXP_HISTORY_TIMELINE = musicData.MUSIC_EXP_HISTORY_TIMELINE as HistoryEra[];

const GAME_HISTORY_TIMELINE = gameData.GAME_HISTORY_TIMELINE as HistoryEra[];
const GAME_INTF_HISTORY_TIMELINE = gameData.GAME_INTF_HISTORY_TIMELINE as HistoryEra[];
const GAME_GFX_HISTORY_TIMELINE = gameData.GAME_GFX_HISTORY_TIMELINE as HistoryEra[];

export {
  CONTENT_HISTORY_TIMELINE, WRITING_TOOL_HISTORY_TIMELINE, BOOK_TYPO_HISTORY_TIMELINE, BOOK_READING_HISTORY_TIMELINE,
  VIDEO_HISTORY_TIMELINE, VIDEO_TECH_HISTORY_TIMELINE, VIDEO_SPACE_HISTORY_TIMELINE,
  MUSIC_HISTORY_TIMELINE, MUSIC_INST_HISTORY_TIMELINE, MUSIC_EXP_HISTORY_TIMELINE,
  GAME_HISTORY_TIMELINE, GAME_INTF_HISTORY_TIMELINE, GAME_GFX_HISTORY_TIMELINE
};

export const HISTORY_TIMELINES: Record<string, HistoryEra[]> = {
  book: CONTENT_HISTORY_TIMELINE,
  "book/media": CONTENT_HISTORY_TIMELINE,
  "book/writing_tool": WRITING_TOOL_HISTORY_TIMELINE,
  "book/typography": BOOK_TYPO_HISTORY_TIMELINE,
  "book/reading": BOOK_READING_HISTORY_TIMELINE,

  video: VIDEO_HISTORY_TIMELINE,
  "video/media": VIDEO_HISTORY_TIMELINE,
  "video/technique": VIDEO_TECH_HISTORY_TIMELINE,
  "video/space": VIDEO_SPACE_HISTORY_TIMELINE,

  music: MUSIC_HISTORY_TIMELINE,
  "music/media": MUSIC_HISTORY_TIMELINE,
  "music/instrument": MUSIC_INST_HISTORY_TIMELINE,
  "music/experience": MUSIC_EXP_HISTORY_TIMELINE,

  game: GAME_HISTORY_TIMELINE,
  "game/platform": GAME_HISTORY_TIMELINE,
  "game/interface": GAME_INTF_HISTORY_TIMELINE,
  "game/graphics": GAME_GFX_HISTORY_TIMELINE,
};
