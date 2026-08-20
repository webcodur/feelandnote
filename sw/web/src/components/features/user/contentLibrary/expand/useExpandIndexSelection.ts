"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import { DESKTOP_LAYOUT_QUERY } from "../useDesktopLayout";
import { getContainedListScrollDelta } from "./containedListScroll";
import {
  getExpandIndexNeighbor,
  type ExpandIndexTypeGroup,
} from "./groupExpandIndexItems";
import { syncExpandIndexCurrent } from "./syncExpandIndexCurrent";

interface ExpandSelection {
  contentId: string | null;
  keepIndexItemVisible: boolean;
}

interface UseExpandIndexSelectionParams {
  items: UserContentWithContent[];
  groups: ExpandIndexTypeGroup[];
  navigationOrder: number[];
  desktopPresentation: boolean;
  isDesktop: boolean | null;
}

export function useExpandIndexSelection({
  items,
  groups,
  navigationOrder,
  desktopPresentation,
  isDesktop,
}: UseExpandIndexSelectionParams) {
  const [selection, setSelection] = useState<ExpandSelection>(() => ({
    contentId: items[0]?.content_id ?? null,
    keepIndexItemVisible: false,
  }));
  const [indexPreference, setIndexPreference] = useState<boolean | null>(null);
  const [collapsedGroupTypes, setCollapsedGroupTypes] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const indexNavRef = useRef<HTMLElement | null>(null);
  const indexItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const latestSelectedContentIdRef = useRef(items[0]?.content_id ?? null);
  const previousSelectedIndexRef = useRef<number | null>(null);
  const previousIndexGroupsRef = useRef<ExpandIndexTypeGroup[] | null>(null);

  const selectedItemIndex = selection.contentId
    ? items.findIndex((item) => item.content_id === selection.contentId)
    : -1;
  const selectedIndex = selectedItemIndex >= 0 ? selectedItemIndex : 0;
  const selectedContentId = items[selectedIndex]?.content_id ?? null;
  const isIndexOpen = indexPreference ?? (desktopPresentation || isDesktop === true);

  useEffect(() => {
    latestSelectedContentIdRef.current = selectedContentId;
  }, [selectedContentId]);
  const isLatestSelection = useCallback(
    (contentId: string) => latestSelectedContentIdRef.current === contentId,
    [],
  );

  useLayoutEffect(() => {
    const structureChanged = previousIndexGroupsRef.current !== groups;
    syncExpandIndexCurrent({
      elements: indexItemRefs.current,
      previousSelectedIndex: previousSelectedIndexRef.current,
      selectedIndex,
      structureChanged,
    });
    previousIndexGroupsRef.current = groups;
    previousSelectedIndexRef.current = selectedIndex;
  }, [groups, selectedIndex]);

  const keepIndexItemVisible = useCallback((itemIndex: number) => {
    const nav = indexNavRef.current;
    const item = indexItemRefs.current[itemIndex];
    if (!nav || !item || item.closest("[inert]")) return;
    const delta = getContainedListScrollDelta(
      nav.getBoundingClientRect(),
      item.getBoundingClientRect(),
    );
    if (delta !== 0) nav.scrollTop += delta;
  }, []);
  const setIndexItemRef = useCallback(
    (itemIndex: number, element: HTMLButtonElement | null) => {
      indexItemRefs.current[itemIndex] = element;
    },
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

      if (!window.matchMedia(DESKTOP_LAYOUT_QUERY).matches) setIndexPreference(false);
    },
    [groups, items],
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
    setIndexPreference((current) => !(
      current ?? (desktopPresentation || isDesktop === true)
    ));
  }, [desktopPresentation, isDesktop]);
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
    indexNavRef,
    indexPreference,
    isIndexOpen,
    isLatestSelection,
    keepIndexItemVisible,
    keepSelectedItemVisible: selection.keepIndexItemVisible,
    selectedContentId,
    selectedIndex,
    selectDirectly,
    selectNext,
    selectPrevious,
    setIndexItemRef,
    toggleGroup,
    toggleIndex,
  };
}
