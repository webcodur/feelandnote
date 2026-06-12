/*
  파일명: /constants/board.tsx
  기능: 게시판 관련 상수 Single Source of Truth
  책임: 게시판 카테고리, 피드백 관련 정보를 단일 원천으로 관리한다.
*/

import type { FeedbackCategory, FeedbackStatus } from "@/types/database";

// #region 피드백 카테고리
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
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
};
// #endregion
