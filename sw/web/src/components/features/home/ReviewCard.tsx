"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, TitleBadge, type TitleInfo } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { Check, Book } from "lucide-react";
import { addContent } from "@/actions/contents/addContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import { getCategoryByDbType } from "@/constants/categories";
import useDragScroll from "@/hooks/useDragScroll";
import type { ContentType } from "@/types/database";

// 카테고리 정보 조회 헬퍼
const getContentTypeInfo = (type: ContentType) => {
  const category = getCategoryByDbType(type);
  return {
    icon: category?.lucideIcon ?? Book,
    label: category?.shortLabel ?? type,
  };
};

// #region Types
interface ReviewCardProps {
  // 사용자 정보
  userId: string;
  userName: string;
  userAvatar: string | null;
  userTitle?: TitleInfo | null;
  isOfficial?: boolean;
  userSubtitle?: string;

  // 콘텐츠 정보
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  contentCreator?: string | null;
  contentThumbnail?: string | null;

  // 리뷰 정보
  review: string;
  timeAgo: string;
  isSpoiler?: boolean;

  // 링크
  href?: string;
}
// #endregion

export default function ReviewCard({
  userId,
  userName,
  userAvatar,
  userTitle,
  isOfficial = false,
  userSubtitle,
  contentType,
  contentId,
  contentTitle,
  contentCreator,
  contentThumbnail,
  review,
  timeAgo,
  isSpoiler = false,
  href,
}: ReviewCardProps) {
  const router = useRouter();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startTransition] = useTransition();

  const { icon: ContentIcon, label: contentTypeLabel } = getContentTypeInfo(contentType);

  // 드래그 스크롤 훅
  const {
    containerRef: reviewContainerRef,
    scrollY,
    maxScroll,
    isDragging,
    canScroll,
    onMouseDown,
    onTouchStart,
    scrollStyle,
  } = useDragScroll();

  // 저장 상태 확인
  useEffect(() => {
    checkContentSaved(contentId).then((result) => {
      setIsAdded(result.saved);
      setIsChecking(false);
    });
  }, [contentId]);

  // 내 기록관에 추가 핸들러
  const handleAddToArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded || isAdding) return;

    startTransition(async () => {
      const result = await addContent({
        id: contentId,
        type: contentType,
        title: contentTitle,
        creator: contentCreator ?? undefined,
        thumbnailUrl: contentThumbnail ?? undefined,
        status: "WANT",
      });
      if (result.success) {
        setIsAdded(true);
      }
    });
  };

  const cardContent = (
    <ClassicalBox hover className="flex flex-col md:flex-row bg-[#0a0a0a] hover:bg-[#0c0c0c] font-serif relative max-w-[960px] md:h-[450px] mx-auto overflow-hidden group p-3 md:p-4">
      {/* 좌측: 콘텐츠 이미지 + 정보 오버레이 */}
      <div className="relative w-full md:w-[180px] lg:w-[200px] aspect-[2/3] md:aspect-auto md:h-full shrink-0 bg-black border border-accent/30">
        {contentThumbnail ? (
          <Image
            src={contentThumbnail}
            alt={contentTitle}
            fill
            unoptimized
            className="object-cover opacity-80 group-hover:opacity-100 grayscale group-hover:grayscale-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
            <ContentIcon size={48} className="text-accent/20" />
          </div>
        )}

        {/* 카테고리 뱃지 (이미지 좌상단) */}
        <div className="absolute top-3 left-3 z-10">
          <div className="border border-accent text-accent bg-[#0a0a0a]/90 px-2 py-0.5">
            <span className="text-[9px] font-black font-cinzel tracking-widest uppercase">
              {contentTypeLabel}
            </span>
          </div>
        </div>

        {/* 콘텐츠 정보 오버레이 (이미지 하단) */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 pt-10">
          <h4 className="font-serif font-black text-sm text-white leading-tight line-clamp-2 mb-0.5">
            {contentTitle}
          </h4>
          {contentCreator && (
            <p className="text-[10px] text-accent/70 font-medium truncate">
              {contentCreator}
            </p>
          )}
        </div>
      </div>

      {/* 우측: 프로필 + 리뷰 */}
      <div className="flex-1 flex flex-col pt-3 md:pt-0 md:pl-4 relative md:h-full">
        {/* 저장 버튼 (우상단) */}
        <div className="absolute top-0 right-0 z-10">
          {isAdded ? (
            <div className="px-4 py-2 border border-accent/30 bg-accent/5 text-accent/50 font-black text-xs tracking-tight flex items-center gap-2">
              <Check size={14} />
              <span>저장됨</span>
            </div>
          ) : (
            <button
              onClick={handleAddToArchive}
              disabled={isChecking || isAdding}
              className="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-[#0a0a0a] font-black text-xs tracking-tight cursor-pointer disabled:cursor-wait"
            >
              {isChecking ? "..." : isAdding ? "저장 중..." : "내 기록관에 추가"}
            </button>
          )}
        </div>

        {/* 프로필 헤더 */}
        <div className="flex items-center gap-4 border-b border-accent/20 pb-3 mb-3 pr-28">
          <Link
            href={`/${userId}`}
            className="group/user flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar
              url={userAvatar}
              name={userName}
              size="md"
              className="ring-1 ring-accent/30 rounded-full grayscale group-hover/user:grayscale-0 shadow-lg"
            />
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-text-primary tracking-tight">
                {userName}
              </h3>
              <TitleBadge title={userTitle ?? null} size="sm" />
              {isOfficial && (
                <span className="bg-[#d4af37] text-black text-[8px] px-1.5 py-0.5 font-black font-cinzel leading-none tracking-tight">
                  OFFICIAL
                </span>
              )}
            </div>
            <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
              {userSubtitle || "기록자"} · {timeAgo}
            </p>
          </div>
        </div>

        {/* 리뷰 본문 */}
        <div className="flex-1 relative min-h-0">
          {isSpoiler && !showSpoiler ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSpoiler(true);
              }}
              className="w-full h-[220px] md:h-full flex items-center justify-center bg-accent/5 border border-dashed border-accent/20 text-accent/50 hover:text-accent font-black uppercase tracking-widest text-[10px]"
            >
              스포일러 보호막 · 탭하여 해제
            </button>
          ) : (
            <div
              ref={reviewContainerRef}
              className={`h-[220px] md:h-full overflow-hidden relative select-none ${canScroll ? "cursor-grab" : ""} ${isDragging ? "cursor-grabbing" : ""}`}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              {/* 상단 그라데이션 - 위로 스크롤 가능할 때 표시 */}
              {canScroll && scrollY > 0 && (
                <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none z-10" />
              )}
              <p
                className="text-base md:text-lg text-[#e0e0e0] font-normal leading-[1.7] font-sans antialiased"
                style={scrollStyle}
              >
                {review}
              </p>
              {/* 하단 그라데이션 - 아래로 스크롤 가능할 때 표시 */}
              {canScroll && scrollY < maxScroll && (
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
              )}
            </div>
          )}
        </div>
      </div>
    </ClassicalBox>
  );

  // href가 있으면 클릭 가능한 div로 처리 (a 중첩 방지)
  if (href) {
    return (
      <div
        onClick={() => router.push(href)}
        className="cursor-pointer"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
