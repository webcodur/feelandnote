/*
  파일명: /app/(main)/archive/[id]/page.tsx
  기능: 기록 상세 페이지
  책임: 개별 콘텐츠 기록의 상세 정보를 표시한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import ArchiveDetailHeader from "@/components/features/archive/detail/ArchiveDetailHeader";
import ArchiveDetailTabs, { type MainTab, type SubTab } from "@/components/features/archive/detail/ArchiveDetailTabs";
import FeedSection from "@/components/features/archive/detail/sections/FeedSection";
import MyReviewSection from "@/components/features/archive/detail/sections/MyReviewSection";
import CreationSection from "@/components/features/archive/detail/sections/CreationSection";
import CreateCreationModal from "@/components/features/archive/modals/CreateCreationModal";
import NoteEditor from "@/components/features/archive/detail/note/NoteEditor";
import { getContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { getContentMetadata, type ContentMetadata } from "@/actions/contents/getContentMetadata";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateProgress } from "@/actions/contents/updateProgress";
import { updateReview } from "@/actions/contents/updateReview";
import { removeContent } from "@/actions/contents/removeContent";
import { getProfile } from "@/actions/user";
import { generateReviewExample } from "@/actions/ai";
import { Z_INDEX } from "@/constants/zIndex";
import type { ContentStatus } from "@/actions/contents/addContent";
import { useAchievement } from "@/components/features/achievements";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  const { showUnlock } = useAchievement();

  const [activeTab, setActiveTab] = useState<MainTab>("myRecord");
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
        const [contentData, profile] = await Promise.all([
          getContent(contentId),
          getProfile(),
        ]);
        setItem(contentData);
        setHasApiKey(!!profile?.gemini_api_key);

        // 리뷰 데이터는 user_contents에서 가져옴
        setReviewText(contentData.review || "");
        setReviewRating(contentData.rating);
        setIsSpoiler(contentData.is_spoiler ?? false);

        // API에서 메타데이터 가져오기
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
  }, [contentId]);

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

  const handleProgressChange = (newProgress: number) => {
    let newStatus: ContentStatus | undefined;
    if (newProgress === 100) newStatus = 'FINISHED';
    else if (newProgress < 100 && item.status === 'FINISHED') newStatus = 'WATCHING';
    else if (newProgress > 0 && item.status === 'WANT') newStatus = 'WATCHING';

    setItem((prev) => prev ? { ...prev, progress: newProgress, ...(newStatus ? { status: newStatus } : {}) } : null);
    startSaveTransition(async () => {
      try {
        await updateProgress({ userContentId: item.id, progress: newProgress });
      } catch (err) {
        console.error("진행도 변경 실패:", err);
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
        setItem((prev) => prev ? { ...prev, rating: reviewRating, review: reviewText, is_spoiler: isSpoiler } : null);
        if (result.unlockedTitles?.length) showUnlock(result.unlockedTitles);
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
        onProgressChange={handleProgressChange}
        onDelete={handleDelete}
      />

      <ArchiveDetailTabs
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onTabChange={setActiveTab}
        onSubTabChange={setActiveSubTab}
      />

      {activeTab === "feed" && <FeedSection contentId={contentId} subTab={activeSubTab} />}

      {activeTab === "myRecord" && activeSubTab === "review" && (
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

      {activeTab === "myRecord" && activeSubTab === "note" && (
        <div className="animate-fade-in">
          <NoteEditor contentId={contentId} />
        </div>
      )}

      {activeTab === "myRecord" && activeSubTab === "creation" && <CreationSection />}

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
