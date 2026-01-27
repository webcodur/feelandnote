/*
  파일명: /components/features/user/detail/Detail.tsx
  기능: 기록 상세 페이지 최상위 컴포넌트
  책임: 콘텐츠 기록의 상세 정보, 탭, 리뷰, 노트 등을 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import ArchiveDetailHeader from "./ArchiveDetailHeader";
import ArchiveDetailTabs, { type SubTab } from "./ArchiveDetailTabs";
import FeedSection from "./sections/FeedSection";
import MyReviewSection from "./sections/MyReviewSection";
import OwnerReviewSection from "./sections/OwnerReviewSection";
import CreationSection from "./sections/CreationSection";
import CreateCreationModal from "../modals/CreateCreationModal";
import NoteEditor from "./note/NoteEditor";
import { type UserContentWithDetails } from "@/actions/contents/getContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateReview } from "@/actions/contents/updateReview";
import { removeContent } from "@/actions/contents/removeContent";
import { Z_INDEX } from "@/constants/zIndex";
import type { ContentStatus } from "@/types/database";
import { useAchievement } from "@/components/features/profile/achievements";

interface DetailProps {
  contentId: string;
  viewUserId?: string;
  initialData: UserContentWithDetails;
  initialMetadata: Record<string, unknown> | null;
  initialIsOwner: boolean;
  initialHasApiKey: boolean;
}

export default function Detail({
  contentId,
  viewUserId,
  initialData,
  initialMetadata,
  initialIsOwner,
  initialHasApiKey,
}: DetailProps) {
  const router = useRouter();
  const { showUnlock } = useAchievement();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("review");
  const [isOwner] = useState(initialIsOwner);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [item, setItem] = useState<UserContentWithDetails>(initialData);
  const [metadata] = useState<Record<string, unknown> | null>(initialMetadata);
  const [isSaving, startSaveTransition] = useTransition();

  const [reviewText, setReviewText] = useState(initialData.review || "");
  const [reviewRating, setReviewRating] = useState<number | null>(initialData.rating);
  const [isSpoiler, setIsSpoiler] = useState(initialData.is_spoiler ?? false);
  const [hasApiKey] = useState(initialHasApiKey);

  const handleStatusChange = (newStatus: ContentStatus) => {
    startSaveTransition(async () => {
      try {
        await updateStatus({ userContentId: item.id, status: newStatus });
        setItem((prev) => ({ ...prev, status: newStatus }));
      } catch (err) {
        console.error("상태 변경 실패:", err);
      }
    });
  };

  const handleDelete = () => {
    if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
      startSaveTransition(async () => {
        try {
          await removeContent(item.id);
          router.back();
        } catch (err) {
          console.error("삭제 실패:", err);
        }
      });
    }
  };

  const handleSaveReview = () => {
    startSaveTransition(async () => {
      try {
        const result = await updateReview({
          userContentId: item.id,
          rating: reviewRating,
          review: reviewText,
          isSpoiler,
        });
        if (!result.success) {
          console.error("리뷰 저장 실패:", result.message);
          return;
        }
        setItem((prev) => ({ ...prev, rating: reviewRating, review: reviewText, is_spoiler: isSpoiler }));
        if (result.data.unlockedTitles?.length) showUnlock(result.data.unlockedTitles);
      } catch (err) {
        console.error("리뷰 저장 실패:", err);
      }
    });
  };

  return (
    <>
      <ArchiveDetailHeader
        item={item}
        metadata={metadata}
        isSaving={isSaving}
        isOwner={isOwner}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

      <ArchiveDetailTabs
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 왼쪽: 내 기록 */}
        <div className="lg:w-1/2">
          {activeSubTab === "review" && (
            isOwner ? (
              <MyReviewSection
                reviewText={reviewText}
                reviewRating={reviewRating}
                isSpoiler={isSpoiler}
                isSaving={isSaving}
                onReviewTextChange={setReviewText}
                onRatingChange={setReviewRating}
                onSpoilerChange={setIsSpoiler}
                onSave={handleSaveReview}
              />
            ) : (
              <OwnerReviewSection
                recordId={item.id}
                review={item.review}
                rating={item.rating}
                isSpoiler={item.is_spoiler ?? false}
                ownerNickname={item.user?.nickname}
                ownerAvatar={item.user?.avatar_url}
                updatedAt={item.updated_at}
              />
            )
          )}

          {activeSubTab === "note" && isOwner && (
            <div className="animate-fade-in">
              <NoteEditor contentId={contentId} />
            </div>
          )}

          {activeSubTab === "creation" && isOwner && <CreationSection />}
        </div>

        {/* 오른쪽: 타인 피드 */}
        <div className="lg:w-1/2 flex flex-col">
          <FeedSection
            contentId={contentId}
            subTab={activeSubTab}
            viewUserId={viewUserId}
            hasApiKey={hasApiKey}
            contentTitle={item.content.title}
            contentType={item.content.type}
          />
        </div>
      </div>

      {/* FAB 영역 */}
      {activeSubTab === "creation" && isOwner && (
        <Button
          unstyled
          onClick={() => setIsCreationModalOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent-hover"
          style={{ zIndex: Z_INDEX.fab }}
        >
          <Plus size={24} color="white" />
        </Button>
      )}

      {/* 독서 시작 버튼 - 책 타입 + 본인 소유 */}
      {item.content.type === "BOOK" && isOwner && (
        <Link
          href={`/reading/${contentId}`}
          className="fixed bottom-20 left-4 sm:bottom-8 sm:left-8 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-white shadow-lg hover:bg-accent-hover"
          style={{ zIndex: Z_INDEX.fab }}
        >
          <BookOpen size={20} />
          <span className="text-sm font-medium">독서 시작</span>
        </Link>
      )}

      <CreateCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        contentTitle={item.content.title}
      />
    </>
  );
}
