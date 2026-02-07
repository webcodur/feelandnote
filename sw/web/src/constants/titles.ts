import { 
  Target, Sparkles, Star, 
  BookOpen, Library, Layers, Mountain, 
  Feather, Scroll, Pencil, 
  Compass, Map, Globe, 
  Users, UserPlus, Fingerprint, 
  Microscope, Search, ScrollText, AlignLeft, 
  Medal, Flag, Trophy 
} from 'lucide-react';

// #region 등급 설정
export const TITLE_GRADE_CONFIG = {
  common: {
    label: '일반',
    color: 'text-stone-400',
    borderColor: 'border-stone-500/30',
    bgColor: 'bg-stone-500/10',
    marble: 'from-stone-800 to-stone-900',
  },
  uncommon: {
    label: '고급',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    marble: 'from-emerald-900/40 to-stone-900',
  },
  rare: {
    label: '희귀',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    marble: 'from-cyan-900/40 to-stone-900',
  },
  epic: {
    label: '영웅',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    marble: 'from-purple-900/40 to-stone-900',
  },
} as const;
// #endregion

// #region 카테고리 설정
interface TitleCategoryInfo {
  readonly label: string;
  readonly color: string;
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const TITLE_CATEGORY_CONFIG: Record<string, TitleCategoryInfo> = {
  volume: { label: '축적', color: 'text-blue-400', icon: Target },
  diversity: { label: '섭렵', color: 'text-green-400', icon: Sparkles },
  depth: { label: '탐구', color: 'text-orange-400', icon: Star },
} as const;
// #endregion

// #region 아이콘 맵
export const TITLE_ICONS = {
  Target, Sparkles, Star, 
  BookOpen, Library, Layers, Mountain, 
  Feather, Scroll, Pencil, 
  Compass, Map, Globe, 
  Users, UserPlus, Fingerprint, 
  Microscope, Search, ScrollText, AlignLeft, 
  Medal, Flag, Trophy 
} as const;

export type TitleIconName = keyof typeof TITLE_ICONS;
// #endregion

// #region 칭호 정의
export interface TitleDefinition {
  code: string;
  name: string;
  description: string;
  category: 'volume' | 'diversity' | 'depth';
  grade: 'common' | 'uncommon' | 'rare' | 'epic';
  condition: { type: string; value: number };
  icon?: TitleIconName;
}

export const TITLES: TitleDefinition[] = [
  // 축적 - 콘텐츠 수
  { code: 'content_1', name: '첫 발자국', description: '여정의 시작', category: 'volume', grade: 'common', condition: { type: 'content_count', value: 1 }, icon: 'BookOpen' },
  { code: 'content_10', name: '열 걸음', description: '꾸준히 걷는 중', category: 'volume', grade: 'common', condition: { type: 'content_count', value: 10 }, icon: 'Layers' },
  { code: 'content_50', name: '서재의 주인', description: '50권을 넘기다', category: 'volume', grade: 'uncommon', condition: { type: 'content_count', value: 50 }, icon: 'Library' },
  { code: 'content_100', name: '백 권의 무게', description: '서재가 묵직해졌다', category: 'volume', grade: 'rare', condition: { type: 'content_count', value: 100 }, icon: 'Mountain' },
  // 축적 - 기록 수
  { code: 'record_1', name: '첫 번째 이야기', description: '기록의 시작', category: 'volume', grade: 'common', condition: { type: 'record_count', value: 1 }, icon: 'Feather' },
  { code: 'record_10', name: '이야기꾼', description: '10개의 기록', category: 'volume', grade: 'common', condition: { type: 'record_count', value: 10 }, icon: 'Pencil' },
  { code: 'record_50', name: '기록의 달인', description: '50개의 기록', category: 'volume', grade: 'uncommon', condition: { type: 'record_count', value: 50 }, icon: 'Scroll' },
  // 섭렵 - 카테고리 수
  { code: 'category_2', name: '장르 여행자', description: '경계를 넘다', category: 'diversity', grade: 'common', condition: { type: 'category_count', value: 2 }, icon: 'Compass' },
  { code: 'category_3', name: '장르 탐험가', description: '미지의 영역으로', category: 'diversity', grade: 'uncommon', condition: { type: 'category_count', value: 3 }, icon: 'Map' },
  { code: 'category_4', name: '르네상스인', description: '모든 분야의 감상가', category: 'diversity', grade: 'rare', condition: { type: 'category_count', value: 4 }, icon: 'Globe' },
  // 섭렵 - 창작자 수
  { code: 'creator_10', name: '작가 헌터', description: '다양한 목소리', category: 'diversity', grade: 'uncommon', condition: { type: 'creator_count', value: 10 }, icon: 'UserPlus' },
  { code: 'creator_30', name: '세계 일주', description: '국경 없는 감상', category: 'diversity', grade: 'rare', condition: { type: 'creator_count', value: 30 }, icon: 'Fingerprint' },
  // 탐구 - 리뷰 품질
  { code: 'avg_review_100', name: '꼼꼼한 독자', description: '세심한 기록', category: 'depth', grade: 'common', condition: { type: 'avg_review_length', value: 100 }, icon: 'Search' },
  { code: 'avg_review_300', name: '완벽주의자', description: '빈틈없는 기록', category: 'depth', grade: 'uncommon', condition: { type: 'avg_review_length', value: 300 }, icon: 'Microscope' },
  { code: 'long_review_10', name: '리뷰 장인', description: '말이 많은 감상가', category: 'depth', grade: 'rare', condition: { type: 'long_review_count', value: 10 }, icon: 'ScrollText' },
  // 탐구 - 완료 수
  { code: 'completed_10', name: '구획 마스터', description: '처음부터 끝까지', category: 'depth', grade: 'uncommon', condition: { type: 'completed_count', value: 10 }, icon: 'Flag' },
  { code: 'completed_50', name: '아카이브 장인', description: '기록의 달인', category: 'depth', grade: 'epic', condition: { type: 'completed_count', value: 50 }, icon: 'Medal' },
];
// #endregion

export type TitleGrade = keyof typeof TITLE_GRADE_CONFIG;
export type TitleCategory = keyof typeof TITLE_CATEGORY_CONFIG;

// 칭호 코드로 정보 조회
export function getTitleInfo(code: string | null): { name: string; grade: string } | null {
  if (!code) return null;
  const title = TITLES.find(t => t.code === code);
  return title ? { name: title.name, grade: title.grade } : null;
}
