"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import ArchiveDetailHeader from "./ArchiveDetailHeader";
import ArchiveDetailTabs, { type MainTab, type SubTab } from "./ArchiveDetailTabs";
import FeedSection from "./FeedSection";
import MyReviewSection from "./MyReviewSection";
import CreationSection from "./CreationSection";
import CreateCreationModal from "@/components/features/archive/CreateCreationModal";
import NoteEditor from "@/components/features/archive/NoteEditor";
import { getContent, type UserContentWithDetails } from "@/actions/contents/getContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { updateProgress } from "@/actions/contents/updateProgress";
import { removeContent } from "@/actions/contents/removeContent";
import { getRecords, createRecord, updateRecord } from "@/actions/records";
import { getProfile } from "@/actions/user";
import { generateReviewExample } from "@/actions/ai";
import type { ContentStatus } from "@/actions/contents/addContent";
import { useAchievement } from "@/components/features/achievements";

interface RecordData {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
}

export default function ArchiveDetailView() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  const { showUnlock } = useAchievement();

  const [activeTab, setActiveTab] = useState<MainTab>("myRecord");
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("review");
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [item, setItem] = useState<UserContentWithDetails | null>(null);
  const [myReview, setMyReview] = useState<RecordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [contentData, reviewsData, profile] = await Promise.all([
          getContent(contentId),
          getRecords({ contentId, type: 'REVIEW' }).catch(() => []),
          getProfile(),
        ]);
        setItem(contentData);
        setHasApiKey(!!profile?.gemini_api_key);
        const reviewRecord = reviewsData.find(r => r.type === 'REVIEW');
        if (reviewRecord) {
          setMyReview(reviewRecord as unknown as RecordData);
          setReviewText(reviewRecord.content || "");
          setReviewRating(reviewRecord.rating);
        }
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
    if (newProgress === 100) newStatus = 'COMPLETE';
    else if (newProgress < 100 && item.status === 'COMPLETE') newStatus = 'EXPERIENCE';
    else if (newProgress > 0 && item.status === 'WISH') newStatus = 'EXPERIENCE';

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
    startSaveTransition(async () => {
      try {
        if (myReview) {
          await updateRecord({ recordId: myReview.id, content: reviewText || undefined, rating: reviewRating ?? undefined });
          setMyReview((prev) => prev ? { ...prev, content: reviewText, rating: reviewRating, updated_at: new Date().toISOString() } : null);
        } else {
          const result = await createRecord({ contentId, type: 'REVIEW', content: reviewText || '', rating: reviewRating ?? undefined });
          const records = await getRecords({ contentId, type: 'REVIEW' });
          const reviewRecord = records.find(r => r.type === 'REVIEW');
          if (reviewRecord) setMyReview(reviewRecord as unknown as RecordData);
          if (result.unlockedTitles?.length) showUnlock(result.unlockedTitles);
        }
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
          myReview={myReview}
          isSaving={isSaving}
          onReviewTextChange={setReviewText}
          onRatingChange={setReviewRating}
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
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent flex items-center justify-center shadow-lg z-20 hover:scale-110 hover:bg-accent-hover"
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
