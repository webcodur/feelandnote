/*
  파일명: /components/ui/cards/ContentCard.tsx
  기능: 통합 콘텐츠 카드
  책임: 단일 슬롯 시스템으로 모든 콘텐츠 카드 렌더링 담당

  슬롯 레이아웃:
    좌상단 - [카테고리 레이블] (항상 표시)
    좌하단 - [인물 구성 숫자 뱃지]
    우상단 - [삭제] OR [선물(추천)] OR [북마크(보유)] OR [북마크(추가)]
    우하단 - [별점]
    중앙   - [선택 체크 오버레이] (선택 모드 시)
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award, Star, Users, Check, Bookmark, Gift, ExternalLink, Crown, User, Loader2, Trash2 } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import useDragScroll from "@/hooks/useDragScroll";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import FormattedText from "@/components/ui/FormattedText";
import { getCelebsForContent } from "@/actions/scriptures";
import { getCelebCountsForContents } from "@/actions/contents/getCelebCounts";
import type { ContentType, ContentStatus } from "@/types/database";
import { RecommendationModal } from "@/components/features/recommendations";

// #region 셀럽 카운트 배치 조회
let celebCountQueue: string[] = [];
let celebCountResolvers = new Map<string, (count: number) => void>();
let celebCountTimer: ReturnType<typeof setTimeout> | null = null;

function requestCelebCount(contentId: string): Promise<number> {
  return new Promise(resolve => {
    celebCountQueue.push(contentId);
    celebCountResolvers.set(contentId, resolve);

    if (!celebCountTimer) {
      celebCountTimer = setTimeout(async () => {
        const ids = [...new Set(celebCountQueue)];
        const resolvers = new Map(celebCountResolvers);
        celebCountQueue = [];
        celebCountResolvers = new Map();
        celebCountTimer = null;

        try {
          const counts = await getCelebCountsForContents(ids);
          for (const [id, resolver] of resolvers) {
            resolver(counts[id] ?? 0);
          }
        } catch {
          for (const resolver of resolvers.values()) resolver(0);
        }
      }, 100);
    }
  });
}
// #endregion

// #region 타입
export interface ContentCardProps {
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

  // 좌상단: 카테고리 레이블 (자동)
  // 선택 모드: 포스터 중앙 오버레이
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
  addable?: boolean;
  onAdd?: (e: React.MouseEvent) => void;

  // 좌하단 슬롯
  celebCount?: number;
  userCount?: number;
  onStatsClick?: (e: React.MouseEvent) => void;

  // 우하단 슬롯
  rating?: number | null;

  // 하단 정보
  showInfo?: boolean;
  showGradient?: boolean;

  // 리뷰 모드 (RecordCard 대체)
  contentId?: string;
  status?: ContentStatus;
  review?: string | null;
  isSpoiler?: boolean;
  sourceUrl?: string | null;
  showStatusBadge?: boolean;
  ownerNickname?: string;
  headerNode?: React.ReactNode;

  // 스타일
  className?: string;
  heightClass?: string;
}
// #endregion

// #region 상수
const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

const STATUS_STYLES: Record<ContentStatus, { label: string; color: string }> = {
  WANT: { label: "관심", color: "text-status-wish" },
  FINISHED: { label: "감상", color: "text-status-completed" },
};

const ASPECT_STYLES = {
  "2/3": "aspect-[2/3]",
  "3/4": "aspect-[3/4]",
};

const TYPE_INFO: { type: ContentType; icon: typeof Book; label: string; desc: string }[] = [
  { type: "BOOK", icon: Book, label: "도서", desc: "책, 만화, 웹소설, 에세이 등" },
  { type: "VIDEO", icon: Film, label: "영상", desc: "영화, 드라마, 다큐멘터리, 애니메이션 등" },
  { type: "GAME", icon: Gamepad2, label: "게임", desc: "비디오 게임, 보드게임, 인디 게임 등" },
  { type: "MUSIC", icon: Music, label: "음악", desc: "앨범, 싱글, 클래식, 팟캐스트 등" },
  { type: "CERTIFICATE", icon: Award, label: "자격증", desc: "공부 중인 자격증이 있다면 등록하여 관리해 보세요" },
];
// #endregion

// #region 서브 컴포넌트
function TypeLabel({ type, onOpen }: { type: ContentType; onOpen: () => void }) {
  const Icon = TYPE_ICONS[type];
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }}
      className="absolute top-1.5 left-1.5 w-7 h-7 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-accent/40 shadow-lg hover:bg-accent hover:border-accent group/type"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Icon size={14} className="text-accent group-hover/type:text-white" strokeWidth={2} />
    </button>
  );
}

function TypeInfoModal({ isOpen, onClose, currentType }: { isOpen: boolean; onClose: () => void; currentType: ContentType }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="콘텐츠 분류" size="sm">
      <ModalBody>
        <div className="space-y-1">
          {TYPE_INFO.map(({ type, icon: Icon, label, desc }) => (
            <div
              key={type}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${type === currentType ? "bg-accent/10 border border-accent/30" : ""}`}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${type === currentType ? "bg-accent/20" : "bg-white/5"}`}>
                <Icon size={16} className={type === currentType ? "text-accent" : "text-text-tertiary"} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${type === currentType ? "text-accent" : "text-text-primary"}`}>{label}</p>
                <p className="text-xs text-text-tertiary">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
    </Modal>
  );
}

function SelectOverlay({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${
        isSelected ? "bg-black/40" : "bg-transparent group-hover:bg-black/20"
      }`}
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isSelected
          ? "bg-accent shadow-[0_0_15px_rgba(212,175,55,0.5)]"
          : "border-2 border-white/60 bg-black/40 group-hover:border-white"
      }`}>
        {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
      </div>
    </div>
  );
}

function RecommendButton({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center backdrop-blur-sm rounded-md shadow-lg bg-black/70 border border-accent/50 hover:bg-accent hover:border-accent group/rec"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Gift size={14} className="text-accent group-hover/rec:text-white" strokeWidth={2} />
    </button>
  );
}

function StatsBadge({
  celebCount,
  userCount,
  onClick,
}: {
  celebCount?: number;
  userCount?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const hasCeleb = celebCount !== undefined && celebCount > 0;
  const hasUser = userCount !== undefined && userCount > 0;
  if (!hasCeleb && !hasUser) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  };

  const isClickable = !!onClick;

  const content = (
    <div className={`flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full ${isClickable ? "hover:bg-accent/80 cursor-pointer" : ""}`}>
      <Users size={14} className="text-accent" />
      <span className="text-xs text-text-primary font-medium">
        {hasCeleb && hasUser ? (
          <>
            {celebCount}
            <span className="text-text-tertiary"> | {userCount}</span>
          </>
        ) : hasCeleb ? (
          celebCount
        ) : (
          userCount
        )}
      </span>
    </div>
  );

  return (
    <div
      className="absolute bottom-2 left-2"
      style={{ zIndex: Z_INDEX.cardBadge }}
      onClick={handleClick}
    >
      {content}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <div
      className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Star size={12} className="text-yellow-500 fill-yellow-500" />
      <span className="text-xs text-text-primary font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}
// #endregion

// #region 메인 컴포넌트
export default function ContentCard({
  thumbnail,
  title,
  creator,
  contentType = "BOOK",
  href,
  onClick,
  aspectRatio = "2/3",
  // 선택 모드
  selectable,
  isSelected = false,
  onSelect,
  // 우상단
  topRightNode,
  deletable,
  onDelete,
  recommendable,
  userContentId,
  saved,
  addable,
  onAdd,
  // 좌하단
  celebCount,
  userCount,
  onStatsClick,
  // 우하단
  rating,
  // 하단 정보
  showInfo = true,
  showGradient = true,
  // 리뷰 모드
  contentId,
  status,
  review,
  isSpoiler = false,
  sourceUrl,
  showStatusBadge = true,
  ownerNickname,
  headerNode,
  // 스타일
  className,
  heightClass = "h-[280px]",
}: ContentCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const aspectClass = ASPECT_STYLES[aspectRatio];
  const statusInfo = status ? STATUS_STYLES[status] : null;
  const [showModal, setShowModal] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isTypeInfoOpen, setIsTypeInfoOpen] = useState(false);
  const [fetchedCelebCount, setFetchedCelebCount] = useState<number | undefined>(undefined);

  // 셀럽 카운트 자동 배치 조회
  useEffect(() => {
    if (!contentId) return;
    requestCelebCount(contentId).then(setFetchedCelebCount);
  }, [contentId]);

  // 리뷰 드래그 스크롤
  const {
    containerRef,
    scrollY,
    maxScroll,
    isDragging,
    canScroll,
    onMouseDown,
    onTouchStart,
    scrollStyle,
  } = useDragScroll();

  // 리뷰 모드 여부 (review prop이 있거나 headerNode가 있으면 리뷰 모드)
  const isReviewMode = review !== undefined || headerNode !== undefined;

  // 콘텐츠 상세 페이지 URL
  const contentDetailUrl = contentId
    ? `/content/${contentId}?category=${getCategoryByDbType(contentType)?.id || "book"}`
    : href;

  // 드래그 중 클릭 방지
  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown(e);
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onTouchStart(e);
    e.stopPropagation();
  };

  // 클릭 핸들러 결정
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    if (selectable && onSelect) {
      e.preventDefault();
      onSelect();
      return;
    }
    if (isReviewMode) {
      e.preventDefault();
      setShowModal(true);
      return;
    }
    if (onClick) {
      onClick();
      if (!href) {
        e.preventDefault();
      }
    }
  };

  // 좌상단 슬롯: 카테고리 레이블 (항상 표시)
  const renderTopLeft = () => <TypeLabel type={contentType} onOpen={() => setIsTypeInfoOpen(true)} />;

  // 선택 모드: 포스터 중앙 오버레이
  const renderSelectOverlay = () => {
    if (!selectable) return null;
    return <SelectOverlay isSelected={isSelected} />;
  };

  // 우상단 슬롯 렌더링 (우선순위: topRightNode > deletable > recommendable > saved > addable)
  const renderTopRight = () => {
    if (topRightNode) {
      return (
        <div
          className="absolute top-1.5 right-1.5"
          style={{ zIndex: Z_INDEX.cardBadge }}
          onClick={(e) => e.stopPropagation()}
        >
          {topRightNode}
        </div>
      );
    }
    if (deletable) {
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(e); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-red-500/50 shadow-lg hover:bg-red-500 hover:border-red-500 group/del"
          style={{ zIndex: Z_INDEX.cardBadge }}
        >
          <Trash2 size={13} className="text-red-400 group-hover/del:text-white" strokeWidth={2} />
        </button>
      );
    }
    if (recommendable) return <RecommendButton onClick={() => setIsRecommendModalOpen(true)} />;
    if (saved) {
      return (
        <div
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-accent rounded-md shadow-lg"
          style={{ zIndex: Z_INDEX.cardBadge }}
        >
          <Bookmark size={14} className="text-white fill-white" strokeWidth={2} />
        </div>
      );
    }
    if (addable) {
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd?.(e); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-white/30 shadow-lg hover:bg-accent hover:border-accent group/add"
          style={{ zIndex: Z_INDEX.cardBadge }}
        >
          <Bookmark size={14} className="text-white/70 group-hover/add:text-white" strokeWidth={2} />
        </button>
      );
    }
    return null;
  };

  // 좌하단 슬롯 렌더링
  const renderBottomLeft = () => {
    const effectiveCelebCount = fetchedCelebCount ?? celebCount;
    const hasCeleb = effectiveCelebCount !== undefined && effectiveCelebCount > 0;
    const hasUser = userCount !== undefined && userCount > 0;
    if (hasCeleb || hasUser) {
      const handleStatsClick = onStatsClick || ((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowStatsModal(true);
      });
      return (
        <div
          onMouseEnter={() => setIsBadgeHovered(true)}
          onMouseLeave={() => setIsBadgeHovered(false)}
        >
          <StatsBadge celebCount={effectiveCelebCount} userCount={userCount} onClick={handleStatsClick} />
        </div>
      );
    }
    return null;
  };

  // 우하단 슬롯 렌더링
  const renderBottomRight = () => {
    if (rating) return <RatingBadge rating={rating} />;
    return null;
  };

  // 선택 모드일 때 ring 효과
  const selectableClass = selectable
    ? isSelected
      ? "ring-2 ring-accent"
      : "hover:ring-1 hover:ring-border"
    : "";

  // 추천 모달 (리뷰 모드·기본 모드 모두에서 사용)
  const recommendModal = recommendable && userContentId ? (
    <RecommendationModal
      isOpen={isRecommendModalOpen}
      onClose={() => setIsRecommendModalOpen(false)}
      userContentId={userContentId}
      contentTitle={title}
      contentThumbnail={thumbnail ?? null}
      contentType={contentType}
    />
  ) : null;

  // #region 리뷰 모드 렌더링
  if (isReviewMode) {
    return (
      <>
        {/* PC: 가로 레이아웃 (이미지 + 리뷰) */}
        <div
          onClick={handleClick}
          className={`group hidden sm:flex flex-col bg-[#1e1e1e] hover:bg-[#252525] border border-white/10 hover:border-accent/40 rounded-lg overflow-hidden cursor-pointer ${className || ""}`}
        >
          {/* 헤더 슬롯 */}
          {headerNode && (
            <div className="px-4 py-3 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1">{headerNode}</div>
            </div>
          )}

          <div className={`flex gap-4 p-4 ${headerNode ? "pt-2" : ""} w-full ${heightClass} relative`}>
            {/* 좌측: 이미지 */}
            <div className="relative w-40 flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary shadow-lg border border-white/5">
              {renderTopLeft()}
              {renderTopRight()}

              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-cover group-hover:scale-105"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <ContentIcon size={48} className="text-text-tertiary" />
                </div>
              )}

              {renderBottomLeft()}
              {renderSelectOverlay()}
              {renderBottomRight()}
            </div>

            {/* 우측: 제목 + 리뷰 영역 */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* 제목/작가 */}
              <div className="mb-2">
                <h3 className="text-base font-bold text-text-primary line-clamp-2 leading-tight group-hover:text-accent">
                  {title}
                </h3>
                {creator && (
                  <p className="text-xs text-text-secondary line-clamp-1 mt-1">
                    {creator.replace(/\^/g, ", ")}
                  </p>
                )}
              </div>

              {/* 상태/별점 */}
              {!headerNode && (showStatusBadge && statusInfo || rating) && (
                <div className="flex items-center gap-2 mb-2">
                  {showStatusBadge && statusInfo && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                  {rating && (
                    <span className="flex items-center gap-1 text-xs text-text-primary font-medium">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}

              {/* 리뷰 */}
              {review && !isSpoiler && (
                <div
                  ref={containerRef}
                  className={`flex-1 overflow-hidden relative select-none min-h-0 ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  {canScroll && scrollY > 0 && (
                    <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-[#1e1e1e] to-transparent pointer-events-none z-10" />
                  )}
                  <div style={scrollStyle}>
                    <p className="text-sm md:text-base text-text-secondary leading-relaxed whitespace-pre-line break-words font-sans">
                      <FormattedText text={review} />
                    </p>
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block mt-3 text-xs text-accent/60 hover:text-accent underline underline-offset-2 break-all"
                      >
                        출처: {sourceUrl}
                      </a>
                    )}
                  </div>
                  {canScroll && scrollY < maxScroll && (
                    <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
                  )}
                </div>
              )}
              {review && isSpoiler && (
                <div className="flex-1 flex items-center justify-center bg-white/5 rounded border border-white/5">
                  <p className="text-sm text-text-tertiary">스포일러 포함</p>
                </div>
              )}
              {!review && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-text-tertiary/50 italic">리뷰 없음</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 모바일: 포스터 카드 */}
        <div
          className={`sm:hidden flex flex-col ${headerNode ? "bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden shadow-md" : "space-y-2"} ${className || ""}`}
        >
          {headerNode && (
            <div className="px-2.5 py-2 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1">{headerNode}</div>
            </div>
          )}

          <div
            onClick={handleClick}
            className={`cursor-pointer relative ${headerNode ? "overflow-hidden bg-bg-secondary" : "bg-[#212121] border border-border/60 rounded-lg overflow-hidden active:border-accent/50"}`}
          >
            {renderTopLeft()}
            {renderTopRight()}

            <div className={`${aspectClass} overflow-hidden relative bg-bg-secondary`}>
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  unoptimized
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <ContentIcon size={32} className="text-text-tertiary" />
                </div>
              )}
              {renderBottomLeft()}
              {renderSelectOverlay()}
              {renderBottomRight()}
            </div>

            <div className={`p-2 ${headerNode ? "bg-[#151515]" : ""}`}>
              <h3 className="text-[11px] font-bold text-text-primary line-clamp-2 leading-tight">
                {title}
              </h3>
              {creator && (
                <p className="text-[10px] text-text-secondary line-clamp-1 mt-1">
                  {creator.replace(/\^/g, ", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 리뷰 모달 */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="md">
          <ModalBody>
            <div className="mb-4 pb-3 border-b border-border/30">
              <h3 className="text-base font-semibold text-text-primary line-clamp-2">{title}</h3>
              {creator && (
                <p className="text-xs text-text-secondary line-clamp-1 mt-1">
                  {creator.replace(/\^/g, ", ")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-text-secondary">
                {ownerNickname ? `${ownerNickname}의 리뷰` : "리뷰"}
              </h4>
            </div>

            {review && !isSpoiler ? (
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 mb-2">
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line break-words">
                  <FormattedText text={review} />
                </p>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block mt-3 text-xs text-accent/60 hover:text-accent underline underline-offset-2 break-all"
                  >
                    출처: {sourceUrl}
                  </a>
                )}
              </div>
            ) : review && isSpoiler ? (
              <p className="text-sm text-text-tertiary italic">스포일러 포함 리뷰</p>
            ) : (
              <p className="text-sm text-text-tertiary italic">작성된 리뷰가 없습니다</p>
            )}
          </ModalBody>
          {contentDetailUrl && (
            <ModalFooter>
              <Link
                href={contentDetailUrl}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover"
              >
                <ExternalLink size={14} />
                상세 보기
              </Link>
            </ModalFooter>
          )}
        </Modal>
        <TypeInfoModal isOpen={isTypeInfoOpen} onClose={() => setIsTypeInfoOpen(false)} currentType={contentType} />
        {recommendModal}
      </>
    );
  }
  // #endregion

  // #region 기본 카드 렌더링
  const cardContent = (
    <>
      <div className={`relative ${aspectClass} overflow-hidden bg-bg-secondary`}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            unoptimized
            className={`object-cover ${selectable && isSelected ? "brightness-90" : !isBadgeHovered ? "group-hover:scale-105" : ""}`}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <ContentIcon size={32} className="text-text-tertiary" />
          </div>
        )}

        {showGradient && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}

        {renderTopLeft()}
        {renderTopRight()}
        {renderBottomLeft()}
        {renderSelectOverlay()}
        {renderBottomRight()}
      </div>

      {showInfo && (
        <div className="p-2">
          <h3 className={`text-xs font-semibold text-text-primary line-clamp-2 leading-tight ${!isBadgeHovered ? "group-hover:text-accent" : ""}`}>
            {title}
          </h3>
          {creator && (
            <p className="text-[10px] text-text-secondary line-clamp-1 mt-0.5">
              {creator.replace(/\^/g, ", ")}
            </p>
          )}
        </div>
      )}
    </>
  );

  const containerClass = `group flex flex-col bg-bg-card border border-border/30 rounded-xl overflow-hidden cursor-pointer ${!isBadgeHovered ? "hover:border-accent/50" : ""} ${selectableClass} ${className || ""}`;

  // 콘텐츠 분류 안내 모달
  const typeInfoModal = (
    <TypeInfoModal isOpen={isTypeInfoOpen} onClose={() => setIsTypeInfoOpen(false)} currentType={contentType} />
  );

  // 인원 구성 모달
  const statsModal = (
    <ContentStatsModal
      isOpen={showStatsModal}
      onClose={() => setShowStatsModal(false)}
      contentId={contentId || ""}
      contentTitle={title}
      celebCount={fetchedCelebCount ?? celebCount ?? 0}
      userCount={userCount || 0}
    />
  );

  if (href && !selectable) {
    return (
      <>
        <Link href={href} className={containerClass} onClick={handleClick}>
          {cardContent}
        </Link>
        {statsModal}
        {typeInfoModal}
        {recommendModal}
      </>
    );
  }

  return (
    <>
      <div className={containerClass} onClick={handleClick}>
        {cardContent}
      </div>
      {statsModal}
      {typeInfoModal}
      {recommendModal}
    </>
  );
  // #endregion
}

// #region 인원 구성 모달
interface CelebInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  profession: string | null;
}

function ContentStatsModal({
  isOpen,
  onClose,
  contentId,
  contentTitle,
  celebCount,
  userCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
  celebCount: number;
  userCount: number;
}) {
  const [celebs, setCelebs] = useState<CelebInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !contentId) return;

    const fetchCelebs = async () => {
      setIsLoading(true);
      const data = await getCelebsForContent(contentId);
      setCelebs(data);
      setIsLoading(false);
    };

    fetchCelebs();
  }, [isOpen, contentId]);

  const hasCeleb = celebCount > 0;
  const hasUser = userCount > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="인원 구성" icon={Users} size="sm">
      <ModalBody className="space-y-4">
        {/* 콘텐츠 제목 */}
        <div className="text-center pb-3 border-b border-border/30">
          <p className="text-sm text-text-secondary line-clamp-2">{contentTitle}</p>
        </div>

        {/* 통계 요약 */}
        <div className="flex justify-center gap-6">
          {hasCeleb && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Crown size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{celebCount}</p>
                <p className="text-xs text-text-secondary">셀럽</p>
              </div>
            </div>
          )}
          {hasUser && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <User size={16} className="text-text-secondary" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{userCount}</p>
                <p className="text-xs text-text-secondary">사용자</p>
              </div>
            </div>
          )}
        </div>

        {/* 셀럽 목록 */}
        {hasCeleb && (
          <div className="pt-2">
            <h4 className="text-xs font-medium text-text-tertiary mb-3">이 콘텐츠를 선택한 셀럽</h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : celebs.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {celebs.map((celeb) => (
                  <Link
                    key={celeb.id}
                    href={`/${celeb.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                      {celeb.avatar_url ? (
                        <Image
                          src={celeb.avatar_url}
                          alt={celeb.nickname}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={20} className="text-text-tertiary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {celeb.nickname}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {getCelebProfessionLabel(celeb.profession)}
                      </p>
                    </div>
                    <Crown size={14} className="text-accent/60 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-tertiary text-sm">
                셀럽 정보가 없습니다
              </div>
            )}
          </div>
        )}

        {/* 안내 문구 */}
        {hasCeleb && (
          <p className="text-[10px] text-text-tertiary text-center pt-2 border-t border-border/30">
            셀럽은 역사적 인물과 유명인을 의미합니다
          </p>
        )}
      </ModalBody>
    </Modal>
  );
}
// #endregion
