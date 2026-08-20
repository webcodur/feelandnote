"use client";

import { memo, useEffect } from "react";
import type { TransitionEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "../ExpandDetailView.module.css";
import type { ExpandIndexEntry } from "../groupExpandIndexItems";

interface ExpandIndexGroupProps {
  groupKey: string;
  headingId: string;
  label: string;
  Icon?: LucideIcon;
  isExpanded: boolean;
  scrollTargetIndex: number | null;
  items: ExpandIndexEntry[];
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onToggle: (groupKey: string) => void;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
}

interface ExpandIndexItemProps {
  item: ExpandIndexEntry;
  label: string;
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onSelect: (index: number) => void;
}

interface ExpandIndexItemsProps {
  items: ExpandIndexEntry[];
  label: string;
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onSelect: (index: number) => void;
}

const ExpandIndexItem = memo(function ExpandIndexItem({
  item,
  label,
  setItemRef,
  onSelect,
}: ExpandIndexItemProps) {
  return (
    <button
      type="button"
      ref={(element) => {
        setItemRef(item.originalIndex, element);
      }}
      onClick={() => onSelect(item.originalIndex)}
      aria-current={item.originalIndex === 0 ? "true" : undefined}
      aria-label={`${label} ${item.localIndex}. ${item.title}`}
      title={item.title}
      className={cn(
        "grid min-h-11 w-full grid-cols-[32px_minmax(0,1fr)] items-center border-b border-white/[0.08] px-0 text-sm text-text-secondary last:border-b-0 hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 md:grid-cols-[48px_minmax(0,1fr)]",
        styles.indexItem,
      )}
    >
      <span
        className={cn(
          "flex w-full shrink-0 items-center justify-center font-mono text-xs font-semibold tabular-nums text-text-tertiary",
          styles.indexItemNumber,
        )}
        aria-hidden
      >
        {item.localIndex}
      </span>
      <span
        aria-hidden
        className={cn(
          "line-clamp-2 min-w-0 pe-2 text-start text-sm leading-snug transition-opacity duration-150 ease-out",
          styles.indexItemTitle,
        )}
      >
        {item.title}
      </span>
    </button>
  );
});

const ExpandIndexItems = memo(function ExpandIndexItems({
  items,
  label,
  setItemRef,
  onSelect,
}: ExpandIndexItemsProps) {
  return (
    <div className="min-h-0 overflow-hidden">
      {items.map((item) => (
        <ExpandIndexItem
          key={item.itemId}
          item={item}
          label={label}
          setItemRef={setItemRef}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

function ExpandIndexGroup({
  groupKey,
  headingId,
  label,
  Icon,
  isExpanded,
  scrollTargetIndex,
  items,
  setItemRef,
  onToggle,
  onSelect,
  onSelectedItemReady,
}: ExpandIndexGroupProps) {
  const panelId = `${headingId}-items`;

  useEffect(() => {
    if (scrollTargetIndex !== null && isExpanded) {
      onSelectedItemReady(scrollTargetIndex);
    }
  }, [isExpanded, onSelectedItemReady, scrollTargetIndex]);

  const handlePanelTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    if (scrollTargetIndex !== null) {
      onSelectedItemReady(scrollTargetIndex);
    }
  };

  return (
    <section aria-labelledby={headingId}>
      <h3 className="m-0">
        <button
          id={headingId}
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => onToggle(groupKey)}
          className="relative flex h-7 w-full items-center justify-center border-t border-white/20 bg-bg-card text-text-tertiary shadow-[0_2px_3px_rgba(0,0,0,0.45)] hover:bg-white/[0.08] hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/50" />
          <span className={cn("flex items-center justify-center", styles.indexGroupLabelWrap)}>
            <span className="flex shrink-0 items-center justify-center" aria-hidden>
              {Icon && <Icon className="h-3 w-3" strokeWidth={1.8} />}
            </span>
            <span
              className={cn(
                "text-center text-xs font-medium tracking-wide transition-opacity duration-150 ease-out",
                styles.indexGroupLabel,
              )}
            >
              {label}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "absolute end-1 h-3 w-3 shrink-0 transition-transform duration-200 ease-out",
              styles.indexGroupChevron,
              isExpanded ? "rotate-0" : "-rotate-90",
            )}
            strokeWidth={1.8}
          />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={isExpanded ? undefined : true}
        inert={!isExpanded}
        onTransitionEnd={handlePanelTransitionEnd}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ExpandIndexItems
          items={items}
          label={label}
          setItemRef={setItemRef}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

export default memo(ExpandIndexGroup);
