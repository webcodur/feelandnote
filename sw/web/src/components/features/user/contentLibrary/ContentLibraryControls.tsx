"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import ControlPanel from "@/components/shared/ControlPanel";

import ArchiveControlBar from "./controlBar/ArchiveControlBar";
import type { ArchiveControlBarProps } from "./controlBar/types";

interface ContentLibraryControlsProps extends ArchiveControlBarProps {
  hideWrapper: boolean;
}

export default function ContentLibraryControls({
  hideWrapper,
  ...controlProps
}: ContentLibraryControlsProps) {
  const t = useTranslations("celebPage");
  const [isExpanded, setIsExpanded] = useState(false);

  if (hideWrapper) {
    return (
      <div className="mb-2">
        <ArchiveControlBar {...controlProps} />
      </div>
    );
  }

  return (
    <ControlPanel
      title={t("recordControl")}
      icon={<SlidersHorizontal size={16} className="text-accent/70" />}
      isExpanded={isExpanded}
      onToggleExpand={() => setIsExpanded((previous) => !previous)}
      className="sticky top-0 z-30 mx-auto mb-6 max-w-2xl"
    >
      <ArchiveControlBar {...controlProps} />
    </ControlPanel>
  );
}
