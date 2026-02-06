/*
  별점 수정 모달
  - 별 영역 클릭/드래그로 0.5점 단위 조정
  - 반별 지원 (half star)
*/
"use client";

import { useState, useRef } from "react";
import { Star } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

interface RatingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentTitle: string;
  currentRating: number | null;
  onSave: (rating: number | null) => Promise<void>;
}

// 별 하나의 채움 상태 계산
function getStarFill(starIndex: number, value: number | null): "full" | "half" | "empty" {
  if (!value) return "empty";
  const starValue = starIndex + 1;
  if (value >= starValue) return "full";
  if (value >= starValue - 0.5) return "half";
  return "empty";
}

// 0.5 단위로 반올림
function snapToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export default function RatingEditModal({
  isOpen,
  onClose,
  contentTitle,
  currentRating,
  onSave,
}: RatingEditModalProps) {
  const [rating, setRating] = useState<number | null>(currentRating);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const starsRef = useRef<HTMLDivElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(rating);
    setIsSaving(false);
    onClose();
  };

  // 별 영역에서 X 좌표 → 0.5~5.0 계산
  const calculateRatingFromX = (clientX: number) => {
    if (!starsRef.current) return null;
    const rect = starsRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const value = 0.5 + ratio * 4.5; // 0.5 ~ 5.0
    return snapToHalf(value);
  };

  // 마우스 드래그
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const newRating = calculateRatingFromX(e.clientX);
    if (newRating !== null) setRating(newRating);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newRating = calculateRatingFromX(e.clientX);
    if (newRating !== null) setRating(newRating);
  };

  // 터치 드래그
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const newRating = calculateRatingFromX(e.touches[0].clientX);
    if (newRating !== null) setRating(newRating);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const newRating = calculateRatingFromX(e.touches[0].clientX);
    if (newRating !== null) setRating(newRating);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="별점 수정" size="sm">
      <ModalBody className="space-y-4">
        <div className="text-center pb-3 border-b border-border/30">
          <p className="text-sm text-text-secondary line-clamp-2">{contentTitle}</p>
        </div>

        {/* 별점 선택: 클릭 또는 드래그로 0.5점 단위 조정 */}
        <div
          ref={starsRef}
          className={`flex justify-center gap-2 py-4 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          {[0, 1, 2, 3, 4].map((starIndex) => {
            const ratingFill = getStarFill(starIndex, rating);

            return (
              <div key={starIndex} className="relative w-9 h-9">
                {/* 기본 빈 별 (배경) */}
                <Star size={36} className="absolute inset-0 text-text-tertiary/30" strokeWidth={1.5} />

                {/* 현재 값: 채움 (fill) */}
                {ratingFill !== "empty" && (
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: ratingFill === "full" ? "100%" : "50%" }}
                  >
                    <Star size={36} className="text-yellow-500 fill-yellow-500" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 점수 표시 */}
        <div className="text-center">
          <span className="text-4xl font-black font-serif text-accent tracking-tight drop-shadow-sm">
            {rating !== null ? rating.toFixed(1) : "-"}
          </span>
          <span className="text-base font-serif text-text-tertiary ml-1">/ 5</span>
        </div>
      </ModalBody>

      <ModalFooter className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex-1 py-2.5 px-5 text-sm font-semibold rounded-sm border border-border text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
        >
          취소
        </button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
