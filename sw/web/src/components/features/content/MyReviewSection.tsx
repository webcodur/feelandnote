/*
  파일명: /components/features/content/MyReviewSection.tsx
  기능: 내 리뷰 작성/편집 섹션
  책임: 별점, 스포일러 여부, 리뷰 텍스트 입력 및 저장을 처리한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { addContent } from "@/actions/contents/addContent";
import { updateReview } from "@/actions/contents/updateReview";
import { useSound } from "@/contexts/SoundContext";
import { useAchievement } from "@/components/features/profile/achievements";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";

interface MyReviewSectionProps {
  content: ContentDetailData["content"];
  userRecord: ContentDetailData["userRecord"];
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

export default function MyReviewSection({
  content,
  userRecord,
  onRecordChange,
}: MyReviewSectionProps) {
  const { playSound } = useSound();
  const { showUnlock } = useAchievement();
  const [isPending, startTransition] = useTransition();

  const [rating, setRating] = useState<number | null>(userRecord?.rating ?? null);
  const [review, setReview] = useState(userRecord?.review || "");
  const [isSpoiler, setIsSpoiler] = useState(userRecord?.isSpoiler ?? false);

  const hasRecord = !!userRecord;

  const handleRatingChange = (star: number) => {
    playSound("star");
    setRating(rating === star ? null : star);
  };

  const handleSpoilerChange = (checked: boolean) => {
    playSound("toggle");
    setIsSpoiler(checked);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        let userContentId = userRecord?.id;

        // 기록이 없으면 먼저 생성
        if (!userContentId) {
          const addResult = await addContent({
            id: content.id,
            type: content.type,
            title: content.title,
            creator: content.creator,
            thumbnailUrl: content.thumbnail,
            description: content.description,
            releaseDate: content.releaseDate,
            status: "FINISHED",
          });
          if (!addResult.success) {
            console.error("기록 생성 실패:", addResult.message);
            return;
          }
          userContentId = addResult.data.userContentId;
        }

        // 리뷰 저장
        const result = await updateReview({
          userContentId,
          rating,
          review: review || null,
          isSpoiler,
        });

        if (result.success) {
          onRecordChange({
            id: userContentId,
            status: userRecord?.status ?? "FINISHED",
            rating,
            review: review || null,
            isSpoiler,
            createdAt: userRecord?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          if (result.data.unlockedTitles?.length) {
            showUnlock(result.data.unlockedTitles);
          }
        }
      } catch (err) {
        console.error("리뷰 저장 실패:", err);
      }
    });
  };

  return (
    <div className="pt-4 space-y-3">
      {/* 별점 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">별점</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Button
                unstyled
                noSound
                key={star}
                onClick={() => handleRatingChange(star)}
                className={`text-lg ${(rating ?? 0) >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400/50"}`}
              >
                ★
              </Button>
            ))}
          </div>
          {rating && <span className="text-xs font-medium text-yellow-400">{rating}.0</span>}
        </div>
      </div>

      {/* 리뷰 텍스트 */}
      <textarea
        className="w-full h-32 bg-black/20 border border-border rounded-lg p-3 text-text-primary text-sm resize-y outline-none font-sans focus:border-accent placeholder:text-text-tertiary"
        placeholder="이 작품에 대한 생각을 자유롭게 기록해보세요."
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />

      {/* 하단: 스포일러 + 저장 */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary text-xs">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 rounded"
            checked={isSpoiler}
            onChange={(e) => handleSpoilerChange(e.target.checked)}
          />
          스포일러 포함
        </label>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : hasRecord ? "저장" : "등록"}
        </Button>
      </div>
    </div>
  );
}
