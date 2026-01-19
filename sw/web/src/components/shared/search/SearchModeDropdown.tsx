/*
  파일명: /components/features/search/SearchModeDropdown.tsx
  기능: 검색 모드 및 카테고리 선택 드롭다운
  책임: 콘텐츠/사용자/태그/기록관 검색 모드와 카테고리 필터 제공
*/ // ------------------------------
"use client";

import { Book, User, Hash, Folder, ChevronDown } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

export type SearchMode = "content" | "user" | "tag" | "records";
export type ContentCategory = CategoryId;

export interface SearchModeConfig {
  id: SearchMode;
  label: string;
  icon: React.ElementType;
  placeholder: string;
}

export const SEARCH_MODES: SearchModeConfig[] = [
  { id: "content", label: "콘텐츠", icon: Book, placeholder: "작품명, 저자, 감독..." },
  { id: "user", label: "사용자", icon: User, placeholder: "닉네임, @username..." },
  { id: "tag", label: "태그", icon: Hash, placeholder: "태그명..." },
  { id: "records", label: "내 기록", icon: Folder, placeholder: "내 기록에서 검색..." },
];

// CATEGORIES를 그대로 사용
export const CONTENT_CATEGORIES = CATEGORIES;

interface SearchModeDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  mode: SearchMode;
  contentCategory: ContentCategory;
  onModeChange: (mode: SearchMode) => void;
  onCategoryChange: (category: ContentCategory) => void;
  onClose: () => void;
}

export default function SearchModeDropdown({
  isOpen,
  onToggle,
  mode,
  contentCategory,
  onModeChange,
  onCategoryChange,
  onClose,
}: SearchModeDropdownProps) {
  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;

  const DisplayIcon = mode === "content" ? currentCategory.icon : currentMode.icon;
  const displayLabel = mode === "content" ? currentCategory.label : currentMode.label;

  const handleCategorySelect = (category: ContentCategory) => {
    onModeChange("content");
    onCategoryChange(category);
    onClose();
  };

  const handleModeSelect = (modeId: SearchMode) => {
    onModeChange(modeId);
    onClose();
  };

  return (
    <div className="relative">
      <Button
        unstyled
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 h-full text-sm font-medium text-text-secondary hover:text-text-primary border-r border-white/10 whitespace-nowrap"
      >
        <DisplayIcon size={16} />
        <span className="hidden sm:inline">{displayLabel}</span>
        <ChevronDown size={14} className={isOpen ? "rotate-180" : ""} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#0a0a0a] border border-accent/20 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] py-1 min-w-[180px] backdrop-blur-xl" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 콘텐츠 카테고리 */}
          <div className="px-3 py-1.5 text-xs text-text-secondary/50 font-medium border-b border-white/5">콘텐츠</div>
          {CONTENT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                unstyled
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${mode === "content" && contentCategory === cat.id ? "bg-accent/10 text-accent font-medium pl-2 border-l-2 border-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary border-l-2 border-transparent"}`}
              >
                <Icon size={16} />
                <span>{cat.label}</span>
              </Button>
            );
          })}

          {/* 기타 모드 */}
          <div className="px-3 py-1.5 text-xs text-text-secondary/50 font-medium border-t border-b border-white/5 mt-1">기타</div>
          {SEARCH_MODES.filter((m) => m.id !== "content").map((m) => {
            const Icon = m.icon;
            return (
              <Button
                unstyled
                key={m.id}
                onClick={() => handleModeSelect(m.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                  ${mode === m.id ? "bg-accent/10 text-accent font-medium pl-2 border-l-2 border-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary border-l-2 border-transparent"}`}
              >
                <Icon size={16} />
                <span>{m.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
