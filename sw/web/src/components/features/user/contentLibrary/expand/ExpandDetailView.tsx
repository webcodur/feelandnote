/*
  펼침 보기의 선택 상태와 4열 배치를 조율한다.
  캐러셀·스와이프 없이 목록이나 이전·다음 버튼으로 본문을 즉시 교체한다.
*/
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { getLocalizedContent } from "@/lib/utils/editions";
import { cn } from "@/lib/utils";

import { DESKTOP_LAYOUT_QUERY, useDesktopLayout } from "../useDesktopLayout";
import { getContainedListScrollDelta } from "./containedListScroll";
import ExpandCard from "./ExpandCard";
import ExpandIndexRail from "./ExpandIndexRail";
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

export default function ExpandDetailView({
  items,
  ownerNickname,
  ownerAvatarUrl,
}: ExpandDetailViewProps) {
  const t = useTranslations("archiveSearch");
  const locale = useLocale();
  const indexId = useId();
  const isDesktop = useDesktopLayout();
  const [index, setIndex] = useState(0);
  const [indexPreference, setIndexPreference] = useState<boolean | null>(null);
  const indexNavRef = useRef<HTMLElement | null>(null);
  const indexItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = items.length;
  const selectedIndex = Math.min(index, Math.max(0, total - 1));
  const isIndexOpen = indexPreference ?? isDesktop;
  const contentIds = useMemo(() => items.map((item) => item.content_id), [items]);
  const { brief, isLoading: isBriefLoading } = useContentBrief(contentIds, selectedIndex);

  const [renderedItems, setRenderedItems] = useState(items);
  if (renderedItems !== items) {
    setRenderedItems(items);
    setIndex(0);
  }

  useEffect(() => {
    const nav = indexNavRef.current;
    const item = indexItemRefs.current[selectedIndex];
    if (!nav || !item) return;
    const delta = getContainedListScrollDelta(
      nav.getBoundingClientRect(),
      item.getBoundingClientRect(),
    );
    if (delta !== 0) nav.scrollTop += delta;
  }, [selectedIndex]);

  if (total === 0) return null;

  const localized = items.map((item) => getLocalizedContent(item.content, locale));
  const titles = localized.map((content) => content.title);
  const creators = localized.map((content) => content.creator?.replace(/\^/g, ", ") ?? null);
  const previousIndex = selectedIndex === 0 ? total - 1 : selectedIndex - 1;
  const nextIndex = selectedIndex >= total - 1 ? 0 : selectedIndex + 1;
  const isNavigationDisabled = total <= 1;

  const selectIndex = (next: number) => {
    setIndex(next);
    if (!window.matchMedia(DESKTOP_LAYOUT_QUERY).matches) setIndexPreference(false);
  };
  const selectPrevious = () => selectIndex(previousIndex);
  const selectNext = () => selectIndex(nextIndex);

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
        itemIds={items.map((item) => item.id)}
        titles={titles}
        contentTypes={items.map((item) => item.content.type)}
        selectedIndex={selectedIndex}
        isOpen={isIndexOpen}
        indexId={indexId}
        navRef={indexNavRef}
        itemRefs={indexItemRefs}
        labels={{
          list: t("expandIndexLabel"),
          title: t("expandIndexTitle"),
          expand: t("expandIndexExpand"),
          collapse: t("expandIndexCollapse"),
        }}
        onToggle={() => setIndexPreference(!isIndexOpen)}
        onSelect={selectIndex}
      />
      <ExpandTitleHeader
        title={titles[selectedIndex]}
        creator={creators[selectedIndex]}
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
