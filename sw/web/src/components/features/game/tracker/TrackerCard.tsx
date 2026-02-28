/*
  파일명: components/features/game/tracker/TrackerCard.tsx
  기능: 미궁(Tracker) 게임 전용 카드 UI
  디자인: 원형 이미지 + 이름, 선택/발각/도주/배제 상태, 배제용 X 뱃지
*/
"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackerCardProps {
  imageUrl?: string | null;
  name: string;
  status?: "normal" | "win" | "lose" | "selected" | "eliminated";
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

export default function TrackerCard({
  imageUrl,
  name,
  status = "normal",
  onClick,
  className,
}: TrackerCardProps) {
  const borderClass = {
    normal: "border-border/60 hover:border-accent",
    win: "border-green-500/80 shadow-green-500/20",
    lose: "border-red-500/80 shadow-red-500/20",
    selected: "border-accent shadow-accent/30 scale-[1.02]",
    eliminated: "border-red-500/30",
  };

  return (
    <div
      onClick={status === "eliminated" ? undefined : onClick}
      className={cn(
        "group flex flex-col items-center",
        status === "eliminated"
          ? "opacity-20 grayscale pointer-events-none"
          : onClick ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {/* 원형 이미지 */}
      <div className="relative w-full">
        <div
          className={cn(
            "relative aspect-square w-full rounded-full overflow-hidden",
            "border-2 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5",
            "transition-transform duration-200 active:scale-95",
            borderClass[status],
          )}
          style={{ background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)" }}
        >
          {/* 노이즈 텍스처 */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          {/* 후광 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[20px] opacity-40 transition-all duration-700 pointer-events-none mix-blend-screen z-0 group-hover:opacity-100 group-hover:scale-125 group-hover:bg-accent/40" />

          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 25vw, 240px"
              className="object-cover object-top relative z-10 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <span className="text-2xl md:text-4xl font-serif text-border font-bold opacity-30">
                {name.charAt(0)}
              </span>
            </div>
          )}

          {/* 선택됨 효과 */}
          {status === "selected" && (
            <div className="absolute inset-0 ring-2 ring-accent/50 rounded-full animate-pulse pointer-events-none z-20" />
          )}
          {/* 배제됨 X 오버레이 */}
          {status === "eliminated" && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <X className="w-1/2 h-1/2 text-red-500/60 stroke-[3]" />
            </div>
          )}
        </div>


      </div>

      {/* 이름 */}
      <div className="mt-1.5 md:mt-2 flex flex-col items-center text-center w-full">
        <h3 className={cn(
          "font-serif font-bold text-white leading-tight word-keep-all",
          name.length > 8 ? "text-[11px] md:text-sm line-clamp-2" : "text-xs md:text-base line-clamp-1"
        )}>
          {name}
        </h3>
      </div>
    </div>
  );
}
