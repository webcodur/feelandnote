import type { ContentLibraryMode } from "./useContentLibrary";

export interface HeaderActionsProps {
  toggleBatchMode: () => void;
  isBatchMode: boolean;
  togglePinMode: () => void;
  isPinMode: boolean;
}

export interface ContentLibraryProps {
  compact?: boolean;
  maxItems?: number;
  showTabs?: boolean;
  showFilters?: boolean;
  showViewToggle?: boolean;
  showCategories?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  headerActions?: React.ReactNode | ((props: HeaderActionsProps) => React.ReactNode);
  // 공통 컴포넌트 모드
  mode?: ContentLibraryMode;
  targetUserId?: string; // viewer 모드에서 필수
}
