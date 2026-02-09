/*
  파일명: /components/shared/content/AddContentPopover.tsx
  기능: 콘텐츠 추가 버튼
  책임: Plus 버튼 클릭 시 바로 기록 추가 (상태 선택 UI 제거됨)
*/ // ------------------------------
"use client";

import { Plus, Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

interface AddContentPopoverProps {
  /** @deprecated status 파라미터는 무시됨. 리뷰 기반으로 전환. */
  onAdd: (status?: string) => void;
  isAdding?: boolean;
  isAdded?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 콘텐츠 추가 버튼
 * 기존에는 상태(WANT/FINISHED) 선택 팝오버였으나,
 * 리뷰 기반 전환으로 인해 단순 버튼으로 변경됨.
 */
export default function AddContentPopover({
  onAdd,
  isAdding = false,
  isAdded = false,
  size = "sm",
  className = "",
}: AddContentPopoverProps) {
  const iconSize = size === "sm" ? 12 : 14;
  const buttonPadding = size === "sm" ? "p-1" : "p-1.5";

  // 추가 완료 상태
  if (isAdded) {
    return (
      <div className={`${buttonPadding} rounded-md bg-green-500/80 text-white ${className}`}>
        <Check size={iconSize} />
      </div>
    );
  }

  return (
    <Button
      unstyled
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAdd();
      }}
      disabled={isAdding}
      className={`${buttonPadding} rounded-md bg-accent/80 text-white hover:bg-accent ${className}`}
      title="기록하기"
    >
      {isAdding ? <Loader2 size={iconSize} className="animate-spin" /> : <Plus size={iconSize} />}
    </Button>
  );
}
