/*
  파일명: /app/(main)/[userId]/interests/InterestsEditPanel.tsx
  기능: 관심 콘텐츠 편집 패널
  책임: 선택된 콘텐츠의 별점, 리뷰를 입력/수정할 수 있는 UI를 제공한다.
*/
"use client";

import { useState, useEffect, useTransition } from "react";
import { Star, X, Check, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import { updateReview } from "@/actions/contents/updateReview";
import { updateStatus } from "@/actions/contents/updateStatus";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface InterestsEditPanelProps {
  selectedContent: UserContentWithContent | null;
  onClose: () => void;
  onSaved: () => void;
}
// #endregion

// #region 별점 입력 컴포넌트
function StarRatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value ?? 0;

  const handleClick = (starIndex: number, isHalf: boolean) => {
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange(newRating === value ? null : newRating);
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((starIndex) => (
        <div key={starIndex} className="relative w-7 h-7">
          {/* 왼쪽 절반 (0.5점) */}
          <button
            type="button"
            className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
            onMouseEnter={() => setHoverValue(starIndex + 0.5)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={() => handleClick(starIndex, true)}
          />
          {/* 오른쪽 절반 (1점) */}
          <button
            type="button"
            className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
            onMouseEnter={() => setHoverValue(starIndex + 1)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={() => handleClick(starIndex, false)}
          />
          {/* 별 아이콘 */}
          <div className="absolute inset-0 pointer-events-none">
            <Star
              size={28}
              className={`absolute inset-0 ${
                displayValue >= starIndex + 1
                  ? "text-accent fill-accent"
                  : displayValue >= starIndex + 0.5
                    ? "text-accent"
                    : "text-text-tertiary"
              }`}
              style={{
                clipPath:
                  displayValue >= starIndex + 1
                    ? undefined
                    : displayValue >= starIndex + 0.5
                      ? "inset(0 50% 0 0)"
                      : undefined,
              }}
            />
            {displayValue >= starIndex + 0.5 && displayValue < starIndex + 1 && (
              <Star
                size={28}
                className="absolute inset-0 text-accent fill-accent"
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            )}
          </div>
        </div>
      ))}
      {value && (
        <span className="ml-2 text-sm text-accent font-bold">{value}</span>
      )}
    </div>
  );
}
// #endregion

export default function InterestsEditPanel({
  selectedContent,
  onClose,
  onSaved,
}: InterestsEditPanelProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 선택된 콘텐츠가 변경되면 폼 초기화
  useEffect(() => {
    if (selectedContent) {
      setRating(selectedContent.rating ?? null);
      setReview(selectedContent.review ?? "");
      setIsSpoiler(selectedContent.is_spoiler ?? false);
      setError(null);
    }
  }, [selectedContent]);

  const handleSave = () => {
    if (!selectedContent) return;

    setError(null);
    startTransition(async () => {
      const result = await updateReview({
        userContentId: selectedContent.id,
        rating,
        review: review.trim() || null,
        isSpoiler,
      });

      if (!result.success) {
        setError(result.error?.message ?? "저장에 실패했다.");
        return;
      }

      onSaved();
    });
  };

  const handleMarkWatched = () => {
    if (!selectedContent) return;
    if (!window.confirm(`'${selectedContent.content.title}'을(를) 감상함으로 처리할까?`)) return;

    setError(null);
    startTransition(async () => {
      try {
        // 리뷰/별점 먼저 저장
        const reviewResult = await updateReview({
          userContentId: selectedContent.id,
          rating,
          review: review.trim() || null,
          isSpoiler,
        });
        if (!reviewResult.success) {
          setError(reviewResult.error?.message ?? "리뷰 저장에 실패했다.");
          return;
        }

        // 상태 변경
        await updateStatus({ userContentId: selectedContent.id, status: "FINISHED" });
        onSaved();
        onClose();
      } catch {
        setError("상태 변경에 실패했다.");
      }
    });
  };

  const isActive = !!selectedContent;
  const content = selectedContent?.content;

  return (
    <ClassicalBox
      className={`p-4 sm:p-6 mb-6 ${
        isActive
          ? "bg-bg-card/40 border-accent/30 shadow-lg"
          : "bg-bg-card/30 border-accent-dim/20"
      }`}
    >
      <div className="flex justify-center mb-5">
        <DecorativeLabel label="리뷰 작성" />
      </div>
      {/* 헤더 */}
      <div className="flex items-start gap-4 mb-5">
        {/* 썸네일 */}
        <div
          className={`relative w-16 h-22 flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary ${
            !isActive ? "opacity-50" : ""
          }`}
        >
          {content?.thumbnail_url ? (
            <Image
              src={content.thumbnail_url}
              alt={content.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Star size={20} className="text-text-tertiary" />
            </div>
          )}
        </div>

        {/* 제목 및 작가 */}
        <div className="flex-1 min-w-0">
          {isActive ? (
            <>
              <h3 className="text-base font-semibold text-text-primary truncate">
                {content?.title}
              </h3>
              {content?.creator && (
                <p className="text-sm text-text-secondary truncate mt-0.5">
                  {content.creator.replace(/\^/g, ", ")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-tertiary mt-2">
              카드를 클릭하여 선택
            </p>
          )}
        </div>

        {/* 닫기 버튼 */}
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0 -mt-1 -mr-1"
          >
            <X size={18} />
          </Button>
        )}
      </div>

      {/* 별점 입력 */}
      <div className={`mb-5 ${!isActive ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
          Rating
        </label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>

      {/* 리뷰 입력 */}
      <div className={`mb-4 ${!isActive ? "opacity-50 pointer-events-none" : ""}`}>
        <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
          Review
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="이 작품에 대한 생각을 남겨보세요..."
          disabled={!isActive}
          className="w-full h-24 px-3 py-2 bg-bg-secondary border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-accent/50 disabled:cursor-not-allowed"
        />
      </div>

      {/* 스포일러 체크박스 */}
      <label
        className={`flex items-center gap-2 mb-5 select-none ${
          isActive ? "cursor-pointer" : "opacity-50 pointer-events-none"
        }`}
      >
        <input
          type="checkbox"
          checked={isSpoiler}
          onChange={(e) => setIsSpoiler(e.target.checked)}
          disabled={!isActive}
          className="w-4 h-4 rounded border-border/50 bg-bg-secondary text-accent focus:ring-accent/50"
        />
        <span className="text-sm text-text-secondary">스포일러 포함</span>
      </label>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="md"
          onClick={onClose}
          disabled={isPending || !isActive}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleMarkWatched}
          disabled={isPending || !isActive}
          className="flex-1"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Check size={16} />
              감상함
            </>
          )}
        </Button>
      </div>
    </ClassicalBox>
  );
}
