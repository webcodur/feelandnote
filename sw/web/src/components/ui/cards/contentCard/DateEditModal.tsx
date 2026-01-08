/*
  파일명: /components/features/cards/DateEditModal.tsx
  기능: 날짜 수정 모달
  책임: 등록일/완료일을 수정하는 UI를 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

// #region 타입
interface DateEditModalProps {
  title: string;
  createdAt: string;
  completedAt: string | null;
  onClose: () => void;
  onSave: (createdAt: string, completedAt: string | null) => void;
}
// #endregion

// #region 유틸
function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}
// #endregion

export default function DateEditModal({
  title,
  createdAt,
  completedAt,
  onClose,
  onSave,
}: DateEditModalProps) {
  // #region 상태
  const [localCreatedAt, setLocalCreatedAt] = useState(formatDateForInput(createdAt));
  const [localCompletedAt, setLocalCompletedAt] = useState(formatDateForInput(completedAt));
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
        className="relative bg-bg-card border-t sm:border border-border sm:rounded-2xl rounded-t-2xl p-6 w-full sm:w-[90%] sm:max-w-sm shadow-2xl"
        style={{ zIndex: Z_INDEX.modal + 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-base mb-1">날짜 수정</h3>
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

        {/* 날짜 입력 */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-sm text-text-secondary mb-2">등록일</label>
            <input
              type="date"
              value={localCreatedAt}
              onChange={(e) => setLocalCreatedAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-border text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">완료일</label>
            <input
              type="date"
              value={localCompletedAt}
              onChange={(e) => setLocalCompletedAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-border text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1 py-3" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            className="flex-1 py-3"
            onClick={() => {
              const newCreatedAt = localCreatedAt ? new Date(localCreatedAt).toISOString() : createdAt;
              const newCompletedAt = localCompletedAt ? new Date(localCompletedAt).toISOString() : null;
              onSave(newCreatedAt, newCompletedAt);
              onClose();
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
