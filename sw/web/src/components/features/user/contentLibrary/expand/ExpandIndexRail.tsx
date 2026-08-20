"use client";

import type { MutableRefObject, RefObject } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";

import styles from "./ExpandDetailView.module.css";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";
import ExpandIndexGroup from "./unit/ExpandIndexGroup";

interface ExpandIndexRailProps {
  groups: ExpandIndexTypeGroup[];
  selectedIndex: number;
  isOpen: boolean;
  indexId: string;
  navRef: RefObject<HTMLElement | null>;
  itemRefs: MutableRefObject<(HTMLButtonElement | null)[]>;
  labels: {
    list: string;
    title: string;
    expand: string;
    collapse: string;
  };
  onToggle: () => void;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
}

export default function ExpandIndexRail({
  groups,
  selectedIndex,
  isOpen,
  indexId,
  navRef,
  itemRefs,
  labels,
  onToggle,
  onSelect,
  onSelectedItemReady,
}: ExpandIndexRailProps) {
  const t = useTranslations("content");

  return (
    <aside className="relative col-start-1 row-span-2 row-start-1 min-w-0 md:col-start-2">
      <div
        className={cn(
          "absolute inset-y-0 start-0 z-30 flex overflow-hidden border-e border-white/10 bg-bg-secondary shadow-xl transition-[width] duration-300 ease-out md:z-auto md:w-full md:bg-bg-secondary/70 md:shadow-none md:transition-none",
          isOpen ? "w-44" : "w-8",
        )}
      >
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={indexId}
            aria-label={isOpen ? labels.collapse : labels.expand}
            title={isOpen ? labels.collapse : labels.expand}
            className="grid h-[64px] min-h-[64px] shrink-0 grid-cols-[32px_minmax(0,1fr)] items-center border-b border-white/[0.08] px-0 text-text-secondary hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 md:grid-cols-[48px_minmax(0,1fr)]"
          >
            <span className="flex h-full w-full items-center justify-center">
              <Menu className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
            </span>
            <span
              aria-hidden={!isOpen}
              className={cn(
                "min-w-0 truncate pe-3 text-start text-sm font-semibold tracking-wide text-text-primary transition-opacity duration-150 ease-out",
                isOpen ? "opacity-100" : "opacity-0",
              )}
            >
              {labels.title}
            </span>
          </button>

          <nav
            ref={navRef}
            id={indexId}
            aria-label={labels.list}
            className={cn(
              "custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]",
              styles.indexScrollbar,
            )}
          >
            {groups.map((group) => {
              const category = getCategoryByDbType(group.dbType);
              return (
                <ExpandIndexGroup
                  key={group.dbType}
                  headingId={`${indexId}-${group.dbType}`}
                  label={category ? t(`category.${category.id}`) : group.dbType}
                  Icon={category?.lucideIcon}
                  isOpen={isOpen}
                  selectedIndex={selectedIndex}
                  items={group.items}
                  itemRefs={itemRefs}
                  onSelect={onSelect}
                  onSelectedItemReady={onSelectedItemReady}
                />
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
