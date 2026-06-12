"use client";
/*
  ContentCard 슬롯 컴포넌트
  - SelectOverlay: 선택 모드 오버레이
  - StatsBadge: 인원 구성 뱃지
  - RatingBadge: 별점 뱃지
  - EditionToggle: BOOK 에디션 전환 (국문/영문)
*/
export { EditionToggle } from "./EditionToggle";

import { Check, Crown, User, Star } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

// #region SelectOverlay
export function SelectOverlay({ isSelected }: { isSelected: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${
        isSelected ? "bg-black/40" : "bg-transparent group-hover:bg-black/20"
      }`}
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isSelected
          ? "bg-accent shadow-[0_0_15px_rgba(212,175,55,0.5)]"
          : "border-2 border-white/60 bg-black/40 group-hover:border-white"
      }`}>
        {isSelected && <Check size={20} className="text-white" strokeWidth={3} />}
      </div>
    </div>
  );
}
// #endregion

// #region StatsBadge
export function StatsBadge({
  celebCount,
  userCount = 0,
  onClick,
}: {
  celebCount: number;
  userCount?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <div
      className="absolute bottom-1 left-1"
      style={{ zIndex: Z_INDEX.cardBadge }}
      onClick={handleClick}
    >
      <div className={`flex items-center gap-0.5 bg-black/70 backdrop-blur-sm px-1 py-0.5 md:px-1.5 rounded-md border border-white/10 shadow-lg ${onClick ? "hover:bg-accent hover:border-accent cursor-pointer group/stats" : ""}`}>
        <Crown size={9} className={`text-accent ${onClick ? "group-hover/stats:text-white" : ""}`} />
        <span className={`text-[9px] md:text-[10px] text-text-primary font-medium min-w-[10px] text-center ${onClick ? "group-hover/stats:text-white" : ""}`}>{celebCount}</span>
        <span className={`text-text-tertiary text-[9px] md:text-[10px] mx-px ${onClick ? "group-hover/stats:text-white/60" : ""}`}>|</span>
        <User size={9} className={`text-text-secondary ${onClick ? "group-hover/stats:text-white/80" : ""}`} />
        <span className={`text-[9px] md:text-[10px] text-text-primary font-medium min-w-[10px] text-center ${onClick ? "group-hover/stats:text-white" : ""}`}>{userCount}</span>
      </div>
    </div>
  );
}
// #endregion

// #region RatingBadge
export function RatingBadge({
  rating,
  onClick,
}: {
  rating: number | null;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (!onClick) return;
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  };

  const hasRating = rating !== null;

  return (
    <div
      className={`absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm px-1 py-0.5 md:px-1.5 rounded-md border border-white/10 shadow-lg ${onClick ? "cursor-pointer hover:bg-yellow-500 hover:border-yellow-500 group/rating" : ""}`}
      style={{ zIndex: Z_INDEX.cardBadge }}
      onClick={handleClick}
    >
      <Star size={9} className={hasRating ? `text-yellow-500 fill-yellow-500 ${onClick ? "group-hover/rating:text-white group-hover/rating:fill-white" : ""}` : `text-text-tertiary ${onClick ? "group-hover/rating:text-white" : ""}`} />
      <span className={`text-[9px] md:text-[10px] text-text-primary font-medium ${onClick ? "group-hover/rating:text-white" : ""}`}>{hasRating ? rating.toFixed(1) : "-"}</span>
    </div>
  );
}
// #endregion
