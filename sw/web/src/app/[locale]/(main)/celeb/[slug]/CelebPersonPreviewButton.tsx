/* ─────────────────────────────────────────────
 * [celeb 상세] connections — 인물 미리보기 단추(공용)
 * - 목차 위치: connections (relations)
 * - 데이터: name/avatarUrl/onClick props
 * - 함께 보기: useCelebPreview.ts, RelationGraphSection.tsx
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

const avatarSizeClass = {
  compact: "h-14 w-14 md:h-18 md:w-18",
  large: "h-16 w-16 md:h-20 md:w-20",
  featured: "h-20 w-20 md:h-24 md:w-24",
} as const;

const avatarPixels = {
  compact: 72,
  large: 80,
  featured: 96,
} as const;

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
        "group flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-transparent px-1 py-1 text-center hover:border-accent/30 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:cursor-default",
        loading && "cursor-wait opacity-60",
        fullWidth ? "w-full" : "w-20 md:w-24",
        className,
      )}
    >
      <span
        className={cn(
          "relative overflow-hidden rounded-full bg-gradient-to-b from-accent/25 to-transparent p-[2px] shadow-lg group-hover:from-accent/70 group-hover:to-accent/35",
          avatarSizeClass[size],
          avatarFrameClassName,
        )}
        style={avatarFrameStyle}
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full border border-white/10 bg-bg-secondary group-hover:border-accent/35">
          {loading ? (
            <span className="flex h-full w-full items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </span>
          ) : avatarUrl ? (
            <BlurDissolve className="h-full w-full">
              <Image
                src={avatarUrl}
                alt={name}
                width={avatarPixels[size]}
                height={avatarPixels[size]}
                className="h-full w-full object-cover"
                unoptimized
              />
            </BlurDissolve>
          ) : (
            <span className="flex h-full w-full items-center justify-center font-serif text-base">
              {name.charAt(0)}
            </span>
          )}
        </span>
      </span>

      <span className="w-full space-y-0.5 text-center">
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
