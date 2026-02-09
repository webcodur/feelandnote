/*
  ContentCard 타입 정의

  [필수 prop]
  - contentId: 인원 구성 뱃지 조회에 필수. 모든 사용처에서 반드시 전달해야 함.
*/
import type { ContentType, ContentStatus } from "@/types/database";

export interface ContentCardProps {
  // 필수: 콘텐츠 식별자 (인원 구성 뱃지 조회에 사용)
  contentId: string;

  // 기본 정보
  thumbnail?: string | null;
  title: string;
  creator?: string | null;
  contentType?: ContentType;

  // 네비게이션
  href?: string;
  onClick?: () => void;

  // 레이아웃
  aspectRatio?: "2/3" | "3/4";

  // 선택 모드
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;

  // 우상단 슬롯 (우선순위: topRightNode > deletable > recommendable > saved > addable)
  topRightNode?: React.ReactNode;
  deletable?: boolean;
  onDelete?: (e: React.MouseEvent) => void;
  recommendable?: boolean;
  userContentId?: string;
  saved?: boolean;
  onSavedStatusChange?: (status: ContentStatus) => void;
  onSavedRemove?: () => void;
  addable?: boolean;
  onAdd?: (e: React.MouseEvent) => void;

  // 좌하단 슬롯: 인원 구성 뱃지 (셀럽 | 일반인)
  // celebCount가 전달되면 그 값을 사용, 없으면 contentId 기반 자동 조회
  celebCount?: number;
  userCount?: number;
  onStatsClick?: (e: React.MouseEvent) => void;

  // 우하단 슬롯
  rating?: number | null;
  onRatingClick?: (e: React.MouseEvent) => void;

  // 하단 정보
  showInfo?: boolean;
  showGradient?: boolean;

  // 리뷰 모드
  review?: string | null;
  isSpoiler?: boolean;
  sourceUrl?: string | null;
  showStatusBadge?: boolean;
  ownerNickname?: string;
  headerNode?: React.ReactNode;

  // 스타일
  className?: string;
  heightClass?: string;
  
  // 강제 포스터 모드 (리뷰가 있어도 포스터 형태 유지)
  forcePoster?: boolean;

  // 모바일 레이아웃 (기본값: poster)
  // poster: 세로형 포스터 카드 (작은 썸네일 + 하단 텍스트)
  // review: 가로형 리뷰 카드 (좌측 썸네일 + 우측 텍스트)
  mobileLayout?: "poster" | "review";
}
