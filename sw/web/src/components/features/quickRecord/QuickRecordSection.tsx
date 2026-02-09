"use client";

import { useState, useEffect } from "react";
import { Star, X, Check } from "lucide-react";
import { useQuickRecord } from "@/contexts/QuickRecordContext";
import { Avatar } from "@/components/ui";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import Button from "@/components/ui/Button";

export default function QuickRecordSection() {
  const { targetContent, isOpen, closeQuickRecord } = useQuickRecord();
  const [rating, setRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 초기화
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setReview("");
    }
  }, [isOpen, targetContent]);

  if (!targetContent || !isOpen) return null;

  const handleStarClick = (score: number) => {
    setRating(score);
  };

  const handleSubmit = async () => {
    if (!targetContent) return;
    setIsSubmitting(true);

    try {
      // 별점 저장
      if (rating > 0) {
        await updateUserContentRating({
          userContentId: targetContent.id, 
          rating,
        });
      }

      // 리뷰 저장
      if (review.trim()) {
        await updateReview({
          userContentId: targetContent.id,
          review: review.trim(),
        });
      }

      closeQuickRecord();
    } catch (error) {
      console.error("기록 저장 실패:", error);
      alert("기록 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-bg-card border-b border-border/50 animate-in slide-in-from-top duration-300">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex items-start gap-4 md:gap-6">
          {/* 썸네일 */}
          <div className="shrink-0 w-16 h-24 md:w-20 md:h-28 rounded-lg shadow-lg overflow-hidden bg-bg-main">
            {targetContent.thumbnailUrl ? (
              <img 
                src={targetContent.thumbnailUrl} 
                alt={targetContent.title} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                <span className="text-xs">No Image</span>
              </div>
            )}
          </div>

          {/* 입력 폼 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-serif font-bold text-text-primary truncate">
                {targetContent.title}
              </h3>
              <button 
                onClick={closeQuickRecord}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-full hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-text-secondary mb-4">
              서재에 담겼습니다. 이 작품에 대한 기록을 남겨보세요.
            </p>

            <div className="flex flex-col gap-4">
              {/* 별점 입력 */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    className="p-1 -ml-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      size={28}
                      className={`${
                        rating >= star ? "text-yellow-500 fill-yellow-500" : "text-text-tertiary/30"
                      }`}
                      fill={rating >= star ? "currentColor" : "none"}
                    />
                  </button>
                ))}
                <span className="ml-2 text-lg font-semibold text-accent self-center">
                  {rating > 0 ? rating.toFixed(1) : ""}
                </span>
              </div>

              {/* 한줄평 입력 */}
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="짧은 감상을 남겨주세요 (선택)"
                className="w-full p-3 rounded-lg bg-bg-main border border-white/10 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm text-text-primary resize-none placeholder:text-text-tertiary/50"
                rows={2}
              />

              {/* 하단 버튼 */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={closeQuickRecord}
                  disabled={isSubmitting}
                >
                  나중에 하기
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? "저장 중..." : "기록 완료"}
                  {!isSubmitting && <Check size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
