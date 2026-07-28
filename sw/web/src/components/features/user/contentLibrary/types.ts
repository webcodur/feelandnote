import type { ContentLibraryMode } from "./useContentLibrary";
import type { ViewMode } from "./contentLibraryTypes";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";

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
  defaultViewMode?: ViewMode; // 초기 뷰 모드 (기본: grid)
  defaultPageSize?: number; // 한 번에 보여줄 기록 수 (기본: 10)
  hideControlWrapper?: boolean; // ControlPanel 아코디언 래퍼 숨기고 필터만 직접 노출
  initialContents?: GetUserContentsResponse; // viewer 모드 서버 렌더 초기 데이터
}
