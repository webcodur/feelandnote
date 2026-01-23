/*
  파일명: /app/reading/types.ts
  기능: 독서 모드 타입 정의
*/ // ------------------------------

// #region 책 정보
export interface ReadingQuote {
  id: string;
  quote: string;
  author: string;
}

export interface SelectedBook {
  id: string;
  title: string;
  author?: string;
  thumbnail?: string;
  publisher?: string;
  publishDate?: string;
  description?: string;
}
// #endregion

// #region 섹션 타입
export type SectionType = "basic" | "character" | "image" | "timeline" | "conceptMap" | "comparison" | "glossary";

export interface SectionPosition {
  x: number;
  y: number;
}

export interface SectionSize {
  width: number;
  height: number;
}

// 인물 성별
export type CharacterGender = "male" | "female" | "unknown";

// 인물 관계
export interface CharacterRelation {
  targetId: string; // 관계 대상 인물 ID
  type: string; // 관계 유형 (부모, 자식, 친구, 적 등)
}

// 인물 정보
export interface CharacterInfo {
  id: string;
  names: string[]; // 여러 이름/별명 지원
  gender: CharacterGender;
  description: string;
  relations: CharacterRelation[]; // 다른 인물과의 관계
  group?: string; // 소속 조직/세력 (예: "조선군", "왜군")
  subgroup?: string; // 세부 조직 (예: "이순신 휘하", "권율 휘하")
  rank?: string; // 직급/계급 (예: "장군", "병사")
}

// 관계 유형 프리셋
export const RELATION_TYPES = [
  "부모", "자식", "형제", "배우자", "연인",
  "친구", "동료", "상사", "부하", "스승", "제자",
  "적", "라이벌", "동맹",
] as const;

// 기본 섹션
export interface BasicSectionData {
  type: "basic";
  content: string;
}

// 인물 섹션
export interface CharacterSectionData {
  type: "character";
  characters: CharacterInfo[];
}

// 이미지 섹션
export interface ImageSectionData {
  type: "image";
  imageUrl: string | null; // base64 또는 blob URL
}

// 타임라인 이벤트
export interface TimelineEvent {
  id: string;
  date: string; // 날짜 또는 시점
  title: string;
  description: string;
  category?: string; // 카테고리 (색상 구분용)
}

// 타임라인 섹션
export interface TimelineSectionData {
  type: "timeline";
  events: TimelineEvent[];
}

// 개념 정보
export interface ConceptInfo {
  id: string;
  name: string;
  description: string;
  parentId: string | null; // 부모 개념 ID (null이면 최상위)
  level: number; // 계층 레벨 (0부터 시작)
}

// 개념 맵 섹션
export interface ConceptMapSectionData {
  type: "conceptMap";
  concepts: ConceptInfo[];
}

// 비교 항목
export interface ComparisonItem {
  id: string;
  name: string;
  criteria: Record<string, string>; // { [기준명]: 값 }
}

// 비교표 섹션
export interface ComparisonSectionData {
  type: "comparison";
  items: ComparisonItem[];
  criteriaOrder: string[]; // 기준 표시 순서
}

// 용어 정보
export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
  page?: string; // 페이지 번호
}

// 용어집 섹션
export interface GlossarySectionData {
  type: "glossary";
  terms: GlossaryTerm[];
}

export type SectionData =
  | BasicSectionData
  | CharacterSectionData
  | ImageSectionData
  | TimelineSectionData
  | ConceptMapSectionData
  | ComparisonSectionData
  | GlossarySectionData;

export interface Section {
  id: string;
  title: string;
  type: SectionType;
  data: SectionData;
  position: SectionPosition;
  size: SectionSize;
  isVisible: boolean;
  createdAt: string;
}
// #endregion

// #region 워크스페이스 데이터
export interface ReadingWorkspaceData {
  sections: Section[];
  selectedBook: SelectedBook | null;
  elapsedTime: number;
  customQuotes: ReadingQuote[];
  lastUpdated: string;
}
// #endregion

// #region 섹션 기본값
export const DEFAULT_SECTION_SIZE: SectionSize = { width: 280, height: 200 };

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  basic: "메모",
  character: "조직",
  image: "이미지",
  timeline: "타임라인",
  conceptMap: "개념 맵",
  comparison: "비교표",
  glossary: "용어집",
};
// #endregion
