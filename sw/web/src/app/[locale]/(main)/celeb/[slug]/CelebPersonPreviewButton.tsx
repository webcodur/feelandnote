/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 평가 인물 미리보기 카드(공용)
 * - 목차 위치: analysis (spectrum/influence)
 * - 데이터: name/avatarUrl/onClick props
 * - 함께 보기: spectrum/SpectrumMatchGroup.tsx, influence/RankingSection.tsx, influence/LeadersSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import BlurDissolve from "@/components/ui/BlurDissolve";

interface CelebPersonPreviewButtonProps {
  name: string;
  avatarUrl: string | null;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  ariaCurrent?: "true" | "page";
  size?: "compact" | "large" | "featured";
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  avatarFrameClassName?: string;
  avatarFrameStyle?: CSSProperties;
}

export default function CelebPersonPreviewButton({
  name,
  avatarUrl,
  onClick,
  loading = false,
  disabled = false,
  ariaCurrent,
  size = "compact",
  fullWidth = false,
  children,
  className,
  avatarFrameClassName,
  avatarFrameStyle,
}: CelebPersonPreviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-current={ariaCurrent}
      className={cn(
        "group flex cursor-pointer flex-col items-center overflow-hidden rounded-md border border-transparent p-0 text-center hover:border-accent/30 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:cursor-default",
        loading && "cursor-wait opacity-60",
        fullWidth ? "w-full" : "w-20 md:w-24",
        className,
      )}
    >
      <span
        className={cn(
          "relative block w-full shrink-0 overflow-hidden bg-bg-secondary",
          avatarFrameClassName,
        )}
        style={avatarFrameStyle}
      >
        {avatarUrl ? (
          <BlurDissolve className="w-full">
            <Image
              src={avatarUrl}
              alt={name}
              width={800}
              height={800}
              className="block h-auto w-full"
              unoptimized
            />
          </BlurDissolve>
        ) : (
          <span className="flex aspect-square w-full items-center justify-center font-serif text-2xl">
            {name.charAt(0)}
          </span>
        )}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </span>
        )}
      </span>

      <span className="w-full space-y-0.5 px-1.5 pb-3 pt-1 text-center md:px-2 md:pb-3.5">
        <span
          className={cn(
            "flex w-full items-center justify-center text-center",
            size === "featured" ? "h-11" : "h-10",
          )}
        >
          <span
            className={cn(
              "line-clamp-2 text-balance break-keep font-serif font-bold leading-tight text-text-primary group-hover:text-accent",
              size === "featured"
                ? "text-sm md:text-[15px]"
                : "text-xs",
            )}
          >
            {name}
          </span>
        </span>
        {children}
      </span>
    </button>
  );
}
