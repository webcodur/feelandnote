"use client";

import { useState } from "react";
import { Eye, List, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";

import FilterChip from "@/components/shared/filters/FilterChip";
import FilterChipDropdown, {
  type FilterOption,
} from "@/components/shared/filters/FilterChipDropdown";
import FilterModal from "@/components/shared/filters/FilterModal";

import type { ViewMode } from "../contentLibraryTypes";

const VIEW_LABEL_KEY: Record<ViewMode, "listView" | "expandView"> = {
  list: "listView",
  expand: "expandView",
};
const VIEW_ICON = { list: List, expand: Maximize2 } as const;

export const ARCHIVE_ICON_CONTROL_CLASS =
  "flex min-h-[2.5rem] w-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-white/5 text-text-primary hover:border-accent/50 hover:bg-white/10 hover:text-text-primary";

interface ArchiveViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/** 회원 서가의 목록·펼침 전환. 인물 서가는 펼침으로 고정이라 이 부품을 쓰지 않는다 */
export default function ArchiveViewControls({
  viewMode,
  onViewModeChange,
}: ArchiveViewControlsProps) {
  const t = useTranslations("archiveSearch");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const viewOptions: FilterOption[] = [
    {
      value: "list",
      label: t(VIEW_LABEL_KEY.list),
      icon: <List size={16} aria-hidden />,
    },
    {
      value: "expand",
      label: t(VIEW_LABEL_KEY.expand),
      icon: <Maximize2 size={16} aria-hidden />,
    },
  ];
  const SelectedViewIcon = VIEW_ICON[viewMode];

  return (
    <>
      <div className="hidden items-center md:flex">
        <FilterChipDropdown
          label={t("expandIndexLabel")}
          value={t(VIEW_LABEL_KEY[viewMode])}
          valueContent={<SelectedViewIcon size={16} aria-hidden />}
          icon={<Eye size={18} strokeWidth={1.7} aria-hidden />}
          isActive
          options={viewOptions}
          currentValue={viewMode}
          onSelect={(value) => onViewModeChange(value as ViewMode)}
        />
      </div>
      <div className="min-w-0 md:hidden">
        <FilterChip
          label={t("expandIndexLabel")}
          value={t(VIEW_LABEL_KEY[viewMode])}
          valueContent={<SelectedViewIcon size={16} aria-hidden />}
          icon={<Eye size={16} strokeWidth={1.7} aria-hidden />}
          isActive
          onClick={() => setIsMobileOpen(true)}
          className="min-w-0"
        />
      </div>

      <FilterModal
        title={t("expandIndexLabel")}
        isOpen={isMobileOpen}
        current={viewMode}
        options={viewOptions}
        onClose={() => setIsMobileOpen(false)}
        onChange={(value) => onViewModeChange(value as ViewMode)}
      />
    </>
  );
}
