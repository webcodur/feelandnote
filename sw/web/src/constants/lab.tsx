/*
  파일명: /constants/lab.tsx
  기능: Lab 관련 상수 Single Source of Truth
  책임: Lab 탭 메뉴 정보를 단일 원천으로 관리한다.
*/

import { Book, Layers, Frame, Landmark, LayoutGrid, Waves, Users, Zap, Swords, ImageIcon, ShoppingCart, Palette, Globe, type LucideIcon } from "lucide-react";

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
    value: "celeb-worlds",
    label: "인물 세계",
    icon: Globe,
    href: "/lab/celeb-worlds",
    title: "Figure World Banner",
    subtitle: "인물이 살았던 세계 배너 · 배정 점검",
  },
  {
    value: "celeb-themes",
    label: "세계 재질",
    icon: Palette,
    href: "/lab/celeb-themes",
    title: "World Material Study",
    subtitle: "개별 재질 15종 · 세계별 조합 5종 · UI 표면 비교",
  },
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
  {
    value: "electric-border",
    label: "전기 테두리",
    icon: Zap,
    href: "/lab/electric-border",
    title: "Electric Border",
    subtitle: "SVG feTurbulence 기반 전기 테두리 효과",
  },
  {
    value: "clash-arena",
    label: "접전 미니게임",
    icon: Swords,
    href: "/lab/clash-arena",
    title: "Clash Arena Studio",
    subtitle: "접전 미니게임 3종 실시간 테스트",
  },
  {
    value: "image-ui",
    label: "Image UI",
    icon: ImageIcon,
    href: "/lab/image-ui",
    title: "Image UI",
    subtitle: "이미지 기반 UI 요소 실험",
  },
  {
    value: "coupang",
    label: "쿠팡 파트너스",
    icon: ShoppingCart,
    href: "/lab/coupang",
    title: "Coupang Partners",
    subtitle: "쿠팡 파트너스 어필리에이트 링크 관리",
  },
];
