"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";

import styles from "./ExpandDetailView.module.css";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";
import ExpandIndexGroup from "./unit/ExpandIndexGroup";
import { useDesktopLayout } from "../useDesktopLayout";

interface ExpandIndexRailProps {
  groups: ExpandIndexTypeGroup[];
  isOpen: boolean;
  indexId: string;
  navRef: RefObject<HTMLElement | null>;
  setItemRef: (index: number, element: HTMLButtonElement | null) => void;
  labels: {
    list: string;
    title: string;
    expand: string;
    collapse: string;
  };
  collapsedGroupTypes: ReadonlySet<string>;
  scrollTargetIndex: number | null;
  onToggle: () => void;
  onToggleGroup: (dbType: string) => void;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
}

function ExpandIndexRail({
  groups,
  isOpen,
  indexId,
  navRef,
  setItemRef,
  labels,
  collapsedGroupTypes,
  scrollTargetIndex,
  onToggle,
  onToggleGroup,
  onSelect,
  onSelectedItemReady,
}: ExpandIndexRailProps) {
  const t = useTranslations("content");
  const [hasOpened, setHasOpened] = useState(isOpen);
  const asideRef = useRef<HTMLElement | null>(null);
  /* 데스크톱은 목록을 상시 펼쳐 둔다. 바깥 클릭·항목 선택으로 닫지 않는다. */
  const isDesktop = useDesktopLayout();
  const handleToggle = () => {
    setHasOpened(true);
    onToggle();
  };

  /* 목록에서 작품을 고르면 본문을 갈아끼운다.
     닫힘은 선택 훅이 맡는다. 모바일에서만 indexPreference를 false로 둔다. */
  const handleSelect = (index: number) => {
    onSelect(index);
  };

  /* 목록이 열려 있을 때 바깥을 한 번 누르면 닫는다. 데스크톱·단추·목록 안쪽 누름은 제외한다. */
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const onPointerDown = (event: PointerEvent) => {
      if (asideRef.current?.contains(event.target as Node)) return;
      onToggle();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, isDesktop, onToggle]);

  return (
    <aside ref={asideRef} className="hidden md:relative md:col-start-2 md:row-span-2 md:row-start-1 md:block md:min-w-0">
      {/* 데스크톱 독립 열. 모바일 목록은 MobileIndexModal이 맡는다. */}
      <div
        className={cn(
          "absolute inset-y-0 start-0 z-30 flex overflow-hidden border-e border-white/10 bg-bg-secondary shadow-xl transition-[width] duration-300 ease-out md:z-auto md:w-full md:bg-bg-secondary/70 md:shadow-none md:transition-none",
          isOpen ? "w-44" : "w-12",
        )}
      >
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            aria-controls={indexId}
            aria-label={isOpen ? labels.collapse : labels.expand}
            title={isOpen ? labels.collapse : labels.expand}
            className="flex h-[64px] min-h-[64px] w-full shrink-0 items-center justify-center border-b border-white/[0.08] text-text-secondary hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
          >
            <Menu className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
          </button>
          <nav
            ref={navRef}
            id={indexId}
            aria-label={labels.list}
            data-open={isOpen}
            className={cn(
              "custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]",
              styles.indexRail,
              styles.indexScrollbar,
            )}
          >
            {(isOpen || hasOpened) && groups.map((group) => {
              const category = getCategoryByDbType(group.dbType);
              const hasScrollTarget = group.items.some(
                (item) => item.originalIndex === scrollTargetIndex,
              );
              return (
                <ExpandIndexGroup
                  key={group.dbType}
                  groupKey={group.dbType}
                  headingId={`${indexId}-${group.dbType}`}
                  label={category ? t(`category.${category.id}`) : group.dbType}
                  Icon={category?.lucideIcon}
                  isExpanded={!collapsedGroupTypes.has(group.dbType)}
                  scrollTargetIndex={hasScrollTarget ? scrollTargetIndex : null}
                  items={group.items}
                  setItemRef={setItemRef}
                  onToggle={onToggleGroup}
                  onSelect={handleSelect}
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

export default memo(ExpandIndexRail);
