/*
  파일명: /components/features/user/detail/sections/MyReviewSection.tsx
  기능: 내 리뷰 작성/편집 섹션
  책임: 별점, 스포일러 여부, 리뷰 텍스트 입력 및 저장을 처리한다.
*/ // ------------------------------
"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";

interface MyReviewSectionProps {
  reviewText: string;
  reviewRating: number | null;
  isSpoiler: boolean;
  isSaving: boolean;
  onReviewTextChange: (text: string) => void;
  onRatingChange: (rating: number | null) => void;
  onSpoilerChange: (isSpoiler: boolean) => void;
  onSave: () => void;
}

export default function MyReviewSection({
  reviewText,
  reviewRating,
  isSpoiler,
  isSaving,
  onReviewTextChange,
  onRatingChange,
  onSpoilerChange,
  onSave,
}: MyReviewSectionProps) {
  const handleRatingChange = (star: number) => {
    onRatingChange(reviewRating === star ? null : star);
  };

  const handleSpoilerChange = (checked: boolean) => {
    onSpoilerChange(checked);
  };

  return (
    <div className="animate-fade-in">
      <Card className="p-0 mb-4">
        <div className="p-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
          <h3 className="font-semibold text-sm">내 리뷰</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  unstyled
                  key={star}
                  onClick={() => handleRatingChange(star)}
                  className={`text-lg ${
                    (reviewRating ?? 0) >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400/50"
                  }`}
                >
                  ★
                </Button>
              ))}
            </div>
            {reviewRating && <span className="text-xs font-medium text-yellow-400">{reviewRating}.0</span>}
          </div>
        </div>
        <div className="p-3">
          <textarea
            className="w-full h-40 bg-black/20 border border-border rounded-lg p-2.5 text-text-primary text-sm resize-y outline-none mb-3 font-sans focus:border-accent placeholder:text-text-secondary"
            placeholder="이 작품에 대한 생각을 자유롭게 기록해보세요."
            value={reviewText}
            onChange={(e) => onReviewTextChange(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["#판타지", "#성장", "+ 태그"].map((tag) => (
                <span
                  key={tag}
                  className="py-0.5 px-2 bg-white/5 border border-border rounded-full text-[11px] text-text-secondary cursor-pointer hover:border-accent hover:text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="flex items-center gap-1 cursor-pointer text-text-secondary text-[11px]">
                <input
                  type="checkbox"
                  className="w-3 h-3"
                  checked={isSpoiler}
                  onChange={(e) => handleSpoilerChange(e.target.checked)}
                />
                스포일러
              </label>
              <Button variant="primary" size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : "저장"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
