/*
  파일명: /components/shared/CelebDetailCardButton.tsx
  기능: 셀럽 상세 카드/모달을 여는 공용 아이콘 버튼
  책임: 서비스 전역에서 같은 인물 카드 아이콘과 조작 상태를 사용하게 한다.
*/

"use client";

import type { ButtonHTMLAttributes } from "react";
import { ContactRound, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type CelebDetailCardButtonSize = "compact" | "stretch" | "rail" | "panel";

interface CelebDetailCardButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> {
  label: string;
  loading?: boolean;
  iconSize?: number;
  size?: CelebDetailCardButtonSize;
  showLabel?: boolean;
}

const SIZE_CLASSES: Record<CelebDetailCardButtonSize, string> = {
  compact: "h-8 w-8 rounded-md",
  stretch: "min-h-8 flex-1 rounded-md py-2",
  rail: "h-[46px] w-[46px] rounded-md",
  panel: "min-h-11 w-full gap-2 rounded-xl px-4 text-sm font-black",
};

const BASE_CLASSES =
  "inline-flex shrink-0 cursor-pointer items-center justify-center border border-white/15 bg-black/60 text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-wait disabled:opacity-50";

export default function CelebDetailCardButton({
  label,
  loading = false,
  iconSize = 16,
  size = "compact",
  showLabel = false,
  className,
  disabled,
  ...props
}: CelebDetailCardButtonProps) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      title={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(BASE_CLASSES, SIZE_CLASSES[size], className)}
    >
      {loading ? (
        <LoaderCircle size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : (
        <ContactRound size={iconSize} strokeWidth={2} aria-hidden="true" />
      )}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
