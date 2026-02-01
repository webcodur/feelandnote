/*
  파일명: /constants/board.tsx
  기능: 게시판 관련 상수 Single Source of Truth
  책임: 게시판 카테고리, 피드백 관련 정보를 단일 원천으로 관리한다.
*/

import { Megaphone, MessageSquare, type LucideIcon } from "lucide-react";
import type { FeedbackCategory, FeedbackStatus } from "@/types/database";

// 섹션명
export const BOARD_SECTION_NAME = "게시판";

// #region 게시판 항목 (메인페이지 프리뷰용)
export interface BoardItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
  description: string;
}

export const BOARD_ITEMS: BoardItem[] = [
  {
    value: "notice",
    label: "공지사항",
    icon: Megaphone,
    href: "/board/notice",
    description: "Feelnnote의 새로운 소식과 업데이트",
  },
  {
    value: "feedback",
    label: "피드백",
    icon: MessageSquare,
    href: "/board/feedback",
    description: "서비스 발전을 위한 여러분의 의견",
  },
];

// 헬퍼: 페이지 타이틀 생성
export const getBoardPageTitle = (itemValue?: string, suffix?: string) => {
  if (!itemValue) return BOARD_SECTION_NAME;
  const item = BOARD_ITEMS.find((i) => i.value === itemValue);
  const base = item ? `${item.label}` : BOARD_SECTION_NAME;
  const withSuffix = suffix ? `${base} ${suffix}` : base;
  return `${withSuffix} | ${BOARD_SECTION_NAME}`;
};
// #endregion

// #region 피드백 카테고리
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  CELEB_REQUEST: "셀럽 요청",
  CONTENT_REPORT: "콘텐츠 제보",
  FEATURE_SUGGESTION: "기능 건의",
};

export const FEEDBACK_CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  CELEB_REQUEST: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  CONTENT_REPORT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FEATURE_SUGGESTION: "bg-green-500/20 text-green-400 border-green-500/30",
};

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "CELEB_REQUEST",
  "CONTENT_REPORT",
  "FEATURE_SUGGESTION",
];
// #endregion

// #region 피드백 상태
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "처리 중",
  COMPLETED: "완료",
  REJECTED: "반려",
};

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
};
// #endregion
