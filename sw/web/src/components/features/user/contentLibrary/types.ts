import type { ContentLibraryMode } from "./useContentLibrary";
import type { ContentOwnerKind, ViewMode } from "./contentLibraryTypes";
import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";

export interface ContentLibraryProps {
  compact?: boolean;
  maxItems?: number;
  showCategories?: boolean;
  showPagination?: boolean;
  emptyMessage?: string;
  // 공통 컴포넌트 모드
  mode?: ContentLibraryMode;
  ownerKind?: ContentOwnerKind; // 서가 임자 종류 (기본: member). 인물 서가는 'celeb'
  targetUserId?: string; // viewer 모드에서 필수
  ownerNickname?: string; // 기록 소유자 닉네임
  ownerAvatarUrl?: string | null; // 기록 소유자 얼굴 사진
  defaultViewMode?: ViewMode; // 초기 뷰 모드 (기본: list)
  desktopViewMode?: ViewMode; // 넓은 화면(768px 이상)에서의 기본 보기
  defaultPageSize?: number; // 한 번에 보여줄 기록 수 (기본: 10)
  hideControlWrapper?: boolean; // ControlPanel 아코디언 래퍼 숨기고 필터만 직접 노출
  hideReviewFilter?: boolean; // 리뷰 유무 필터 숨김. 셀럽 서가는 리뷰가 항상 있다
  initialContents?: GetUserContentsResponse; // viewer 모드 서버 렌더 초기 데이터
  /** 펼침 첫 카드가 skeleton 없이 완성된 높이로 시작하도록 서버가 준비한 한 건. */
  initialContentBrief?: ContentBrief | null;
}
