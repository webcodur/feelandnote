/*
  파일명: /components/features/cards/certificateThemes.ts
  기능: 자격증 카드의 분야별 테마 설정
  책임: 자격증 분야에 따른 색상, 아이콘, 패턴 정보를 제공한다.
*/ // ------------------------------

import { Award, Cpu, Zap, Building2, Beaker, BarChart3, Shield, Wrench, Palette, BookOpen, type LucideIcon } from "lucide-react";

// #region 타입
export interface FieldTheme {
  icon: LucideIcon;
  gradient: string;
  pattern: string;
  accent: string;
}
// #endregion

// #region 상수
export const FIELD_THEMES: Record<string, FieldTheme> = {
  정보: {
    icon: Cpu,
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    pattern: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-cyan-400",
  },
  전기: {
    icon: Zap,
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-yellow-400",
  },
  건설: {
    icon: Building2,
    gradient: "from-slate-600 via-zinc-500 to-slate-400",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20.5h18V18H22v-2h18v-2H22v-2h18V8H22V6h18V4H22V2h18V0H20v20.5z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E",
    accent: "text-slate-300",
  },
  화학: {
    icon: Beaker,
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    pattern: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-emerald-400",
  },
  경영: {
    icon: BarChart3,
    gradient: "from-violet-600 via-purple-500 to-fuchsia-500",
    pattern: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Crect x='0' y='0' width='4' height='20'/%3E%3Crect x='8' y='4' width='4' height='16'/%3E%3Crect x='16' y='8' width='4' height='12'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-purple-400",
  },
  보안: {
    icon: Shield,
    gradient: "from-red-600 via-rose-500 to-pink-500",
    pattern: "data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z' fill='%23ffffff' fill-opacity='0.05'/%3E%3C/svg%3E",
    accent: "text-rose-400",
  },
  기계: {
    icon: Wrench,
    gradient: "from-gray-600 via-zinc-500 to-neutral-400",
    pattern: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M0 0h20v20H0V0zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm20 0a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 37a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm10-17h20v20H20V20zm10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'/%3E%3C/g%3E%3C/svg%3E",
    accent: "text-zinc-300",
  },
  문화: {
    icon: Palette,
    gradient: "from-pink-500 via-rose-400 to-orange-400",
    pattern: "data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-pink-400",
  },
  default: {
    icon: Award,
    gradient: "from-indigo-600 via-purple-500 to-pink-500",
    pattern: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M30 30l15-15v30L30 30zm0 0L15 15v30l15-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
    accent: "text-purple-400",
  },
};

export const STATUS_CONFIG = {
  WISH: {
    label: "목표",
    ring: "ring-purple-500/50",
    badge: "bg-purple-500/80",
  },
  EXPERIENCE: {
    label: "학습 중",
    ring: "ring-amber-500/50",
    badge: "bg-amber-500/80",
  },
  COMPLETE: {
    label: "취득",
    ring: "ring-green-500/70",
    badge: "bg-green-500/80",
  },
  RECOMMEND: {
    label: "추천",
    ring: "ring-pink-500/70",
    badge: "bg-pink-500/80",
  },
};

// 분야 키워드 매핑
const FIELD_KEYWORDS: Record<string, string[]> = {
  정보: ["정보", "컴퓨터", "데이터", "sql"],
  전기: ["전기", "전자"],
  건설: ["건축", "토목", "건설", "조경"],
  화학: ["화학", "위험물"],
  경영: ["경영", "사무", "회계", "품질"],
  보안: ["보안", "정보보호"],
  기계: ["기계", "용접", "설계"],
  문화: ["문화", "역사", "예술"],
};
// #endregion

// #region 유틸
export function getFieldTheme(title: string, series: string): FieldTheme {
  const text = `${title} ${series}`.toLowerCase();

  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return FIELD_THEMES[field];
    }
  }

  return FIELD_THEMES.default;
}

export { BookOpen };
// #endregion
