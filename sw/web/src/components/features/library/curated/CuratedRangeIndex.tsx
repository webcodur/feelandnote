"use client";

import { useTranslations } from "next-intl";
import type { CuratedListItem } from "@/actions/library/types";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export interface Range { start: number; end: number }
export const rangeLabel = (range: Range) => `${range.start + 1}–${range.end}`;

export default function CuratedRangeIndex({ ranges, items, current, onSelect, onClose }: {
  ranges: Range[];
  items: CuratedListItem[];
  current: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("library.curated");
  return <Modal isOpen onClose={onClose} title={t("rangeIndex")} size="sm" closeOnOverlayClick animateHeight={false}>
    <nav aria-label={t("rangeIndex")}
      className="custom-scrollbar max-h-[calc(100dvh-10rem)] overflow-y-auto [scrollbar-width:thin]">
      {ranges.map((entry, index) => <button key={entry.start} type="button"
        aria-current={index === current ? "true" : undefined} onClick={() => onSelect(index)}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 border-b border-white/[0.06] px-4 text-start last:border-b-0 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70",
          index === current ? "bg-accent/[0.09] text-accent" : "text-text-secondary hover:text-text-primary",
        )}>
        <span className="min-w-16 shrink-0 font-mono text-sm tabular-nums">{rangeLabel(entry)}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-text-tertiary">{items[entry.start]?.title}</span>
      </button>)}
    </nav>
  </Modal>;
}
