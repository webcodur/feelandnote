"use client";

import { useState } from "react";
import { Eye, List, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";

import FilterChip from "@/components/shared/filters/FilterChip";
import FilterChipDropdown, {
  type FilterOption,
} from "@/components/shared/filters/FilterChipDropdown";
import FilterModal from "@/components/shared/filters/FilterModal";
import { cn } from "@/lib/utils";

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
  responsiveDesktopViewMode?: ViewMode;
  isResponsiveViewUnresolved?: boolean;
}

export default function ArchiveViewControls({
  viewMode,
  onViewModeChange,
  responsiveDesktopViewMode,
  isResponsiveViewUnresolved = false,
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

  const renderDesktopControl = (selectedMode: ViewMode, className: string) => {
    const SelectedViewIcon = VIEW_ICON[selectedMode];
    return (
      <div className={cn("items-center", className)}>
        <FilterChipDropdown
          label={t("expandIndexLabel")}
          value={t(VIEW_LABEL_KEY[selectedMode])}
          valueContent={<SelectedViewIcon size={16} aria-hidden />}
          icon={<Eye size={18} strokeWidth={1.7} aria-hidden />}
          isActive
          options={viewOptions}
          currentValue={selectedMode}
          onSelect={(value) => onViewModeChange(value as ViewMode)}
        />
      </div>
    );
  };

  const renderMobileControl = (selectedMode: ViewMode, className: string) => {
    const SelectedViewIcon = VIEW_ICON[selectedMode];
    return (
      <div className={cn("min-w-0", className)}>
        <FilterChip
          label={t("expandIndexLabel")}
          value={t(VIEW_LABEL_KEY[selectedMode])}
          valueContent={<SelectedViewIcon size={16} aria-hidden />}
          icon={<Eye size={16} strokeWidth={1.7} aria-hidden />}
          isActive
          onClick={() => setIsMobileOpen(true)}
          className="min-w-0"
        />
      </div>
    );
  };

  const hasUnresolvedResponsiveView = isResponsiveViewUnresolved && responsiveDesktopViewMode;

  return (
    <>
      {hasUnresolvedResponsiveView ? (
        <>
          {renderMobileControl(viewMode, "md:hidden")}
          {renderDesktopControl(responsiveDesktopViewMode, "hidden md:flex")}
        </>
      ) : (
        <>
          {renderDesktopControl(viewMode, "hidden md:flex")}
          {renderMobileControl(viewMode, "md:hidden")}
        </>
      )}

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
