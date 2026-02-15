/*
  파일명: /constants/lab.tsx
  기능: Lab 관련 상수 Single Source of Truth
  책임: Lab 탭 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Book, Layers, Frame, Crown, Landmark, LayoutGrid, Waves, Users, type LucideIcon } from "lucide-react";

// 섹션명
export const LAB_SECTION_NAME = "Component Lab";

export interface LabItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  title: string;
  subtitle: string;
}

export const LAB_ITEMS: LabItem[] = [
  {
    value: "content-cards",
    label: "컨텐츠 카드",
    icon: LayoutGrid,
    href: "/lab/content-cards",
    title: "Content Cards",
    subtitle: "프로젝트 내 모든 컨텐츠 카드 컴포넌트 가이드",
  },
  {
    value: "frames",
    label: "기본 프레임",
    icon: Frame,
    href: "/lab/frames",
    title: "Frame System",
    subtitle: "고대 신전 테마 · 실제 재질 기반 액자",
  },
  {
    value: "tab-ui",
    label: "탭 UI",
    icon: Layers,
    href: "/lab/tab-ui",
    title: "Tab UI System",
    subtitle: "통합 디자인 시스템 프리뷰",
  },
  {
    value: "greek-symbols",
    label: "그리스 심볼",
    icon: Landmark,
    href: "/lab/greek-symbols",
    title: "Greek Symbols",
    subtitle: "고대 그리스 테마 SVG 일러스트레이션",
  },
  {
    value: "hero-banner",
    label: "메인 배너",
    icon: Crown,
    href: "/lab/hero-banner",
    title: "Monumental Banner",
    subtitle: "압도적 위엄의 메인 배너 제안 (2종)",
  },
  {
    value: "book-design",
    label: "책 디자인",
    icon: Book,
    href: "/lab/book-design",
    title: "Book Detail Design",
    subtitle: "서적 상세 페이지 UI 실험",
  },
  {
    value: "backgrounds",
    label: "배경 연출",
    icon: Waves,
    href: "/lab/backgrounds",
    title: "Cinematic Backgrounds",
    subtitle: "몰입감을 높이는 배경 연출 라이브러리",
  },
  {
    value: "persona",
    label: "인물카드",
    icon: Users,
    href: "/lab/persona",
    title: "Persona Cards",
    subtitle: "인물 정보 카드 및 벡터 시각화",
  },
];
