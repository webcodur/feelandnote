"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import {
  getExpandIndexNeighbor,
  type ExpandIndexTypeGroup,
} from "./groupExpandIndexItems";

interface ExpandSelection {
  contentId: string | null;
  keepIndexItemVisible: boolean;
}

interface UseExpandIndexSelectionParams {
  items: UserContentWithContent[];
  groups: ExpandIndexTypeGroup[];
  navigationOrder: number[];
  controlledIndexPreference?: boolean | null;
  onIndexPreferenceChange?: (preference: boolean) => void;
}

export function useExpandIndexSelection({
  items,
  groups,
  navigationOrder,
  controlledIndexPreference,
  onIndexPreferenceChange,
}: UseExpandIndexSelectionParams) {
  const [selection, setSelection] = useState<ExpandSelection>(() => ({
    // 직접 고르기 전에는 현재 목록의 첫 작품을 따른다. 초기 일부 목록의 첫 ID를
    // 고정하면 전체 목록을 정렬한 뒤에도 중간 작품이 열린 채로 남는다.
    contentId: null,
    keepIndexItemVisible: false,
  }));
  const [localIndexPreference, setLocalIndexPreference] = useState<boolean | null>(null);
  const [collapsedGroupTypes, setCollapsedGroupTypes] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const latestSelectedContentIdRef = useRef(items[0]?.content_id ?? null);

  const selectedItemIndex = selection.contentId
    ? items.findIndex((item) => item.content_id === selection.contentId)
    : -1;
  const selectedIndex = selectedItemIndex >= 0 ? selectedItemIndex : 0;
  const selectedContentId = items[selectedIndex]?.content_id ?? null;
  const isControlled = controlledIndexPreference !== undefined;
  const indexPreference = isControlled ? controlledIndexPreference : localIndexPreference;
  const isIndexOpen = indexPreference ?? false;

  const setResolvedIndexPreference = useCallback(
    (preference: boolean) => {
      if (!isControlled) setLocalIndexPreference(preference);
      onIndexPreferenceChange?.(preference);
    },
    [isControlled, onIndexPreferenceChange],
  );

  useEffect(() => {
    latestSelectedContentIdRef.current = selectedContentId;
  }, [selectedContentId]);
  const isLatestSelection = useCallback(
    (contentId: string) => latestSelectedContentIdRef.current === contentId,
    [],
  );

  const previousIndex = getExpandIndexNeighbor(navigationOrder, selectedIndex, -1);
  const nextIndex = getExpandIndexNeighbor(navigationOrder, selectedIndex, 1);
  const selectIndex = useCallback(
    (next: number, keepVisible: boolean) => {
      const nextItem = items[next];
      if (!nextItem) return;

      latestSelectedContentIdRef.current = nextItem.content_id;
      setSelection({
        contentId: nextItem.content_id,
        keepIndexItemVisible: keepVisible,
      });

      if (keepVisible) {
        const targetGroupType = groups.find((group) =>
          group.items.some((item) => item.originalIndex === next),
        )?.dbType;
        if (targetGroupType) {
          setCollapsedGroupTypes((current) => {
            if (!current.has(targetGroupType)) return current;
            const expanded = new Set(current);
            expanded.delete(targetGroupType);
            return expanded;
          });
        }
      }

      setResolvedIndexPreference(false);
    },
    [groups, items, setResolvedIndexPreference],
  );
  const selectDirectly = useCallback((next: number) => selectIndex(next, false), [selectIndex]);
  const selectPrevious = useCallback(
    () => selectIndex(previousIndex, true),
    [previousIndex, selectIndex],
  );
  const selectNext = useCallback(
    () => selectIndex(nextIndex, true),
    [nextIndex, selectIndex],
  );
  const toggleIndex = useCallback(() => {
    setResolvedIndexPreference(!isIndexOpen);
  }, [isIndexOpen, setResolvedIndexPreference]);
  const toggleGroup = useCallback((dbType: string) => {
    setCollapsedGroupTypes((current) => {
      const next = new Set(current);
      if (next.has(dbType)) next.delete(dbType);
      else next.add(dbType);
      return next;
    });
  }, []);

  return {
    collapsedGroupTypes,
    isIndexOpen,
    isLatestSelection,
    keepSelectedItemVisible: selection.keepIndexItemVisible,
    selectedContentId,
    selectedIndex,
    selectDirectly,
    selectNext,
    selectPrevious,
    toggleGroup,
    toggleIndex,
  };
}
