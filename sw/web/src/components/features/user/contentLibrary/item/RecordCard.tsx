/*
  파일명: /components/features/user/contentLibrary/item/RecordCard.tsx
  기능: 기록관 전용 컴팩트 카드
  책임: 콘텐츠 기록을 컴팩트하게 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Book, Film, Gamepad2, Music, Award, Star, ChevronRight, ExternalLink, MessageSquare, Image as ImageIcon, RefreshCw } from "lucide-react";
import useDragScroll from "@/hooks/useDragScroll";
import { BLUR_DATA_URL } from "@/constants/image";
import type { ContentType, ContentStatus } from "@/types/database";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

// #region 타입
interface RecordCardProps {
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
  // 링크
  href: string;
  // UI 옵션
  showStatusBadge?: boolean;
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
  href,
  showStatusBadge = true,
}: RecordCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const statusInfo = STATUS_STYLES[status];
  const router = useRouter();
  const [showReview, setShowReview] = useState(false);
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

  // 모바일 토글
  const handleMobileToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowReview(!showReview);
  };

  // 모바일 상세보기 모달 열기
  const handleMobileNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  // 모달 확인 시 페이지 이동
  const handleConfirmNavigate = () => {
    router.push(href);
  };

  // PC 클릭 핸들러
  const handlePCClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <>
      {/* PC: 2열 구조 (이미지 + 리뷰) */}
      <div
        onClick={handlePCClick}
        className="group hidden sm:flex bg-bg-card hover:bg-bg-secondary border-2 border-border/30 hover:border-accent/50 rounded-lg overflow-hidden cursor-pointer"
      >
        <div className="flex gap-3 p-3 w-full h-[280px]">
          {/* 좌측: 이미지 + 하단 오버레이 (제목/작가) */}
          <div className="relative w-48 flex-shrink-0 rounded overflow-hidden bg-bg-secondary">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={title}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ContentIcon size={48} className="text-text-tertiary" />
              </div>
            )}

            {/* 하단 오버레이 (제목 + 작가) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-bg-main via-bg-main/95 to-transparent p-3 pt-12">
              <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-accent">
                {title}
              </h3>
              {creator && (
                <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                  {creator.replace(/\^/g, ", ")}
                </p>
              )}
            </div>
          </div>

          {/* 우측: 리뷰 전용 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단: 상태 + 별점 */}
            <div className="flex items-center gap-2 mb-2">
              {showStatusBadge && (
                <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              )}
              {rating && (
                <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                  {rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* 리뷰 영역 */}
            {review && !isSpoiler && (
              <div
                ref={containerRef}
                className={`flex-1 overflow-hidden relative select-none min-h-0 ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {canScroll && scrollY > 0 && (
                  <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-bg-card to-transparent pointer-events-none z-10" />
                )}
                <p
                  className="text-sm text-text-tertiary leading-relaxed whitespace-pre-line break-words"
                  style={scrollStyle}
                >
                  {review}
                </p>
                {canScroll && scrollY < maxScroll && (
                  <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-bg-card to-transparent pointer-events-none" />
                )}
              </div>
            )}
            {review && isSpoiler && (
              <p className="text-sm text-text-tertiary">스포일러 포함</p>
            )}
            {!review && (
              <p className="text-sm text-text-tertiary/50 italic">리뷰 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* 모바일: 1열 토글 방식 */}
      <div className="sm:hidden">
        <div className="bg-bg-card border-2 border-border/30 rounded-lg overflow-hidden h-[400px] flex flex-col">
          {/* 상단 고정 영역: 제목 + 작가 + 버튼들 */}
          <div className="flex items-start justify-between gap-3 p-3 border-b border-border/30 bg-bg-secondary/50">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
                {title}
              </h3>
              {creator && (
                <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                  {creator.replace(/\^/g, ", ")}
                </p>
              )}
              {/* 상태 + 별점 */}
              <div className="flex items-center gap-2 mt-1.5">
                {showStatusBadge && (
                  <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                )}
                {rating && (
                  <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                    <Star size={10} className="text-yellow-500 fill-yellow-500" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* 상세보기 버튼 */}
            <Link
              href={href}
              onClick={handleMobileNavigate}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-card border border-border/50 active:scale-95"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </Link>
          </div>

          {/* 하단 전환 영역 */}
          <div
            className="flex-1 overflow-hidden relative"
          >
            {/* 이미지 뷰 (클릭 시 리뷰로 전환) */}
            <div
              className={`absolute inset-0 bg-bg-secondary transition-all duration-300 cursor-pointer overflow-hidden ${
                showReview ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
              }`}
            >
              <div className="relative w-full h-full" onClick={handleMobileToggle}>
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={title}
                    fill
                    unoptimized
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ContentIcon size={48} className="text-text-tertiary" />
                  </div>
                )}
              </div>
              
              {/* 이미지 위 토글 버튼 */}
              <button 
                onClick={handleMobileToggle}
                className="absolute bottom-0 inset-x-0 py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-accent bg-bg-main/80 backdrop-blur-md border-t border-accent/20 active:bg-accent active:text-bg-main transition-all z-10"
              >
                <MessageSquare size={14} />
                리뷰 보기
              </button>
            </div>

            {/* 리뷰 뷰 (내부 스크롤 가능, 버튼 클릭 시 이미지로 전환) */}
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                showReview ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                  {review && !isSpoiler && (
                    <p className="text-sm text-text-tertiary leading-relaxed whitespace-pre-line break-words">
                      {review}
                    </p>
                  )}
                  {review && isSpoiler && (
                    <p className="text-sm text-text-tertiary">스포일러 포함</p>
                  )}
                  {!review && (
                    <p className="text-sm text-text-tertiary/50 italic">리뷰 없음</p>
                  )}
                </div>
                {/* 리뷰 위 토글 버튼 (이미지로 돌아가기) */}
                <button 
                  onClick={handleMobileToggle}
                  className="py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-text-secondary bg-bg-secondary/50 border-t border-border/10 hover:text-accent active:bg-accent active:text-bg-main transition-all"
                >
                  <ImageIcon size={14} />
                  이미지 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상세보기 확인 모달 (PC/모바일 공통) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="상세 정보 보기"
        icon={ExternalLink}
        size="sm"
      >
        <ModalBody>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{title}</span>의 상세 정보 및 기록 조회 페이지로 이동하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            className="flex-1 border-border/50"
            size="md"
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmNavigate}
            className="flex-1 border-accent/30"
            size="md"
          >
            이동
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
