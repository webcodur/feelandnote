/*
  파일명: /components/ui/cards/RecordCard.tsx
  기능: 기록관 및 피드용 공통 콘텐츠 카드
  책임: 콘텐츠 기록을 컴팩트하게 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Book, Film, Gamepad2, Music, Award, Star, ExternalLink } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType, ContentStatus } from "@/types/database";
import useDragScroll from "@/hooks/useDragScroll";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import FormattedText from "@/components/ui/FormattedText";

// #region 타입
export interface RecordCardProps {
  // 콘텐츠 정보
  contentId: string;
  contentType: ContentType;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  // 기록 정보
  status: ContentStatus;
  rating?: number | null;
  review?: string | null;
  isSpoiler?: boolean;
  sourceUrl?: string | null;
  // 링크
  href?: string;
  // UI 옵션
  showStatusBadge?: boolean;
  // 기록 소유자 닉네임
  ownerNickname?: string;
  
  // 확장 슬롯 (Feed 등에서 사용)
  headerNode?: React.ReactNode; // 우측 상단 헤더 (유저 프로필 등)
  actionNode?: React.ReactNode; // 우측 상단 액션 (저장 버튼 등)
  
  // 스타일링
  className?: string; // 최상위 div 클래스 (height 포함 권장)
  heightClass?: string; // 기본 height 클래스 (className이 없으면 적용)
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

// #endregion
// #endregion

export default function RecordCard({
  contentId,
  contentType,
  title,
  creator,
  thumbnail,
  status,
  rating,
  review,
  isSpoiler = false,
  sourceUrl,
  href,
  showStatusBadge = true,
  ownerNickname,
  headerNode,
  actionNode,
  className,
  heightClass = "h-[280px]",
}: RecordCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const statusInfo = STATUS_STYLES[status];
  const [showModal, setShowModal] = useState(false);

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

  // 드래그 중 Link 클릭 방지
  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown(e);
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onTouchStart(e);
    e.stopPropagation();
  };

  // 콘텐츠 상세 페이지 URL
  const contentDetailUrl = `/content/${contentId}?category=${getCategoryByDbType(contentType)?.id || "book"}`;

  // PC 클릭 핸들러
  const handlePCClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setShowModal(true);
  };

  // 병합된 클래스네임 (간단한 결합)
  const containerClass = `group hidden sm:flex bg-[#212121] hover:bg-bg-secondary border-2 border-border/60 hover:border-accent/50 rounded-lg overflow-hidden cursor-pointer ${className || ""}`;

  return (
    <>
      {/* PC: 2열 구조 (이미지 + 리뷰) */}
      <div
        onClick={handlePCClick}
        className={`group hidden sm:flex flex-col bg-[#1e1e1e] hover:bg-[#252525] border border-white/10 hover:border-accent/40 rounded-lg overflow-hidden cursor-pointer transition-colors ${className || ""}`}
        suppressHydrationWarning
      >
        {/* 헤더 슬롯 (존재 시 상단 배치) */}
        {headerNode && (
          <div className="px-4 py-3 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">{headerNode}</div>
          </div>
        )}

        <div className={`flex gap-4 p-4 ${headerNode ? "pt-2" : ""} w-full ${heightClass} relative`}>
          
          {/* 좌측: 이미지 + 하단 오버레이 (제목/작가) */}
          <div className="relative w-48 flex-shrink-0 rounded overflow-hidden bg-bg-secondary h-full shadow-lg border border-white/5">
            {/* 액션 버튼 (이미지 우상단 배치) */}
            {actionNode && (
              <div 
                className="absolute top-2 right-2 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                {actionNode}
              </div>
            )}
            
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={title}
                fill
                sizes="192px"
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <ContentIcon size={48} className="text-text-tertiary" />
              </div>
            )}

            {/* 하단 오버레이 (제목 + 작가) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12">
              <h3 className="text-sm font-bold text-text-primary line-clamp-2 md:text-base leading-tight group-hover:text-accent font-serif">
                {title}
              </h3>
              {creator && (
                <p className="text-xs text-text-secondary line-clamp-1 mt-1 font-medium">
                  {creator.replace(/\^/g, ", ")}
                </p>
              )}
            </div>
          </div>

          {/* 우측: 리뷰 전용 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단: (헤더가 없을 때 상태/별점 표시) */}
            {!headerNode && (
              <div className="flex items-center gap-2 mb-3">
                {showStatusBadge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 ${statusInfo?.color ?? "text-text-secondary"}`}>
                    {statusInfo?.label ?? status}
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

            {/* 리뷰 영역 */}
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

      {/* 모바일: 통합 카드 구조 (헤더가 있을 경우) 또는 포스터 카드 (헤더 없을 경우) */}
      <div className={`sm:hidden flex flex-col ${headerNode ? "bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden shadow-md" : "space-y-2"} ${className || ""}`} suppressHydrationWarning>
        
        {/* 헤더 슬롯 (통합 카드 내부 상단) */}
        {headerNode && (
          <div className="px-3 py-3 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">{headerNode}</div>
          </div>
        )}

        {/* 콘텐츠 영역 */}
        <div
          onClick={() => setShowModal(true)}
          className={`cursor-pointer relative ${headerNode ? "mx-3 mb-3 rounded-lg overflow-hidden border border-white/5 bg-bg-secondary" : "bg-[#212121] border border-border/60 rounded-lg overflow-hidden active:border-accent/50"}`}
        >
          {/* 액션 버튼 (헤더 유무 상관없이 이미지 우상단) */}
          {actionNode && (
             <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
               {actionNode}
             </div>
          )}
        
          {/* 이미지 영역 - 2:3 비율 */}
          <div className="aspect-[2/3] overflow-hidden relative bg-bg-secondary">
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
             {/* 별점 오버레이 */}
            {rating && (
              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-bg-main/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-text-secondary z-10">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                {rating.toFixed(1)}
              </div>
            )}
          </div>

          {/* 하단 정보 */}
          <div className={`p-3 ${headerNode ? "bg-[#151515]" : ""}`}>
            <h3 className="text-xs font-bold text-text-primary line-clamp-2 leading-tight">
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

      {/* 리뷰 모달 (PC/모바일 공통) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="md"
      >
        <ModalBody>
          {/* 콘텐츠 정보 */}
          <div className="mb-4 pb-3 border-b border-border/30">
            <h3 className="text-base font-semibold text-text-primary line-clamp-2">{title}</h3>
            {creator && (
              <p className="text-xs text-text-secondary line-clamp-1 mt-1">
                {creator.replace(/\^/g, ", ")}
              </p>
            )}
          </div>

          {/* 리뷰 */}
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
        <ModalFooter>
          <Link
            href={contentDetailUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover"
          >
            <ExternalLink size={14} />
            상세 보기
          </Link>
        </ModalFooter>
      </Modal>
    </>
  );
}
