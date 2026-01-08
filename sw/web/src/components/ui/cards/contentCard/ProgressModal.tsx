/*
  파일명: /components/features/cards/ProgressModal.tsx
  기능: 콘텐츠 진행도 수정 모달
  책임: 진행도 슬라이더와 추천 토글 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { X } from "lucide-react";

import { ProgressSlider } from "@/components/ui";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

// #region 타입
interface ProgressModalProps {
  title: string;
  value: number;
  isRecommended?: boolean;
  onClose: () => void;
  onSave: (value: number) => void;
  onRecommendChange?: (isRecommended: boolean) => void;
}
// #endregion

export default function ProgressModal({
  title,
  value,
  isRecommended = false,
  onClose,
  onSave,
  onRecommendChange,
}: ProgressModalProps) {
  // #region 상태
  const [localValue, setLocalValue] = useState(value);
  const [localRecommended, setLocalRecommended] = useState(isRecommended);
  // #endregion

  // #region 렌더링
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/70" />

      {/* 모달 컨텐츠 */}
      <div
        className="relative bg-bg-card border-t sm:border border-border sm:rounded-2xl rounded-t-2xl p-6 w-full sm:w-[90%] sm:max-w-md shadow-2xl"
        style={{ zIndex: Z_INDEX.modal + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-base mb-1">진행도 수정</h3>
            <p className="text-sm text-text-secondary truncate">{title}</p>
          </div>
          <Button
            unstyled
            type="button"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/10"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* 현재 값 표시 */}
        <div className="text-center my-6">
          <span className="text-4xl font-bold text-primary">{localValue}</span>
          <span className="text-xl text-text-secondary ml-1">%</span>
        </div>

        {/* 슬라이더 */}
        <div className="mb-5 px-1">
          <ProgressSlider value={localValue} onChange={setLocalValue} height="md" />
        </div>

        {/* 추천 여부 선택 (항상 표시, 100% 미만에서는 비활성) */}
        {onRecommendChange && (
          <div className={`mb-5 p-3 rounded-xl border border-border relative ${localValue === 100 ? "bg-white/5" : "bg-white/5"}`}>
            
            <label className={`flex items-center justify-between ${localValue === 100 ? "cursor-pointer" : "cursor-not-allowed"}`}>
              <span className="text-sm font-medium">이 콘텐츠를 추천하시겠어요?</span>
              <Button
                unstyled
                type="button"
                disabled={localValue < 100}
                className={`w-12 h-7 rounded-full relative ${localRecommended ? "bg-pink-500" : "bg-white/20"}`}
                onClick={() => localValue === 100 && setLocalRecommended(!localRecommended)}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow ${localRecommended ? "right-1" : "left-1"}`}
                />
              </Button>
            </label>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 py-3" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            className="flex-1 py-3"
            onClick={() => {
              onSave(localValue);
              if (localValue === 100 && onRecommendChange) {
                onRecommendChange(localRecommended);
              }
            }}
          >
            저장
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
  // #endregion
}
