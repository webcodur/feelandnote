/*
  파일명: /components/features/archive/detail/Detail.tsx
  기능: 기록 상세 페이지 최상위 컴포넌트
  책임: 콘텐츠 기록의 상세 정보, 탭, 리뷰, 노트 등을 조합하여 렌더링한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import ArchiveDetailHeader from "./ArchiveDetailHeader";
import ArchiveDetailTabs, { type SubTab } from "./ArchiveDetailTabs";
import FeedSection from "./sections/FeedSection";
import MyReviewSection from "./sections/MyReviewSection";
import CreationSection from "./sections/CreationSection";
import CreateCreationModal from "../modals/CreateCreationModal";
import NoteEditor from "./note/NoteEditor";
import { getContent, getPublicContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { getContentMetadata, type ContentMetadata } from "@/actions/contents/getContentMetadata";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateReview } from "@/actions/contents/updateReview";
import { removeContent } from "@/actions/contents/removeContent";
import { getProfile } from "@/actions/user";
import { generateReviewExample } from "@/actions/ai";
import { Z_INDEX } from "@/constants/zIndex";
import type { ContentStatus } from "@/types/database";
import { useAchievement } from "@/components/features/profile/achievements";

interface DetailProps {
  contentId: string;
  viewUserId?: string; // 타인의 콘텐츠를 볼 때 해당 사용자 ID
}

export default function Detail({ contentId, viewUserId }: DetailProps) {
  const router = useRouter();
  const { showUnlock } = useAchievement();
  const isViewingOther = !!viewUserId; // 타인 콘텐츠 조회 여부

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("review");
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [item, setItem] = useState<UserContentWithDetails | null>(null);
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // 타인 콘텐츠 조회 시 getPublicContent, 아니면 getContent
        const contentData = viewUserId
          ? await getPublicContent(contentId, viewUserId)
          : await getContent(contentId);

        const profile = viewUserId ? null : await getProfile();

        setItem(contentData);
        setHasApiKey(!!profile?.gemini_api_key);

        setReviewText(contentData.review || "");
        setReviewRating(contentData.rating);
        setIsSpoiler(contentData.is_spoiler ?? false);

        const metadataResult = await getContentMetadata({
          contentId: contentData.content.id,
          contentType: contentData.content.type as import("@/types/database").ContentType,
        });
        setMetadata(metadataResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [contentId, viewUserId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || "콘텐츠를 찾을 수 없습니다."}</p>
        <Button variant="secondary" onClick={() => router.push("/archive")}>목록으로 돌아가기</Button>
      </div>
    );
  }

  const handleStatusChange = (newStatus: ContentStatus) => {
    startSaveTransition(async () => {
      try {
        await updateStatus({ userContentId: item.id, status: newStatus });
        setItem((prev) => prev ? { ...prev, status: newStatus } : null);
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
          router.push("/archive");
        } catch (err) {
          console.error("삭제 실패:", err);
        }
      });
    }
  };

  const handleSaveReview = () => {
    if (!item) return;
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
        setItem((prev) => prev ? { ...prev, rating: reviewRating, review: reviewText, is_spoiler: isSpoiler } : null);
        if (result.data.unlockedTitles?.length) showUnlock(result.data.unlockedTitles);
      } catch (err) {
        console.error("리뷰 저장 실패:", err);
      }
    });
  };

  const handleGenerateExample = async () => {
    if (!item) return;
    setIsGenerating(true);
    try {
      const result = await generateReviewExample({
        contentTitle: item.content.title,
        contentType: item.content.type,
      });
      setReviewText(result.text);
    } catch (err) {
      console.error("AI 예시 생성 실패:", err);
      alert(err instanceof Error ? err.message : "AI 예시 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <ArchiveDetailHeader
        item={item}
        metadata={metadata}
        isSaving={isSaving}
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
            <MyReviewSection
              reviewText={reviewText}
              reviewRating={reviewRating}
              isSpoiler={isSpoiler}
              isSaving={isSaving}
              onReviewTextChange={setReviewText}
              onRatingChange={setReviewRating}
              onSpoilerChange={setIsSpoiler}
              onSave={handleSaveReview}
              hasApiKey={hasApiKey}
              onGenerateExample={handleGenerateExample}
              isGenerating={isGenerating}
            />
          )}

          {activeSubTab === "note" && (
            <div className="animate-fade-in">
              <NoteEditor contentId={contentId} />
            </div>
          )}

          {activeSubTab === "creation" && <CreationSection />}
        </div>

        {/* 오른쪽: 타인 피드 */}
        <div className="lg:w-1/2">
          <FeedSection contentId={contentId} subTab={activeSubTab} />
        </div>
      </div>

      {activeSubTab === "creation" && (
        <Button
          unstyled
          onClick={() => setIsCreationModalOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center shadow-lg hover:scale-110 hover:bg-accent-hover"
          style={{ zIndex: Z_INDEX.fab }}
        >
          <Plus size={24} color="white" />
        </Button>
      )}

      <CreateCreationModal
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        contentTitle={item.content.title}
      />
    </>
  );
}
