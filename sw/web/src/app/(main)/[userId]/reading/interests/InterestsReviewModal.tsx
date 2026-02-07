/*
  파일명: /app/(main)/[userId]/reading/interests/InterestsReviewModal.tsx
  기능: 관심 콘텐츠 리뷰 모달
  책임: 선택된 콘텐츠의 별점, 리뷰를 모달로 입력/수정할 수 있는 UI를 제공한다.
*/
"use client";

import { useState, useEffect, useTransition } from "react";
import { Star, Check, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { updateReview } from "@/actions/contents/updateReview";
import { updateStatus } from "@/actions/contents/updateStatus";
import { getCategoryByDbType } from "@/constants/categories";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

interface InterestsReviewModalProps {
  selectedContent: UserContentWithContent | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

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
          <button
            type="button"
            className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
            onMouseEnter={() => setHoverValue(starIndex + 0.5)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={() => handleClick(starIndex, true)}
          />
          <button
            type="button"
            className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
            onMouseEnter={() => setHoverValue(starIndex + 1)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={() => handleClick(starIndex, false)}
          />
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

export default function InterestsReviewModal({
  selectedContent,
  isOpen,
  onClose,
  onSaved,
}: InterestsReviewModalProps) {
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

  const content = selectedContent?.content;

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
        setError(result.message ?? "저장에 실패했다.");
        return;
      }

      onSaved();
      onClose();
    });
  };

  const handleMarkWatched = () => {
    if (!selectedContent) return;
    if (!window.confirm(`'${selectedContent.content.title}'을(를) 감상함으로 처리할까요?`)) return;

    setError(null);
    startTransition(async () => {
      try {
        const reviewResult = await updateReview({
          userContentId: selectedContent.id,
          rating,
          review: review.trim() || null,
          isSpoiler,
        });
        if (!reviewResult.success) {
          setError(reviewResult.message ?? "리뷰 저장에 실패했다.");
          return;
        }

        await updateStatus({ userContentId: selectedContent.id, status: "FINISHED" });
        onSaved();
        onClose();
      } catch {
        setError("상태 변경에 실패했다.");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="리뷰 작성" size="md">
      <ModalBody>
        {/* 헤더: 썸네일 + 제목 */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative w-16 h-22 flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary">
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
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-text-primary truncate">
              {content?.title}
            </h3>
            {content?.creator && (
              <p className="text-sm text-text-secondary truncate mt-0.5">
                {content.creator.replace(/\^/g, ", ")}
              </p>
            )}
            {selectedContent && (
              <Link
                href={`/content/${selectedContent.content_id}?category=${getCategoryByDbType(selectedContent.content.type)?.id || "book"}`}
                className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-accent mt-1.5"
              >
                <ExternalLink size={12} />
                상세 정보 보기
              </Link>
            )}
          </div>
        </div>

        {/* 별점 입력 */}
        <div className="mb-5">
          <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
            Rating
          </label>
          <StarRatingInput value={rating} onChange={setRating} />
        </div>

        {/* 리뷰 입력 */}
        <div className="mb-4">
          <label className="block text-xs text-text-tertiary uppercase tracking-wider mb-2">
            Review
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="이 작품에 대한 생각을 남겨보세요..."
            className="w-full h-24 px-3 py-2 bg-bg-secondary border border-border/50 rounded-lg text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* 스포일러 체크박스 */}
        <label className="flex items-center gap-2 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            className="w-4 h-4 rounded border-border/50 bg-bg-secondary text-accent focus:ring-accent/50"
          />
          <span className="text-sm text-text-secondary">스포일러 포함</span>
        </label>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mt-4">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="ghost"
          size="md"
          onClick={onClose}
          disabled={isPending}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : "저장"}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleMarkWatched}
          disabled={isPending}
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
      </ModalFooter>
    </Modal>
  );
}
