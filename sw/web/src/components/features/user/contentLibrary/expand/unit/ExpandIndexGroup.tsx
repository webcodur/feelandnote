"use client";

import { memo, useEffect } from "react";
import type { TransitionEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import LibraryIndexItem from "@/components/shared/LibraryIndexItem";

import { cn } from "@/lib/utils";

import styles from "../ExpandDetailView.module.css";
import type { ExpandIndexEntry } from "../groupExpandIndexItems";

interface ExpandIndexGroupProps {
  groupKey: string;
  headingId: string;
  label: string;
  Icon?: LucideIcon;
  isExpanded: boolean;
  selectedIndex: number;
  scrollTargetIndex: number | null;
  items: ExpandIndexEntry[];
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onToggle: (groupKey: string) => void;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
  hideHeader?: boolean;
}

interface ExpandIndexItemProps {
  contentType: string;
  item: ExpandIndexEntry;
  isSelected: boolean;
  label: string;
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onSelect: (index: number) => void;
}

interface ExpandIndexItemsProps {
  contentType: string;
  items: ExpandIndexEntry[];
  selectedIndex: number;
  label: string;
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onSelect: (index: number) => void;
}

const ExpandIndexItem = memo(function ExpandIndexItem({
  contentType,
  item,
  isSelected,
  label,
  setItemRef,
  onSelect,
}: ExpandIndexItemProps) {
  const number = `${item.localIndex}.`;
  return (
    <LibraryIndexItem
      selected={isSelected}
      title={item.title}
      creator={item.creator}
      thumbnailUrl={item.thumbnailUrl}
      contentType={contentType}
      number={item.localIndex}
      unavailable={Boolean(item.titleBadge)}
      data-original-index={item.originalIndex}
      ref={(element) => {
        setItemRef(item.originalIndex, element);
      }}
      onClick={() => onSelect(item.originalIndex)}
      aria-label={`${label} ${number} ${item.title}`}
    />
  );
});

const ExpandIndexItems = memo(function ExpandIndexItems({
  contentType,
  items,
  selectedIndex,
  label,
  setItemRef,
  onSelect,
}: ExpandIndexItemsProps) {
  return (
    <div className="min-h-0 overflow-hidden">
      {items.map((item) => (
        <ExpandIndexItem
          key={item.itemId}
          contentType={contentType}
          item={item}
          isSelected={item.originalIndex === selectedIndex}
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
  selectedIndex,
  scrollTargetIndex,
  items,
  setItemRef,
  onToggle,
  onSelect,
  onSelectedItemReady,
  hideHeader = false,
}: ExpandIndexGroupProps) {
  const panelId = `${headingId}-items`;

  useEffect(() => {
    if (scrollTargetIndex !== null && isExpanded) {
      onSelectedItemReady(scrollTargetIndex);
    }
  }, [isExpanded, onSelectedItemReady, scrollTargetIndex]);

  if (hideHeader) {
    return (
      <ExpandIndexItems
        contentType={groupKey}
        items={items}
        selectedIndex={selectedIndex}
        label={label}
        setItemRef={setItemRef}
        onSelect={onSelect}
      />
    );
  }

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
                "flex items-center gap-1.5 text-center text-xs font-medium tracking-wide transition-opacity duration-150 ease-out",
                styles.indexGroupLabel,
              )}
            >
              <span>{label}</span>
              <span className="font-mono text-[11px] tabular-nums text-text-tertiary">
                {items.length}
              </span>
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
          contentType={groupKey}
          items={items}
          selectedIndex={selectedIndex}
          label={label}
          setItemRef={setItemRef}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

export default memo(ExpandIndexGroup);
