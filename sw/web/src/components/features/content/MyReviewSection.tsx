/*
  파일명: /components/features/content/MyReviewSection.tsx
  기능: 내 리뷰 작성/편집 섹션
  책임: 별점, 스포일러 여부, 리뷰 텍스트 입력 및 저장을 처리한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { updateReview } from "@/actions/contents/updateReview";
import { useSound } from "@/contexts/SoundContext";
import { useAchievement } from "@/components/features/profile/achievements";

interface MyReviewSectionProps {
  userContentId: string;
  initialRating: number | null;
  initialReview: string | null;
  initialIsSpoiler: boolean;
  onUpdate: (data: { rating: number | null; review: string | null; isSpoiler: boolean }) => void;
}

export default function MyReviewSection({
  userContentId,
  initialRating,
  initialReview,
  initialIsSpoiler,
  onUpdate,
}: MyReviewSectionProps) {
  const { playSound } = useSound();
  const { showUnlock } = useAchievement();
  const [isPending, startTransition] = useTransition();

  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview || "");
  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);

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
        const result = await updateReview({
          userContentId,
          rating,
          review: review || null,
          isSpoiler,
        });
        if (result.success) {
          onUpdate({ rating, review: review || null, isSpoiler });
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
          {isPending ? <Loader2 size={14} className="animate-spin" /> : "저장"}
        </Button>
      </div>
    </div>
  );
}
