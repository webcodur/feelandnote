"use client";

import { ChevronDown, Book, User, Hash, Folder } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

type SearchMode = "content" | "user" | "tag" | "archive";

const SEARCH_MODES = [
  { id: "content" as const, label: "콘텐츠", icon: Book },
  { id: "user" as const, label: "사용자", icon: User },
  { id: "tag" as const, label: "태그", icon: Hash },
  { id: "archive" as const, label: "내 기록", icon: Folder },
];

interface SearchModeSelectorProps {
  mode: SearchMode;
  category: CategoryId;
  isOpen: boolean;
  onToggle: () => void;
  onModeChange: (mode: SearchMode, category?: CategoryId) => void;
}

export default function SearchModeSelector({
  mode,
  category,
  isOpen,
  onToggle,
  onModeChange,
}: SearchModeSelectorProps) {
  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CATEGORIES.find((c) => c.id === category);
  const DisplayIcon = mode === "content" && currentCategory ? currentCategory.icon : currentMode.icon;
  const displayLabel = mode === "content" && currentCategory ? currentCategory.label : currentMode.label;

  return (
    <div className="relative">
      <Button
        unstyled
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary hover:border-accent"
      >
        <DisplayIcon size={18} />
        <span>{displayLabel}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px]" style={{ zIndex: Z_INDEX.dropdown }}>
          <div className="px-4 py-1.5 text-xs text-text-secondary font-medium border-b border-border">콘텐츠</div>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                unstyled
                key={cat.id}
                type="button"
                onClick={() => onModeChange("content", cat.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm
                  ${mode === "content" && category === cat.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
              >
                <Icon size={16} />
                <span>{cat.label}</span>
              </Button>
            );
          })}

          <div className="px-4 py-1.5 text-xs text-text-secondary font-medium border-t border-b border-border mt-1">기타</div>
          {SEARCH_MODES.filter((m) => m.id !== "content").map((m) => {
            const Icon = m.icon;
            return (
              <Button
                unstyled
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm
                  ${mode === m.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-white/5 hover:text-text-primary"}`}
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

export type { SearchMode };
