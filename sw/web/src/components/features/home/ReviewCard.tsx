"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter, type TitleInfo } from "@/components/ui";
import { BLUR_DATA_URL } from "@/constants/image";
import Button from "@/components/ui/Button";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { Check, Book, ExternalLink, User } from "lucide-react";
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

// 쌍따옴표 부분 파싱 (인용문 강조)
function parseQuotedText(text: string): React.ReactNode[] {
  const parts = text.split(/(".*?")/g);
  return parts.map((part, i) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={i} className="text-accent/80">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

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
  sourceUrl?: string | null;

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
  sourceUrl,
  href,
}: ReviewCardProps) {
  const router = useRouter();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startTransition] = useTransition();
  const [showNavigateModal, setShowNavigateModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

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
      <div
        className="relative w-full md:w-[180px] lg:w-[200px] aspect-[2/3] md:aspect-auto md:h-full shrink-0 bg-black border border-accent/30 cursor-pointer hover:border-accent"
        onClick={(e) => {
          e.stopPropagation();
          setShowNavigateModal(true);
        }}
      >
        {contentThumbnail ? (
          <Image
            src={contentThumbnail}
            alt={contentTitle}
            fill
            unoptimized
            className="object-cover opacity-80 grayscale group-hover:opacity-100 group-hover:grayscale-0"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
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
          <button
            type="button"
            className="flex-shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowUserModal(true);
            }}
          >
            <Avatar
              url={userAvatar}
              name={userName}
              size="md"
              className="ring-1 ring-accent/30 rounded-full grayscale group-hover:grayscale-0 shadow-lg"
            />
          </button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-lg font-black text-text-primary tracking-tight hover:text-accent cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserModal(true);
                }}
              >
                {userName}
              </button>
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
              <div style={scrollStyle}>
                <p className="text-base md:text-lg text-[#e0e0e0] font-normal leading-[1.7] font-sans antialiased">
                  {parseQuotedText(review)}
                </p>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title={sourceUrl}
                    className="inline-block mt-3 text-xs text-accent/60 hover:text-accent underline underline-offset-2 break-all"
                  >
                    출처: {sourceUrl}
                  </a>
                )}
              </div>
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

  // 상세 페이지 이동 URL (category 포함)
  const category = getCategoryByDbType(contentType)?.id || "book";
  const detailUrl = `/content/detail?id=${contentId}&category=${category}`;

  // 상세 페이지로 이동
  const handleNavigateToDetail = () => {
    setShowNavigateModal(false);
    router.push(detailUrl);
  };

  // 사용자 기록관으로 이동
  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${userId}`);
  };

  // href가 있으면 클릭 가능한 div로 처리 (a 중첩 방지)
  if (href) {
    return (
      <>
        <div
          onClick={() => router.push(href)}
          className="cursor-pointer"
          role="link"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push(href)}
        >
          {cardContent}
        </div>

        {/* 상세 페이지 이동 확인 모달 */}
        <Modal
          isOpen={showNavigateModal}
          onClose={() => setShowNavigateModal(false)}
          title="콘텐츠 상세 정보"
          icon={ExternalLink}
          size="sm"
          closeOnOverlayClick
        >
          <ModalBody>
            <p className="text-text-secondary">
              <span className="text-text-primary font-semibold">{contentTitle}</span>
              의 상세 정보 및 기록 조회 페이지로 이동하시겠습니까?
            </p>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button variant="ghost" size="md" onClick={() => setShowNavigateModal(false)}>
              취소
            </Button>
            <Button variant="primary" size="md" onClick={handleNavigateToDetail}>
              이동
            </Button>
          </ModalFooter>
        </Modal>

        {/* 사용자 기록관 이동 확인 모달 */}
        <Modal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          title="기록관 방문"
          icon={User}
          size="sm"
          closeOnOverlayClick
        >
          <ModalBody>
            <p className="text-text-secondary">
              <span className="text-text-primary font-semibold">{userName}</span>
              님의 기록관으로 이동하시겠습니까?
            </p>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>
              취소
            </Button>
            <Button variant="primary" size="md" onClick={handleNavigateToUser}>
              이동
            </Button>
          </ModalFooter>
        </Modal>
      </>
    );
  }

  return (
    <>
      {cardContent}

      {/* 상세 페이지 이동 확인 모달 */}
      <Modal
        isOpen={showNavigateModal}
        onClose={() => setShowNavigateModal(false)}
        title="콘텐츠 상세 정보"
        icon={ExternalLink}
        size="sm"
        closeOnOverlayClick
      >
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{contentTitle}</span>
            의 상세 정보 및 기록 조회 페이지로 이동하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowNavigateModal(false)}>
            취소
          </Button>
          <Button variant="primary" size="md" onClick={handleNavigateToDetail}>
            이동
          </Button>
        </ModalFooter>
      </Modal>

      {/* 사용자 기록관 이동 확인 모달 */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="기록관 방문"
        icon={User}
        size="sm"
        closeOnOverlayClick
      >
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{userName}</span>
            님의 기록관으로 이동하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>
            취소
          </Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>
            이동
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
