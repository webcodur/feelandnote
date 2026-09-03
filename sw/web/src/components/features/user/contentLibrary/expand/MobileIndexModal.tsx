"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";

import styles from "./ExpandDetailView.module.css";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";
import ExpandIndexGroup from "./unit/ExpandIndexGroup";

interface MobileIndexModalProps {
  groups: ExpandIndexTypeGroup[];
  indexId: string;
  labels: {
    list: string;
    title: string;
    close: string;
  };
  collapsedGroupTypes: ReadonlySet<string>;
  scrollTargetIndex: number | null;
  onToggleGroup: (dbType: string) => void;
  onSelect: (index: number) => void;
  onSelectedItemReady: (index: number) => void;
  onClose: () => void;
}

/*
 * 모바일 목록 모달. 제목줄 우측 단추로 열어 왼쪽 서랍으로 띄운다.
 * 바깥 pointerdown 감시(레일)와 겹치지 않게 모달 안 누름은 전파를 끊고,
 * 뒷배경·닫기 단추·Escape·항목 선택으로 닫는다. 항목 ref는 등록하지 않아
 * 데스크톱 레일의 스크롤 ref를 건드리지 않는다.
 */
export default function MobileIndexModal({
  groups,
  indexId,
  labels,
  collapsedGroupTypes,
  scrollTargetIndex,
  onToggleGroup,
  onSelect,
  onSelectedItemReady,
  onClose,
}: MobileIndexModalProps) {
  const t = useTranslations("content");
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scrollTargetIndex === null) return;
    navRef.current
      ?.querySelector(`[data-original-index="${scrollTargetIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [scrollTargetIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={labels.list}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div aria-hidden className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-3 start-0 top-3 flex w-72 max-w-[85vw] animate-fade-in flex-col overflow-hidden rounded-e-xl bg-bg-secondary shadow-xl">
        <div className="flex h-[64px] min-h-[64px] shrink-0 items-center justify-between border-b border-white/[0.08] pe-2 ps-4">
          <span className="min-w-0 flex-1 truncate text-start text-sm font-semibold tracking-wide text-text-primary">
            {labels.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
          >
            <X className="h-5 w-5 shrink-0" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <nav
          ref={navRef}
          aria-label={labels.list}
          data-open
          className={cn(
            "custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]",
            styles.indexRail,
            styles.indexScrollbar,
          )}
        >
          {groups.map((group) => {
            const category = getCategoryByDbType(group.dbType);
            const hasScrollTarget = group.items.some(
              (item) => item.originalIndex === scrollTargetIndex,
            );
            return (
              <ExpandIndexGroup
                key={group.dbType}
                groupKey={group.dbType}
                headingId={`${indexId}-modal-${group.dbType}`}
                label={category ? t(`category.${category.id}`) : group.dbType}
                Icon={category?.lucideIcon}
                isExpanded={!collapsedGroupTypes.has(group.dbType)}
                scrollTargetIndex={hasScrollTarget ? scrollTargetIndex : null}
                items={group.items}
                setItemRef={() => undefined}
                onToggle={onToggleGroup}
                onSelect={onSelect}
                onSelectedItemReady={onSelectedItemReady}
              />
            );
          })}
        </nav>
      </div>
    </div>
  );
}
