"use client";

import { useTranslations } from "next-intl";

import LibraryIndexModal from "@/components/shared/LibraryIndexModal";
import LibraryCategoryPicker from "@/components/shared/LibraryCategoryPicker";
import LibraryIndexList from "@/components/shared/LibraryIndexList";
import {
  getCategoryByDbType,
  type CategoryId,
} from "@/constants/categories";
import { cn } from "@/lib/utils";
import type { ContentTypeCounts } from "@/types/content";

import styles from "./ExpandDetailView.module.css";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";
import ExpandIndexGroup from "./unit/ExpandIndexGroup";
import ArchiveSearchControls from "../controlBar/ArchiveSearchControls";
import { ALL_GROUPS, useExpandIndexModal } from "./useExpandIndexModal";

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
  selectedIndex: number;
  onToggleGroup: (dbType: string) => void;
  onSelect: (index: number) => void;
  onClose: () => void;
}

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
  selectedIndex,
  onToggleGroup,
  onSelect,
  onClose,
}: MobileIndexModalProps) {
  const t = useTranslations("content");
  const tArchive = useTranslations("archiveSearch");
  const tCommon = useTranslations("common");
  const { categoryOptions, effectiveGroupType, visibleGroups, handleCategorySelect,
    searchControls, appliedSearchQuery } = useExpandIndexModal({ groups, activeCategory, categoryCounts, onCategoryChange });

  return (
    <LibraryIndexModal
      onClose={onClose}
      title={labels.list}
      count={visibleGroups.reduce((count, group) => count + group.items.length, 0)}
      controls={<>
        <LibraryCategoryPicker
          options={[
            ...(!onCategoryChange ? [{ key: ALL_GROUPS, label: t("category.all"),
              count: groups.reduce((total, group) => total + group.items.length, 0) }] : []),
            ...categoryOptions.map(({ dbType, category, count }) => ({
              key: dbType, label: category ? t(`category.${category.id}`) : dbType,
              count, disabled: count === 0,
            })),
          ]}
          value={effectiveGroupType}
          onChange={handleCategorySelect}
          ariaLabel={tArchive("filter.category")}
        />
        <ArchiveSearchControls
          {...searchControls}
          compact
          fullWidth
          className="mt-2"
        />
      </>}
    >

      <LibraryIndexList
        selectedKey={selectedIndex}
        resetKey={`${effectiveGroupType}:${appliedSearchQuery}`}
        id={indexId}
        aria-label={labels.list}
        aria-busy={isContentRefreshing || undefined}
        data-open="true"
        className={cn(
          styles.indexRail,
          styles.indexScrollbar,
        )}
      >
        {visibleGroups.map((group) => {
          const category = getCategoryByDbType(group.dbType);
          const hasScrollTarget = group.items.some(
            (item) => item.originalIndex === selectedIndex,
          );
          return (
            <ExpandIndexGroup
              key={group.dbType}
              groupKey={group.dbType}
              headingId={`${indexId}-modal-${group.dbType}`}
              label={category ? t(`category.${category.id}`) : group.dbType}
              Icon={category?.lucideIcon}
              isExpanded={!collapsedGroupTypes.has(group.dbType)}
              selectedIndex={selectedIndex}
              scrollTargetIndex={hasScrollTarget ? selectedIndex : null}
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
            {isContentRefreshing ? tCommon("loading") : tArchive("noResults")}
          </div>
        )}
      </LibraryIndexList>
    </LibraryIndexModal>
  );
}
