/*
  펼침 보기의 선택 상태와 4열 배치를 조율한다.
  캐러셀·스와이프 없이 목록이나 이전·다음 버튼으로 본문을 즉시 교체한다.
*/
"use client";

import { useDeferredValue, useId, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentBrief } from "@/actions/contents/getContentBrief";
import { cn } from "@/lib/utils";

import { useDesktopLayout } from "../useDesktopLayout";
import { buildExpandPresentation } from "./buildExpandPresentation";
import ExpandCard from "./ExpandCard";
import ExpandIndexRail from "./ExpandIndexRail";
import { getExpandIndexNavigationOrder } from "./groupExpandIndexItems";
import {
  ExpandArrowButton,
  ExpandBottomNavigation,
  ExpandTitleHeader,
} from "./ExpandNavigation";
import { useContentBrief } from "./useContentBrief";
import { useExpandIndexSelection } from "./useExpandIndexSelection";

interface ExpandDetailViewProps {
  items: UserContentWithContent[];
  ownerNickname?: string;
  ownerAvatarUrl?: string | null;
  isActive?: boolean;
  desktopPresentation?: boolean;
  initialContentBrief?: ContentBrief | null;
}

export default function ExpandDetailView({
  items,
  ownerNickname,
  ownerAvatarUrl,
  isActive = true,
  desktopPresentation = false,
  initialContentBrief,
}: ExpandDetailViewProps) {
  const t = useTranslations("archiveSearch");
  const locale = useLocale();
  const indexId = useId();
  const isDesktop = useDesktopLayout();
  const presentation = useMemo(() => buildExpandPresentation(items, locale), [items, locale]);
  const navigationOrder = useMemo(
    () => getExpandIndexNavigationOrder(presentation.groups),
    [presentation.groups],
  );
  const indexLabels = useMemo(() => {
    return {
      list: t("expandIndexLabel"),
      title: t("expandIndexTitle"),
      expand: t("expandIndexExpand"),
      collapse: t("expandIndexCollapse"),
    };
  }, [t]);
  const total = items.length;
  // 제목·선택 표시는 즉시 바꾸되 긴 감상배경 본문 교체는 낮은 우선순위로 렌더한다.
  // 빠른 연속 선택에서는 중간 본문 렌더를 버리고 마지막 선택만 완성할 수 있다.
  const {
    collapsedGroupTypes,
    indexNavRef,
    indexPreference,
    isIndexOpen,
    isLatestSelection,
    keepIndexItemVisible,
    keepSelectedItemVisible,
    selectedContentId,
    selectedIndex,
    selectDirectly,
    selectNext,
    selectPrevious,
    setIndexItemRef,
    toggleGroup,
    toggleIndex,
  } = useExpandIndexSelection({
    items,
    groups: presentation.groups,
    navigationOrder,
    desktopPresentation,
    isDesktop,
  });
  const deferredDetailContentId = useDeferredValue(selectedContentId);
  const requestedDetailIndex = deferredDetailContentId
    ? items.findIndex((item) => item.content_id === deferredDetailContentId)
    : -1;
  const safeRequestedDetailIndex = requestedDetailIndex >= 0 ? requestedDetailIndex : selectedIndex;
  const contentIds = useMemo(() => items.map((item) => item.content_id), [items]);
  const {
    contentId: committedDetailContentId,
    brief: committedBrief,
    isLoading: isRequestedBriefLoading,
  } = useContentBrief(
    contentIds,
    safeRequestedDetailIndex,
    selectedContentId,
    isLatestSelection,
    isActive,
    initialContentBrief,
  );
  const committedDetailIndex = committedDetailContentId
    ? items.findIndex((item) => item.content_id === committedDetailContentId)
    : -1;
  const hasCommittedDetail = committedDetailIndex >= 0;
  const renderedDetailIndex = hasCommittedDetail ? committedDetailIndex : selectedIndex;
  const brief = hasCommittedDetail ? committedBrief : null;
  const isBriefLoading = !hasCommittedDetail && isRequestedBriefLoading;
  const isDetailPending = renderedDetailIndex !== selectedIndex || isBriefLoading;
  const isNavigationDisabled = total <= 1;

  if (total === 0) return null;

  return (
    <section
      className={cn(
        "relative -mx-2 grid w-[calc(100%+1rem)] min-w-0 grid-cols-[32px_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-bg-card md:mx-0 md:w-full",
        "md:transition-[grid-template-columns] md:duration-300 md:ease-out",
        indexPreference === null
          ? "md:grid-cols-[48px_184px_minmax(0,1fr)_48px]"
          : isIndexOpen
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
        isOpen={isIndexOpen}
        indexId={indexId}
        navRef={indexNavRef}
        setItemRef={setIndexItemRef}
        labels={indexLabels}
        collapsedGroupTypes={collapsedGroupTypes}
        scrollTargetIndex={
          keepSelectedItemVisible && renderedDetailIndex === selectedIndex
            ? selectedIndex
            : null
        }
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

      <div
        data-testid="expand-detail-body"
        aria-busy={isDetailPending}
        className="col-start-2 row-start-2 min-w-0 md:col-start-3 [&>article]:rounded-none [&>article]:border-0"
      >
        <ExpandCard
          key={items[renderedDetailIndex].id}
          item={items[renderedDetailIndex]}
          brief={brief}
          isBriefLoading={isBriefLoading}
          isActive={isActive}
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
