"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_ID_TO_TYPE, getCategoryByDbType, type CategoryId } from "@/constants/categories";
import type { ContentTypeCounts } from "@/types/content";
import type { ExpandIndexTypeGroup } from "./groupExpandIndexItems";

export const ALL_GROUPS = "all";

interface ExpandIndexModalOptions {
  groups: ExpandIndexTypeGroup[];
  activeCategory?: CategoryId;
  categoryCounts?: ContentTypeCounts | null;
  onCategoryChange?: (category: CategoryId) => void;
}

export function filterExpandIndexGroups(groups: ExpandIndexTypeGroup[], query: string) {
  const terms = query.trim().toLocaleLowerCase().normalize("NFC").split(/\s+/).filter(Boolean);
  if (terms.length === 0) return groups;
  return groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const text = `${item.title} ${item.creator ?? ""}`.toLocaleLowerCase().normalize("NFC");
      return terms.every((term) => text.includes(term));
    }),
  })).filter((group) => group.items.length > 0);
}

export function useExpandIndexModal({ groups, activeCategory, categoryCounts, onCategoryChange }: ExpandIndexModalOptions) {
  const [selectedGroupType, setSelectedGroupType] = useState(
    () => CATEGORY_ID_TO_TYPE[activeCategory ?? "all"] ?? ALL_GROUPS,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const categoryOptions = useMemo(() => {
    if (!onCategoryChange) return groups.map((group) => ({
      dbType: group.dbType,
      category: getCategoryByDbType(group.dbType),
      count: group.items.length,
    }));
    return CATEGORIES.map((category) => ({
      dbType: category.dbType,
      category,
      count: Math.max(categoryCounts?.[category.dbType] ?? 0,
        groups.find((group) => group.dbType === category.dbType)?.items.length ?? 0),
    }));
  }, [categoryCounts, groups, onCategoryChange]);
  const hasSelectedGroup = selectedGroupType === ALL_GROUPS
    || categoryOptions.some((option) => option.dbType === selectedGroupType);
  const effectiveGroupType = hasSelectedGroup ? selectedGroupType : ALL_GROUPS;
  const visibleGroups = useMemo(() => filterExpandIndexGroups(
    effectiveGroupType === ALL_GROUPS ? groups : groups.filter((group) => group.dbType === effectiveGroupType),
    appliedSearchQuery,
  ), [groups, effectiveGroupType, appliedSearchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setAppliedSearchQuery("");
  };
  const handleCategorySelect = (dbType: string) => {
    setSelectedGroupType(dbType);
    clearSearch();
    const category = getCategoryByDbType(dbType);
    if (category) onCategoryChange?.(category.id);
  };

  return {
    categoryOptions, effectiveGroupType, visibleGroups, handleCategorySelect, appliedSearchQuery,
    searchControls: {
      searchQuery,
      onSearchChange: setSearchQuery,
      onSearch: () => setAppliedSearchQuery(searchQuery.trim()),
      onClearSearch: clearSearch,
      hasAppliedSearch: Boolean(appliedSearchQuery),
    },
  };
}
