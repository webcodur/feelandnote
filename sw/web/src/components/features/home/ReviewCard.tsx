"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter, type TitleInfo } from "@/components/ui";
import RecordCard from "@/components/ui/cards/RecordCard";
import Button from "@/components/ui/Button";
import { Check, Book, ExternalLink, User } from "lucide-react";
import { addContent } from "@/actions/contents/addContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";

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
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startTransition] = useTransition();
  const [showUserModal, setShowUserModal] = useState(false);

  const category = getCategoryByDbType(contentType);
  const contentTypeLabel = category?.shortLabel ?? contentType;

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

  // 사용자 기록관으로 이동
  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${userId}`);
  };

  // Header Node (User Info)
  const headerNode = (
    <div className="flex items-center gap-4 py-1">
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
          className="ring-1 ring-accent/30 rounded-full shadow-lg"
        />
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
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
  );

  // Action Node (Save Button)
  const actionNode = (
    <div>
      {isAdded ? (
        <div className="px-3 py-1.5 border border-accent/30 bg-black/80 backdrop-blur-md text-accent font-black text-[10px] tracking-tight flex items-center gap-1.5 rounded shadow-lg">
          <Check size={12} />
          <span>저장됨</span>
        </div>
      ) : (
        <button
          onClick={handleAddToArchive}
          disabled={isChecking || isAdding}
          className="px-3 py-1.5 border border-accent/50 bg-black/60 backdrop-blur-md text-accent hover:bg-accent hover:text-black font-black text-[10px] tracking-tight cursor-pointer disabled:cursor-wait rounded shadow-lg transition-all"
        >
          {isChecking ? "..." : isAdding ? "저장 중" : `${contentTypeLabel} 추가`}
        </button>
      )}
    </div>
  );

  return (
    <>
      <RecordCard
        contentId={contentId}
        contentType={contentType}
        title={contentTitle}
        creator={contentCreator}
        thumbnail={contentThumbnail}
        status="FINISHED" // 피드는 보통 완료된 기록을 보여줌. 실제 status가 있으면 받아야 함.
        review={review}
        isSpoiler={isSpoiler}
        sourceUrl={sourceUrl}
        href={href || ""}
        ownerNickname={userName}
        headerNode={headerNode}
        actionNode={actionNode}
        heightClass="h-[320px] md:h-[280px]" // 모바일에서 조금 더 높게? 아니면 동일하게?
        className="max-w-4xl mx-auto"
        // 모바일에서는 RecordCard 내부 스타일이 적용됨 (heightClass는 PC용)
      />

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
