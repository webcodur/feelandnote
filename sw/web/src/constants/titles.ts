import { Target, Sparkles, Zap, Star, Heart, Trophy, Award } from 'lucide-react';

/**
 * 칭호 등급(Grade) 설정
 * Neo-Pantheon 테마의 색상과 스타일을 정의합니다.
 */
export const TITLE_GRADE_CONFIG = {
  common: {
    label: '일반',
    color: 'text-stone-400',
    borderColor: 'border-stone-500/30',
    bgColor: 'bg-stone-500/10',
    glowColor: 'shadow-stone-500/20',
    marble: 'from-stone-800 to-stone-900',
    specialEffect: '',
  },
  uncommon: {
    label: '고급',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    glowColor: 'shadow-emerald-500/20',
    marble: 'from-emerald-900/40 to-stone-900',
    specialEffect: '',
  },
  rare: {
    label: '희귀',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    glowColor: 'shadow-cyan-500/20',
    marble: 'from-cyan-900/40 to-stone-900',
    specialEffect: '',
  },
  epic: {
    label: '영웅',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    glowColor: 'shadow-purple-500/20',
    marble: 'from-purple-900/40 to-stone-900',
    specialEffect: '',
  },
  legendary: {
    label: '전설',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    glowColor: 'shadow-amber-500/40',
    marble: 'from-amber-900/40 to-stone-900',
    specialEffect: 'animate-pulse',
  },
} as const;

interface TitleCategoryInfo {
  readonly label: string;
  readonly color: string;
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
  readonly comingSoon?: boolean;
}

/**
 * 칭호 카테고리(Category) 설정
 */
export const TITLE_CATEGORY_CONFIG: Record<string, TitleCategoryInfo> = {
  volume: {
    label: '양',
    color: 'text-blue-400',
    icon: Target,
  },
  diversity: {
    label: '다양성',
    color: 'text-green-400',
    icon: Sparkles,
  },
  consistency: {
    label: '꾸준함',
    color: 'text-purple-400',
    icon: Zap,
  },
  depth: {
    label: '깊이',
    color: 'text-orange-400',
    icon: Star,
  },
  social: {
    label: '소셜',
    color: 'text-pink-400',
    icon: Heart,
    comingSoon: true,
  },
  special: {
    label: '특별',
    color: 'text-yellow-400',
    icon: Trophy,
  },
  default: {
    label: '기본',
    color: 'text-stone-400',
    icon: Award,
  }
} as const;

export type TitleGrade = keyof typeof TITLE_GRADE_CONFIG;
export type TitleCategory = keyof typeof TITLE_CATEGORY_CONFIG;
