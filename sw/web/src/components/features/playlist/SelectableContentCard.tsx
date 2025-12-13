"use client";

import { Check, Plus, Minus } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

interface SelectableContentCardProps {
  item: UserContentWithContent;
  isSelected: boolean;
  isOriginal?: boolean;  // 수정 모드: 원래 포함되어 있던 항목
  onToggle: () => void;
}

export default function SelectableContentCard({
  item,
  isSelected,
  isOriginal = false,
  onToggle,
}: SelectableContentCardProps) {
  const content = item.content;

  // 상태에 따른 뱃지
  const getBadge = () => {
    if (isSelected && !isOriginal) {
      return { text: "추가", color: "bg-green-500", icon: Plus };
    }
    if (!isSelected && isOriginal) {
      return { text: "제거", color: "bg-red-500", icon: Minus };
    }
    if (isSelected && isOriginal) {
      return { text: "포함", color: "bg-blue-500", icon: Check };
    }
    return null;
  };

  const badge = getBadge();

  return (
    <div
      className={`group cursor-pointer transition-all duration-200 ${
        isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg-primary rounded-xl" : ""
      }`}
      onClick={onToggle}
    >
      <div className="relative rounded-xl overflow-hidden shadow-lg h-full flex flex-col bg-bg-card">
        {/* 썸네일 영역 */}
        <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-gray-800">
          {content.thumbnail_url ? (
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isSelected ? "brightness-75" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
              <span className="text-xs">No Image</span>
            </div>
          )}

          {/* 선택 체크 오버레이 */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              isSelected ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-lg">
              <Check size={28} className="text-white" strokeWidth={3} />
            </div>
          </div>

          {/* 상태 뱃지 */}
          {badge && (
            <div
              className={`absolute top-2 right-2 z-20 flex items-center gap-1 py-1 px-2 rounded-md text-[10px] font-bold text-white ${badge.color}`}
            >
              <badge.icon size={10} />
              {badge.text}
            </div>
          )}

          {/* 미선택 시 체크박스 */}
          {!isSelected && (
            <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-md border-2 border-white/50 bg-black/30 group-hover:border-white transition-colors" />
          )}

          {/* 선택됨 시 체크박스 */}
          {isSelected && (
            <div className="absolute top-2 left-2 z-20 w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-2 sm:p-3 flex-grow">
          <div className="font-semibold text-xs sm:text-sm mb-1 truncate">
            {content.title}
          </div>
          <div className="text-[10px] sm:text-xs text-text-secondary truncate">
            {content.creator || "\u00A0"}
          </div>
        </div>
      </div>
    </div>
  );
}
