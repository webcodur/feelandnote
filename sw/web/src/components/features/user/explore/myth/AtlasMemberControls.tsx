"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AtlasMemberControls({ disabled = false, open = false, onStep, onOpen }: {
  disabled?: boolean;
  open?: boolean;
  onStep?: (direction: number) => void;
  onOpen?: () => void;
}) {
  const t = useTranslations("explore.hub.myth");
  const tUi = useTranslations("explore.ui");
  const tAtlas = useTranslations("explore.ui.atlas");
  const button = "flex min-h-10 items-center justify-center px-3 text-text-secondary outline-none enabled:hover:bg-accent/10 enabled:hover:text-accent enabled:active:bg-accent/15 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:opacity-30";
  return <div data-member-group-controls className="inline-flex overflow-hidden rounded-control border border-line-strong bg-bg-main divide-x divide-line">
    <button type="button" data-member-group-prev aria-label={`${tUi("prev")} ${tAtlas("group")}`}
      disabled={disabled} onClick={() => onStep?.(-1)} className={button}>
      <ChevronLeft size={18} aria-hidden />
    </button>
    <button type="button" data-member-group-overview aria-haspopup="dialog" aria-expanded={open}
      disabled={!onOpen} onClick={onOpen} className={`${button} px-5 text-sm font-medium`}>
      {t("groupOverview")}
    </button>
    <button type="button" data-member-group-next aria-label={`${tUi("next")} ${tAtlas("group")}`}
      disabled={disabled} onClick={() => onStep?.(1)} className={button}>
      <ChevronRight size={18} aria-hidden />
    </button>
  </div>;
}
