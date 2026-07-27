/*
  파일명: /components/features/search/SearchModeDropdown.tsx
  기능: 검색 모드 및 카테고리 선택 드롭다운
  책임: 콘텐츠/사용자/태그/기록관 검색 모드와 카테고리 필터 제공
*/ // ------------------------------
"use client";

import { ChevronDown } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { useTranslations } from "next-intl";

export type SearchMode = "content" | "user" | "tag" | "records" | "celeb";
export type ContentCategory = CategoryId;

export interface SearchModeConfig {
  id: SearchMode;
}

export const SEARCH_MODES: SearchModeConfig[] = [
  { id: "content" },
  { id: "user" },
  { id: "celeb" },
  { id: "records" },
];

const SEARCH_MODE_IDS: SearchMode[] = ["content", "user", "celeb", "records"];

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
  const t = useTranslations("shared.search");
  const tc = useTranslations("content.category");
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;
  const displayLabel = mode === "content" ? tc(currentCategory.id) : t(`mode.${mode}`);

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
        <span className="hidden sm:inline">{displayLabel}</span>
        <ChevronDown size={14} className={isOpen ? "rotate-180" : ""} />
      </Button>

      {isOpen && (
        <>
        {/* 투명 백드롭: 외부 탭 시 드롭다운 닫기 */}
        <div className="fixed inset-0" style={{ zIndex: Z_INDEX.dropdown - 1 }} onClick={onClose} />
        <div className="absolute top-full left-0 mt-2 bg-[#0a0a0a] border border-accent/20 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] py-1 min-w-[180px] backdrop-blur-xl" style={{ zIndex: Z_INDEX.dropdown }}>
          {/* 콘텐츠 카테고리 */}
          <div className="px-3 py-1.5 text-xs text-text-secondary/50 font-medium border-b border-white/5">{t("sectionContent")}</div>
          {CONTENT_CATEGORIES.map((cat) => (
            <Button
              unstyled
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm
                ${mode === "content" && contentCategory === cat.id ? "bg-accent/10 text-accent font-medium pl-2 border-l-2 border-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary border-l-2 border-transparent"}`}
            >
              <span>{tc(cat.id)}</span>
            </Button>
          ))}

          {/* 기타 모드 */}
          <div className="px-3 py-1.5 text-xs text-text-secondary/50 font-medium border-t border-b border-white/5 mt-1">{t("sectionOther")}</div>
          {SEARCH_MODE_IDS.filter((id) => id !== "content").map((id) => (
            <Button
              unstyled
              key={id}
              onClick={() => handleModeSelect(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm
                ${mode === id ? "bg-accent/10 text-accent font-medium pl-2 border-l-2 border-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary border-l-2 border-transparent"}`}
            >
              <span>{t(`mode.${id}`)}</span>
            </Button>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
