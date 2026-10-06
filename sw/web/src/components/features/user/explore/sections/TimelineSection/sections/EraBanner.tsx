"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { EraInfo } from "../utils";
import { useTranslations } from "next-intl";

export default function EraBanner({ era, count, isCollapsed, onToggle }: {
  era: EraInfo; count: number; isCollapsed: boolean; onToggle: (eraKey: string) => void;
}) {
  const t = useTranslations("explore.ui.timeline");
  return <button type="button" onClick={() => onToggle(era.key)} aria-expanded={!isCollapsed}
    className="group/era my-6 flex w-full flex-wrap items-center justify-between gap-3 rounded-card border border-accent/15 bg-bg-card/80 px-4 py-3.5 text-start outline-none hover:border-accent/35 hover:bg-bg-card focus-visible:ring-2 focus-visible:ring-accent md:px-5" data-timeline-era={era.key}>
    <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="text-base font-bold text-accent md:text-lg">{t('eras.' + era.key)}</span>
      <span className="text-xs font-mono text-text-tertiary md:text-sm">{era.range}</span>
    </span>
    <span className="flex shrink-0 items-center gap-3">
      <span className="text-sm text-text-secondary">{t("figureCount", { count })}</span>
      {isCollapsed && <ChevronDown size={18} aria-hidden className="text-text-secondary group-hover/era:text-accent" />}
      {!isCollapsed && <ChevronUp size={18} aria-hidden className="text-text-secondary group-hover/era:text-accent" />}
    </span>
  </button>;
}
