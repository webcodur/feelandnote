"use client";

import { LayoutGrid, List, Settings } from "lucide-react";
import { FilterChips, type ChipOption } from "@/components/ui";
import { CATEGORIES } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import type { ViewMode } from "./hooks/useContentLibrary";
import Button from "@/components/ui/Button";

export const TAB_OPTIONS: (ChipOption & { type: ContentType })[] = CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.label,
  icon: cat.icon,
  type: cat.dbType as ContentType,
}));

interface ContentLibraryHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showTabs?: boolean;
  showViewToggle?: boolean;
  showFolders?: boolean;
  compact?: boolean;
  onFolderManage?: () => void;
}

export default function ContentLibraryHeader({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  showTabs = true,
  showViewToggle = true,
  showFolders = true,
  compact = false,
  onFolderManage,
}: ContentLibraryHeaderProps) {
  if (!showTabs && !showViewToggle) return null;

  return (
    <div className="flex items-center justify-between gap-2">
      {showTabs && (
        <div className="flex-1 overflow-x-auto pb-1 -mb-1">
          <FilterChips
            options={TAB_OPTIONS}
            value={activeTab}
            onChange={onTabChange}
            variant="filled"
            compact={compact}
            showIcon={!compact}
          />
        </div>
      )}
      {showViewToggle && (
        <div className="flex items-center gap-1">
          {showFolders && onFolderManage && (
            <Button
              unstyled
              onClick={onFolderManage}
              className="p-1.5 rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary"
              title="폴더 관리"
            >
              <Settings size={16} />
            </Button>
          )}
          <div className="flex bg-bg-secondary rounded-md p-0.5">
            <Button
              unstyled
              onClick={() => onViewModeChange("grid")}
              className={`py-1 px-2 rounded ${
                viewMode === "grid" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
              aria-label="그리드 뷰"
            >
              <LayoutGrid size={compact ? 14 : 16} />
            </Button>
            <Button
              unstyled
              onClick={() => onViewModeChange("list")}
              className={`py-1 px-2 rounded ${
                viewMode === "list" ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
              aria-label="리스트 뷰"
            >
              <List size={compact ? 14 : 16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
