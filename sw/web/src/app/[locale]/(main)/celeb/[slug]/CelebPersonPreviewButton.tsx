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
  size?: "compact" | "large";
  children?: ReactNode;
  className?: string;
  avatarFrameClassName?: string;
  avatarFrameStyle?: CSSProperties;
}

const avatarSizeClass = {
  compact: "h-14 w-14 md:h-18 md:w-18",
  large: "h-16 w-16 md:h-20 md:w-20",
} as const;

const avatarPixels = {
  compact: 72,
  large: 80,
} as const;

export default function CelebPersonPreviewButton({
  name,
  avatarUrl,
  onClick,
  loading = false,
  size = "compact",
  children,
  className,
  avatarFrameClassName,
  avatarFrameStyle,
}: CelebPersonPreviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        "group flex w-20 cursor-pointer flex-col items-center gap-1.5 rounded-md border border-transparent px-1 py-1 text-center hover:border-accent/30 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait md:w-24",
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
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
        <span className="flex h-10 w-full items-center justify-center text-center">
          <span className="line-clamp-2 text-balance break-keep font-serif text-xs font-bold leading-tight text-text-primary group-hover:text-accent">
            {name}
          </span>
        </span>
        {children}
      </span>
    </button>
  );
}
