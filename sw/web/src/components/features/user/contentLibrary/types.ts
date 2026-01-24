import type { ContentLibraryMode } from "./useContentLibrary";

export interface ContentLibraryProps {
  compact?: boolean;
  maxItems?: number;
  showCategories?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  // 공통 컴포넌트 모드
  mode?: ContentLibraryMode;
  targetUserId?: string; // viewer 모드에서 필수
  ownerNickname?: string; // 기록 소유자 닉네임
}
