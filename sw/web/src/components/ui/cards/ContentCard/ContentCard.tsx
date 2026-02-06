/*
  통합 콘텐츠 카드

  슬롯 레이아웃:
    좌상단 - [카테고리 레이블] (항상 표시)
    좌하단 - [인물 구성 숫자 뱃지]
    우상단 - [삭제] OR [선물] OR [북마크]
    우하단 - [별점]
    중앙   - [선택 체크 오버레이]
*/
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ExternalLink } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import useDragScroll from "@/hooks/useDragScroll";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import FormattedText from "@/components/ui/FormattedText";
import { RecommendationModal } from "@/components/features/recommendations";

import type { ContentCardProps } from "./types";
import { TYPE_ICONS, STATUS_STYLES, ASPECT_STYLES } from "./constants";
import { useContentCounts } from "./hooks/useCelebCount";
import {
  TypeLabel,
  SelectOverlay,
  RecommendButton,
  StatsBadge,
  RatingBadge,
  DeleteButton,
  SavedBadge,
  AddButton,
} from "./slots";
import TypeInfoModal from "./modals/TypeInfoModal";
import ContentStatsModal from "./modals/ContentStatsModal";

export default function ContentCard({
  thumbnail,
  title,
  creator,
  contentType = "BOOK",
  href,
  onClick,
  aspectRatio = "2/3",
  selectable,
  isSelected = false,
  onSelect,
  topRightNode,
  deletable,
  onDelete,
  recommendable,
  userContentId,
  saved,
  addable,
  onAdd,
  celebCount,
  userCount,
  onStatsClick,
  rating,
  onRatingClick,
  showInfo = true,
  showGradient = true,
  contentId,
  status,
  review,
  isSpoiler = false,
  sourceUrl,
  showStatusBadge = true,
  ownerNickname,
  headerNode,
  className,
  heightClass = "h-[280px]",
}: ContentCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const aspectClass = ASPECT_STYLES[aspectRatio];
  const statusInfo = status ? STATUS_STYLES[status] : null;

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isTypeInfoOpen, setIsTypeInfoOpen] = useState(false);

  // 인원 구성: prop으로 전달되면 사용, 없으면 자동 조회
  const shouldFetch = celebCount === undefined;
  const fetched = useContentCounts(shouldFetch ? contentId : undefined);
  const effectiveCelebCount = celebCount ?? fetched.celebCount;
  const effectiveUserCount = userCount ?? fetched.userCount ?? 0;

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

  // 리뷰 모드 여부
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

  // 클릭 핸들러
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
      if (!href) e.preventDefault();
    }
  };

  // #region 슬롯 렌더링
  const renderTopLeft = () => (
    <TypeLabel type={contentType} onOpen={() => setIsTypeInfoOpen(true)} />
  );

  const renderSelectOverlay = () => {
    if (!selectable) return null;
    return <SelectOverlay isSelected={isSelected} />;
  };

  const renderTopRight = () => {
    if (topRightNode) {
      return (
        <div
          className="absolute top-1.5 right-1.5 md:top-2 md:right-2"
          style={{ zIndex: Z_INDEX.cardBadge }}
          onClick={(e) => e.stopPropagation()}
        >
          {topRightNode}
        </div>
      );
    }
    if (deletable) return <DeleteButton onClick={onDelete} />;
    if (recommendable) return <RecommendButton onClick={() => setIsRecommendModalOpen(true)} />;
    if (saved) return <SavedBadge />;
    if (addable) return <AddButton onClick={onAdd} />;
    return null;
  };

  // 좌하단: 인원 구성 뱃지 (셀럽 | 일반인)
  const renderBottomLeft = () => {
    // 아직 로딩 중이면 미표시 (0이어도 표시)
    if (effectiveCelebCount === undefined) return null;

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
        <StatsBadge celebCount={effectiveCelebCount} userCount={effectiveUserCount} onClick={handleStatsClick} />
      </div>
    );
  };

  const renderBottomRight = () => {
    // onRatingClick이 있으면 rating이 null이어도 표시 (클릭해서 등록 가능)
    if (rating || onRatingClick) {
      return <RatingBadge rating={rating ?? null} onClick={onRatingClick} />;
    }
    return null;
  };
  // #endregion

  // 선택 모드 스타일
  const selectableClass = selectable
    ? isSelected
      ? "ring-2 ring-accent"
      : "hover:ring-1 hover:ring-border"
    : "";

  // 공통 모달 (모든 모드에서 동일하게 렌더링)
  const modals = (
    <>
      <TypeInfoModal
        isOpen={isTypeInfoOpen}
        onClose={() => setIsTypeInfoOpen(false)}
        currentType={contentType}
      />
      <ContentStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        contentId={contentId || ""}
        contentTitle={title}
        contentThumbnail={thumbnail}
        celebCount={effectiveCelebCount ?? 0}
      />
      {recommendable && userContentId && (
        <RecommendationModal
          isOpen={isRecommendModalOpen}
          onClose={() => setIsRecommendModalOpen(false)}
          userContentId={userContentId}
          contentTitle={title}
          contentThumbnail={thumbnail ?? null}
          contentType={contentType}
        />
      )}
    </>
  );

  // #region 리뷰 모드 렌더링
  if (isReviewMode) {
    return (
      <>
        {/* PC: 가로 레이아웃 */}
        <div
          onClick={handleClick}
          className={`group hidden sm:flex flex-col bg-[#1e1e1e] hover:bg-[#252525] border border-white/10 hover:border-accent/40 rounded-lg overflow-hidden cursor-pointer ${className || ""}`}
        >
          {headerNode && (
            <div className="px-4 py-3 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1">{headerNode}</div>
            </div>
          )}

          <div className={`flex gap-4 p-4 ${headerNode ? "pt-2" : ""} w-full ${heightClass} relative`}>
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
                  className="object-cover transition-transform duration-300 delay-150 group-hover:scale-105"
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

            <div className="flex-1 min-w-0 flex flex-col">
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
        {modals}
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
            className={`object-cover transition-transform duration-300 delay-150 ${selectable && isSelected ? "brightness-90" : !isBadgeHovered ? "group-hover:scale-105" : ""}`}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <ContentIcon size={32} className="text-text-tertiary" />
          </div>
        )}

        {showGradient && (
          <div className="absolute inset-x-0 bottom-0 h-16 md:h-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}

        {renderTopLeft()}
        {renderTopRight()}
        {renderBottomLeft()}
        {renderSelectOverlay()}
        {renderBottomRight()}
      </div>

      {showInfo && (
        <div className="p-2 md:p-2.5">
          <h3 className={`text-xs md:text-sm font-semibold text-text-primary line-clamp-2 leading-tight ${!isBadgeHovered ? "group-hover:text-accent" : ""}`}>
            {title}
          </h3>
          {creator && (
            <p className="text-[10px] md:text-xs text-text-secondary line-clamp-1 mt-0.5 md:mt-1">
              {creator.replace(/\^/g, ", ")}
            </p>
          )}
        </div>
      )}
    </>
  );

  const containerClass = `group flex flex-col bg-bg-card border border-border/30 rounded-xl overflow-hidden cursor-pointer ${!isBadgeHovered ? "hover:border-accent/50" : ""} ${selectableClass} ${className || ""}`;

  if (href && !selectable) {
    return (
      <>
        <Link href={href} className={containerClass} onClick={handleClick}>
          {cardContent}
        </Link>
        {modals}
      </>
    );
  }

  return (
    <>
      <div className={containerClass} onClick={handleClick}>
        {cardContent}
      </div>
      {modals}
    </>
  );
  // #endregion
}
