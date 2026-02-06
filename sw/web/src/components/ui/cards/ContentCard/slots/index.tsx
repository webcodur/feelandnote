/*
  ContentCard 슬롯 컴포넌트
  - TypeLabel: 좌상단 카테고리 레이블
  - SelectOverlay: 선택 모드 오버레이
  - RecommendButton: 추천 버튼
  - StatsBadge: 인원 구성 뱃지
  - RatingBadge: 별점 뱃지
*/
"use client";

import { Check, Gift, Crown, User, Star, Bookmark, Trash2 } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import { TYPE_ICONS } from "../constants";
import type { ContentType } from "@/types/database";

// #region TypeLabel
export function TypeLabel({ type, onOpen }: { type: ContentType; onOpen: () => void }) {
  const Icon = TYPE_ICONS[type];
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }}
      className="absolute top-1.5 left-1.5 md:top-2 md:left-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-accent/40 shadow-lg hover:bg-accent hover:border-accent group/type"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Icon size={14} className="text-accent group-hover/type:text-white" strokeWidth={2} />
    </button>
  );
}
// #endregion

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

// #region RecommendButton
export function RecommendButton({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center backdrop-blur-sm rounded-md shadow-lg bg-black/70 border border-accent/50 hover:bg-accent hover:border-accent group/rec"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Gift size={14} className="text-accent group-hover/rec:text-white" strokeWidth={2} />
    </button>
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
      className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2"
      style={{ zIndex: Z_INDEX.cardBadge }}
      onClick={handleClick}
    >
      <div className={`flex items-center gap-0.5 md:gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border border-white/10 shadow-lg ${onClick ? "hover:bg-accent hover:border-accent cursor-pointer group/stats" : ""}`}>
        <Crown size={10} className={`text-accent ${onClick ? "group-hover/stats:text-white" : ""}`} />
        <span className={`text-[10px] md:text-xs text-text-primary font-medium min-w-[10px] text-center ${onClick ? "group-hover/stats:text-white" : ""}`}>{celebCount}</span>
        <span className={`text-text-tertiary text-[10px] md:text-xs mx-px ${onClick ? "group-hover/stats:text-white/60" : ""}`}>|</span>
        <User size={10} className={`text-text-secondary ${onClick ? "group-hover/stats:text-white/80" : ""}`} />
        <span className={`text-[10px] md:text-xs text-text-primary font-medium min-w-[10px] text-center ${onClick ? "group-hover/stats:text-white" : ""}`}>{userCount}</span>
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
      className={`absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 flex items-center gap-0.5 md:gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border border-white/10 shadow-lg ${onClick ? "cursor-pointer hover:bg-yellow-500 hover:border-yellow-500 group/rating" : ""}`}
      style={{ zIndex: Z_INDEX.cardBadge }}
      onClick={handleClick}
    >
      <Star size={10} className={hasRating ? `text-yellow-500 fill-yellow-500 ${onClick ? "group-hover/rating:text-white group-hover/rating:fill-white" : ""}` : `text-text-tertiary ${onClick ? "group-hover/rating:text-white" : ""}`} />
      <span className={`text-[10px] md:text-xs text-text-primary font-medium ${onClick ? "group-hover/rating:text-white" : ""}`}>{hasRating ? rating.toFixed(1) : "-"}</span>
    </div>
  );
}
// #endregion

// #region DeleteButton
export function DeleteButton({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(e); }}
      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-red-500/50 shadow-lg hover:bg-red-500 hover:border-red-500 group/del"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Trash2 size={13} className="text-red-400 group-hover/del:text-white" strokeWidth={2} />
    </button>
  );
}
// #endregion

// #region SavedBadge
export function SavedBadge() {
  return (
    <div
      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-accent rounded-md shadow-lg"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Bookmark size={14} className="text-white fill-white" strokeWidth={2} />
    </div>
  );
}
// #endregion

// #region AddButton
export function AddButton({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick?.(e); }}
      className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-md border border-white/30 shadow-lg hover:bg-accent hover:border-accent group/add"
      style={{ zIndex: Z_INDEX.cardBadge }}
    >
      <Bookmark size={14} className="text-white/70 group-hover/add:text-white" strokeWidth={2} />
    </button>
  );
}
// #endregion
