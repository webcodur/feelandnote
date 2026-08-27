/*
  ContentCard 타입 정의

  [필수 prop]
  - contentId: 인원 구성 뱃지 조회에 필수. 모든 사용처에서 반드시 전달해야 함.
*/
import type { ContentType, ContentStatus } from "@/types/database";
import type { ContentMetadata } from "@/types/content";

export interface ContentCardProps {
  /** CSS로 숨긴 반응형 임시 presenter는 인증·통계·표지 보완 요청을 시작하지 않는다. */
  effectsEnabled?: boolean;
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

  // 표지 위 상단 슬롯. 기관 선정 목록의 순위·발표 연도처럼
  // 그 화면에서만 쓰는 표시를 표지 위에 얹을 때 쓴다
  overlayTopLeft?: React.ReactNode;
  overlayTopRight?: React.ReactNode;

  // 좌하단 슬롯: 인원 구성 뱃지 (셀럽 | 일반인)
  // celebCount가 전달되면 그 값을 사용, 없으면 contentId 기반 자동 조회
  celebCount?: number;
  userCount?: number;
  onStatsClick?: (e: React.MouseEvent) => void;

  // 우하단 슬롯: 작품 소개 (기존 별점은 폐기 — 호환용으로만 남김)
  rating?: number | null;
  onRatingClick?: (e: React.MouseEvent) => void;

  // 하단 정보
  showInfo?: boolean;
  showGradient?: boolean;

  // 리뷰 모드
  review?: string | null;
  reviewEn?: string | null;
  /** 현재 locale 번역본이 없어 원문을 대신 표시하는지 여부 */
  reviewIsOriginalLanguage?: boolean;
  reviewPresets?: string[] | null;
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

  /** 내부 모달 z-index (게임 전체화면 등 상위 모달 위에 표시할 때) */
  modalZIndex?: number;

  /** BOOK i18n 필드 — BOOK 타입이면 내부에서 에디션 토글을 자동 생성 */
  titleKo?: string | null;
  titleEn?: string | null;
  creatorEn?: string | null;
  thumbnailEn?: string | null;
  /** 영문판 존재 여부 (false=확인됨 없음, true/undefined=있거나 미확인) */
  hasEnEdition?: boolean | null;

  /** 작품 소개 폴백 — getContentBrief가 비어 있을 때(베스트셀러 ISBN 등) 모달에 바로 띄운다 */
  fallbackDescription?: string | null;
  /** 작품 메타 폴백 — DB UUID가 없는 외부 차트 카드가 이미 가진 정보를 소개 모달에 넘긴다 */
  fallbackMetadata?: ContentMetadata | null;
}
