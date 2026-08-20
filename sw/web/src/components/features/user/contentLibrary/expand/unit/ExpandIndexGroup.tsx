"use client";

import { useEffect, useState } from "react";
import type { MutableRefObject, TransitionEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ExpandIndexEntry } from "../groupExpandIndexItems";

interface ExpandIndexGroupProps {
  headingId: string;
  label: string;
  Icon?: LucideIcon;
  isOpen: boolean;
  selectedIndex: number;
  items: ExpandIndexEntry[];
  itemRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
}

export default function ExpandIndexGroup({
  headingId,
  label,
  Icon,
  isOpen,
  selectedIndex,
  items,
  itemRefs,
  onSelect,
  onSelectedItemReady,
}: ExpandIndexGroupProps) {
  const panelId = `${headingId}-items`;
  const selectedItemId =
    items.find((item) => item.originalIndex === selectedIndex)?.itemId ?? null;
  const [expansion, setExpansion] = useState({
    isExpanded: true,
    selectedItemId,
  });

  if (expansion.selectedItemId !== selectedItemId) {
    setExpansion({
      isExpanded: selectedItemId !== null || expansion.isExpanded,
      selectedItemId,
    });
  }

  const isExpanded = expansion.isExpanded;
  const hasSelectedItem = selectedItemId !== null;

  useEffect(() => {
    if (hasSelectedItem && isExpanded) onSelectedItemReady(selectedIndex);
  }, [hasSelectedItem, isExpanded, onSelectedItemReady, selectedIndex, selectedItemId]);

  const handlePanelTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    onSelectedItemReady(selectedIndex);
  };

  return (
    <section aria-labelledby={headingId}>
      <h3 className="m-0">
        <button
          id={headingId}
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() =>
            setExpansion((current) => ({
              ...current,
              isExpanded: !current.isExpanded,
            }))
          }
          className="relative flex h-7 w-full items-center justify-center border-t border-white/20 bg-bg-card text-text-tertiary shadow-[0_2px_3px_rgba(0,0,0,0.45)] hover:bg-white/[0.08] hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-black/50" />
          <span className={cn("flex items-center justify-center", isOpen ? "gap-2.5" : "gap-0")}>
            <span className="flex shrink-0 items-center justify-center" aria-hidden>
              {Icon && <Icon className="h-3 w-3" strokeWidth={1.8} />}
            </span>
            <span
              className={cn(
                "text-center text-xs font-medium tracking-wide transition-opacity duration-150 ease-out",
                isOpen ? "min-w-0 truncate opacity-100" : "w-0 overflow-hidden opacity-0",
              )}
            >
              {label}
            </span>
          </span>
          {isOpen && (
            <ChevronDown
              aria-hidden
              className={cn(
                "absolute end-1 h-3 w-3 shrink-0 transition-transform duration-200 ease-out",
                isExpanded ? "rotate-0" : "-rotate-90",
              )}
              strokeWidth={1.8}
            />
          )}
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
        <div className="min-h-0 overflow-hidden">
          {items.map((item) => {
            const isSelected = item.originalIndex === selectedIndex;
            return (
              <button
                key={item.itemId}
                type="button"
                ref={(element) => {
                  itemRefs.current[item.originalIndex] = element;
                }}
                onClick={() => onSelect(item.originalIndex)}
                tabIndex={isExpanded ? undefined : -1}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${label} ${item.localIndex}. ${item.title}`}
                title={item.title}
                className={cn(
                  "grid min-h-11 w-full grid-cols-[32px_minmax(0,1fr)] items-center border-b border-white/[0.08] px-0 text-sm last:border-b-0 hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 md:grid-cols-[48px_minmax(0,1fr)]",
                  isSelected ? "bg-accent/[0.09] text-accent" : "text-text-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex w-full shrink-0 items-center justify-center font-mono text-xs font-semibold tabular-nums",
                    isSelected ? "text-accent" : "text-text-tertiary",
                  )}
                  aria-hidden
                >
                  {item.localIndex}
                </span>
                <span
                  aria-hidden={!isOpen}
                  className={cn(
                    "line-clamp-2 min-w-0 pe-2 text-start text-sm leading-snug transition-opacity duration-150 ease-out",
                    isOpen ? "opacity-100" : "opacity-0",
                  )}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
