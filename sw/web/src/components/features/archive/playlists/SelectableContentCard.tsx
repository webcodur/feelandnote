/*
  파일명: /components/features/playlist/SelectableContentCard.tsx
  기능: 선택 가능한 콘텐츠 카드
  책임: 재생목록 편집 시 콘텐츠 선택 UI 제공
*/ // ------------------------------
"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Z_INDEX } from "@/constants/zIndex";

interface SelectableContentCardProps {
  item: UserContentWithContent;
  isSelected: boolean;
  isOriginal?: boolean;
  onToggle: () => void;
}

export default function SelectableContentCard({
  item,
  isSelected,
  onToggle,
}: SelectableContentCardProps) {
  const content = item.content;

  return (
    <div
      className={`group cursor-pointer rounded-xl overflow-hidden shadow-lg h-full flex flex-col bg-bg-card ${
        isSelected ? "ring-2 ring-accent" : "hover:ring-1 hover:ring-border"
      }`}
      onClick={onToggle}
    >
      {/* 썸네일 영역 */}
      <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-gray-800">
        {content.thumbnail_url ? (
          <Image
            src={content.thumbnail_url}
            alt={content.title}
            fill
            unoptimized
            className={`object-cover ${isSelected ? "brightness-90" : "group-hover:scale-105"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
            <span className="text-xs">No Image</span>
          </div>
        )}

        {/* 체크박스 */}
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center ${
            isSelected
              ? "bg-accent"
              : "border-2 border-white/60 bg-black/30 group-hover:border-white"
          }`}
          style={{ zIndex: Z_INDEX.cardBadge }}
        >
          {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
        </div>
      </div>

      {/* 정보 영역 */}
      <div className="p-2 sm:p-3 flex-grow">
        <div className="font-semibold text-xs sm:text-sm mb-1 truncate">
          {content.title}
        </div>
        <div className="text-[10px] sm:text-xs text-text-secondary truncate">
          {content.creator?.replace(/\^/g, ', ') || "\u00A0"}
        </div>
      </div>
    </div>
  );
}
