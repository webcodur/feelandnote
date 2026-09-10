"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LibraryBig } from "lucide-react";
import { useTranslations } from "next-intl";

import Modal from "@/components/ui/Modal";
import {
  CATEGORIES,
  CATEGORY_ID_TO_TYPE,
  getCategoryByDbType,
  type CategoryId,
} from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { ContentTypeCounts } from "@/types/content";

import styles from "./ExpandDetailView.module.css";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";
import ExpandIndexGroup from "./unit/ExpandIndexGroup";

interface MobileIndexModalProps {
  groups: ExpandIndexTypeGroup[];
  indexId: string;
  labels: {
    list: string;
  };
  activeCategory?: CategoryId;
  categoryCounts?: ContentTypeCounts | null;
  onCategoryChange?: (category: CategoryId) => void;
  isContentRefreshing?: boolean;
  collapsedGroupTypes: ReadonlySet<string>;
  scrollTargetIndex: number | null;
  onToggleGroup: (dbType: string) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
}

const ALL_GROUPS = "all";

/*
 * 기록 목록 모달. 데스크톱과 모바일에서 같은 중앙 모달로 띄운다.
 * 바깥 pointerdown 감시와 겹치지 않게 모달 안 누름은 전파를 끊고,
 * 뒷배경·닫기 단추·Escape·항목 선택으로 닫는다. 항목 ref는 등록하지 않아
 * 모달 내부 목록의 스크롤 ref만 사용한다.
 */
export default function MobileIndexModal({
  groups,
  indexId,
  labels,
  activeCategory,
  categoryCounts,
  onCategoryChange,
  isContentRefreshing = false,
  collapsedGroupTypes,
  scrollTargetIndex,
  onToggleGroup,
  onSelect,
  onClose,
}: MobileIndexModalProps) {
  const t = useTranslations("content");
  const tArchive = useTranslations("archiveSearch");
  const tSearch = useTranslations("searchPage");
  const navRef = useRef<HTMLElement | null>(null);
  const [selectedGroupType, setSelectedGroupType] = useState(
    () => CATEGORY_ID_TO_TYPE[activeCategory ?? "all"] ?? ALL_GROUPS,
  );

  const categoryOptions = useMemo(() => {
    if (onCategoryChange) {
      return CATEGORIES
        .filter((category) => {
          const count = categoryCounts?.[category.dbType];
          const groupCount = groups.find((group) => group.dbType === category.dbType)?.items.length ?? 0;
          return (count ?? 0) > 0 || groupCount > 0;
        })
        .map((category) => {
          const groupCount = groups.find((group) => group.dbType === category.dbType)?.items.length ?? 0;
          return {
            dbType: category.dbType,
            category,
            count: Math.max(categoryCounts?.[category.dbType] ?? 0, groupCount),
          };
        })
        .sort((first, second) => second.count - first.count);
    }

    return groups.map((group) => ({
      dbType: group.dbType,
      category: getCategoryByDbType(group.dbType),
      count: group.items.length,
    }));
  }, [categoryCounts, groups, onCategoryChange]);
  const hasSelectedGroup = selectedGroupType === ALL_GROUPS
    || categoryOptions.some((option) => option.dbType === selectedGroupType);
  const effectiveGroupType = hasSelectedGroup ? selectedGroupType : ALL_GROUPS;
  const visibleGroups = effectiveGroupType === ALL_GROUPS
    ? groups
    : groups.filter((group) => group.dbType === effectiveGroupType);

  const handleCategorySelect = (dbType: string) => {
    setSelectedGroupType(dbType);
    const category = getCategoryByDbType(dbType);
    if (category) onCategoryChange?.(category.id);
  };

  useEffect(() => {
    if (scrollTargetIndex === null) return;
    navRef.current
      ?.querySelector(`[data-original-index="${scrollTargetIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [scrollTargetIndex]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={labels.list}
      size="lg"
      closeOnOverlayClick
      animateHeight={false}
    >
      <div className="border-b border-border px-3 py-2">
        <div
          role="radiogroup"
          aria-label={tArchive("filter.category")}
          className={cn(
            "grid grid-cols-2 gap-1",
            onCategoryChange ? "sm:grid-cols-4" : "sm:grid-cols-5",
          )}
        >
          {!onCategoryChange && (
            <button
              type="button"
              role="radio"
              aria-checked={effectiveGroupType === ALL_GROUPS}
              onClick={() => setSelectedGroupType(ALL_GROUPS)}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70",
                effectiveGroupType === ALL_GROUPS
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10 hover:text-text-primary",
              )}
            >
              <LibraryBig size={14} strokeWidth={1.7} aria-hidden />
              <span>{t("category.all")}</span>
              <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
                {groups.reduce((total, group) => total + group.items.length, 0)}
              </span>
            </button>
          )}

          {categoryOptions.map(({ dbType, category, count }) => {
            const Icon = category?.lucideIcon;
            const isSelected = effectiveGroupType === dbType;
            return (
              <button
                key={dbType}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleCategorySelect(dbType)}
                className={cn(
                  "flex min-w-0 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70",
                  isSelected
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-white/10 bg-white/5 text-text-secondary hover:border-white/20 hover:bg-white/10 hover:text-text-primary",
                )}
              >
                {Icon && <Icon size={14} strokeWidth={1.7} aria-hidden />}
                <span className="truncate">
                  {category ? t(`category.${category.id}`) : dbType}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <nav
        ref={navRef}
        aria-label={labels.list}
        aria-busy={isContentRefreshing || undefined}
        data-open="true"
        className={cn(
          "custom-scrollbar max-h-[calc(100dvh-13rem)] overflow-y-auto overflow-x-hidden [overflow-anchor:none]",
          styles.indexRail,
          styles.indexScrollbar,
        )}
      >
        {visibleGroups.map((group) => {
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
              onSelectedItemReady={() => undefined}
              hideHeader={Boolean(onCategoryChange)}
            />
          );
        })}
        {visibleGroups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">
            {isContentRefreshing ? tSearch("loading") : "—"}
          </div>
        )}
      </nav>
    </Modal>
  );
}
