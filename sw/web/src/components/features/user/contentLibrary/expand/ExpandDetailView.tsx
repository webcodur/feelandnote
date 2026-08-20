/*
  펼침 보기의 선택 상태와 4열 배치를 조율한다.
  캐러셀·스와이프 없이 목록이나 이전·다음 버튼으로 본문을 즉시 교체한다.
*/
"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { CATEGORIES } from "@/constants/categories";
import { getLocalizedContent } from "@/lib/utils/editions";
import { cn } from "@/lib/utils";

import { DESKTOP_LAYOUT_QUERY, useDesktopLayout } from "../useDesktopLayout";
import { getContainedListScrollDelta } from "./containedListScroll";
import ExpandCard from "./ExpandCard";
import ExpandIndexRail from "./ExpandIndexRail";
import {
  getExpandIndexNavigationOrder,
  getExpandIndexNeighbor,
  groupExpandIndexItems,
} from "./groupExpandIndexItems";
import {
  ExpandArrowButton,
  ExpandBottomNavigation,
  ExpandTitleHeader,
} from "./ExpandNavigation";
import { useContentBrief } from "./useContentBrief";

interface ExpandDetailViewProps {
  items: UserContentWithContent[];
  ownerNickname?: string;
  ownerAvatarUrl?: string | null;
}

const CATEGORY_DB_ORDER = CATEGORIES.map((category) => category.dbType);

interface ExpandSelection {
  contentId: string | null;
  keepIndexItemVisible: boolean;
}

export default function ExpandDetailView({
  items,
  ownerNickname,
  ownerAvatarUrl,
}: ExpandDetailViewProps) {
  const t = useTranslations("archiveSearch");
  const locale = useLocale();
  const indexId = useId();
  const isDesktop = useDesktopLayout();
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

  const total = items.length;
  const selectedItemIndex = selection.contentId
    ? items.findIndex((item) => item.content_id === selection.contentId)
    : -1;
  const selectedIndex = selectedItemIndex >= 0 ? selectedItemIndex : 0;
  const isIndexOpen = indexPreference ?? isDesktop;
  const contentIds = useMemo(() => items.map((item) => item.content_id), [items]);
  const { brief, isLoading: isBriefLoading } = useContentBrief(contentIds, selectedIndex);
  const presentation = useMemo(() => {
    const localized = items.map((item) => getLocalizedContent(item.content, locale));
    const titles = localized.map((content) => content.title);
    return {
      titles,
      creators: localized.map((content) => content.creator?.replace(/\^/g, ", ") ?? null),
      groups: groupExpandIndexItems(
        {
          itemIds: items.map((item) => item.id),
          titles,
          contentTypes: items.map((item) => item.content.type),
        },
        CATEGORY_DB_ORDER,
      ),
    };
  }, [items, locale]);
  const navigationOrder = useMemo(
    () => getExpandIndexNavigationOrder(presentation.groups),
    [presentation.groups],
  );

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
  const isNavigationDisabled = total <= 1;

  const selectIndex = useCallback(
    (next: number, keepIndexItemVisible: boolean) => {
      const nextItem = items[next];
      if (!nextItem) return;

      setSelection({
        contentId: nextItem.content_id,
        keepIndexItemVisible,
      });

      if (keepIndexItemVisible) {
        const targetGroupType = presentation.groups.find((group) =>
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
    [items, presentation.groups],
  );
  const selectDirectly = useCallback(
    (next: number) => selectIndex(next, false),
    [selectIndex],
  );
  const selectPrevious = useCallback(
    () => selectIndex(previousIndex, true),
    [previousIndex, selectIndex],
  );
  const selectNext = useCallback(
    () => selectIndex(nextIndex, true),
    [nextIndex, selectIndex],
  );
  const toggleIndex = useCallback(() => {
    setIndexPreference((current) => !(current ?? isDesktop));
  }, [isDesktop]);
  const toggleGroup = useCallback((dbType: string) => {
    setCollapsedGroupTypes((current) => {
      const next = new Set(current);
      if (next.has(dbType)) next.delete(dbType);
      else next.add(dbType);
      return next;
    });
  }, []);

  if (total === 0) return null;

  return (
    <section
      className={cn(
        "relative -mx-2 grid w-[calc(100%+1rem)] min-w-0 grid-cols-[32px_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-bg-card md:mx-0 md:w-full",
        "md:transition-[grid-template-columns] md:duration-300 md:ease-out",
        isIndexOpen
          ? "md:grid-cols-[48px_184px_minmax(0,1fr)_48px]"
          : "md:grid-cols-[48px_48px_minmax(0,1fr)_48px]",
      )}
    >
      <ExpandArrowButton
        direction="previous"
        label={t("expandPrev")}
        disabled={isNavigationDisabled}
        placement="desktop"
        onClick={selectPrevious}
      />
      <ExpandIndexRail
        groups={presentation.groups}
        selectedIndex={selectedIndex}
        isOpen={isIndexOpen}
        indexId={indexId}
        navRef={indexNavRef}
        setItemRef={setIndexItemRef}
        labels={{
          list: t("expandIndexLabel"),
          title: t("expandIndexTitle"),
          expand: t("expandIndexExpand"),
          collapse: t("expandIndexCollapse"),
        }}
        collapsedGroupTypes={collapsedGroupTypes}
        keepSelectedItemVisible={selection.keepIndexItemVisible}
        onToggle={toggleIndex}
        onToggleGroup={toggleGroup}
        onSelect={selectDirectly}
        onSelectedItemReady={keepIndexItemVisible}
      />
      <ExpandTitleHeader
        title={presentation.titles[selectedIndex]}
        creator={presentation.creators[selectedIndex]}
        previousLabel={t("expandPrev")}
        nextLabel={t("expandNext")}
        disabled={isNavigationDisabled}
        onPrevious={selectPrevious}
        onNext={selectNext}
      />

      <div className="col-start-2 row-start-2 min-w-0 md:col-start-3 [&>article]:rounded-none [&>article]:border-0">
        <ExpandCard
          key={items[selectedIndex].id}
          item={items[selectedIndex]}
          brief={brief}
          isBriefLoading={isBriefLoading}
          isActive
          ownerNickname={ownerNickname}
          ownerAvatarUrl={ownerAvatarUrl}
        />
        <ExpandBottomNavigation
          label={t("expandBottomNavigation")}
          previousLabel={t("expandPrevBook")}
          nextLabel={t("expandNextBook")}
          disabled={isNavigationDisabled}
          onPrevious={selectPrevious}
          onNext={selectNext}
        />
      </div>

      <ExpandArrowButton
        direction="next"
        label={t("expandNext")}
        disabled={isNavigationDisabled}
        placement="desktop"
        onClick={selectNext}
      />
    </section>
  );
}
