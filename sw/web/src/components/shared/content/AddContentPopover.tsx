/*
  파일명: /components/shared/content/AddContentPopover.tsx
  기능: 콘텐츠 추가 버튼
  책임: Plus 버튼 클릭 시 바로 기록 추가 (상태 선택 UI 제거됨)
*/ // ------------------------------
"use client";

import { Plus, Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTranslations } from "next-intl";

interface AddContentPopoverProps {
  onAdd: (status?: string) => void;
  isAdding?: boolean;
  isAdded?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * 콘텐츠 추가 버튼
 * 기록만 담으면 감상 안함으로 저장하고, 작품 상세에서 감상 여부를 바꾼다.
 */
export default function AddContentPopover({
  onAdd,
  isAdding = false,
  isAdded = false,
  size = "sm",
  className = "",
}: AddContentPopoverProps) {
  const t = useTranslations("shared.content");
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
      title={t("addToRecord")}
    >
      {isAdding ? <Loader2 size={iconSize} className="animate-spin" /> : <Plus size={iconSize} />}
    </Button>
  );
}
