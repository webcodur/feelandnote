/*
  펼침 보기의 선택 상태와 4열 배치를 조율한다.
  캐러셀·스와이프 없이 목록이나 이전·다음 버튼으로 본문을 즉시 교체한다.
*/
"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef } from "react";
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
import { useCelebContentRecord } from "./useCelebContentRecord";
import { useExpandIndexSelection } from "./useExpandIndexSelection";

/** 화면 맨 위 고정 머리글(64px)에 제목이 가리지 않을 최소 높이 */
const HEADER_OFFSET = 80;
/** 화살표를 누른 직후로 볼 시간. 이보다 늦게 온 선택 변화는 화살표가 부른 것이 아니다 */
const REVEAL_WINDOW_MS = 400;

interface ExpandDetailViewProps {
  items: UserContentWithContent[];
  ownerNickname?: string;
  ownerAvatarUrl?: string | null;
  isActive?: boolean;
  desktopPresentation?: boolean;
  initialContentBrief?: ContentBrief | null;
  initialContentRecord?: UserContentWithContent;
  celebId?: string;
}

export default function ExpandDetailView({
  items,
  ownerNickname,
  ownerAvatarUrl,
  isActive = true,
  desktopPresentation = false,
  initialContentBrief,
  initialContentRecord,
  celebId,
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
  const contentIds = useMemo(() => items.map((item) => item.content_id), [items]);
  const {
    contentId: loadedBriefContentId,
    brief: loadedBrief,
    isLoading: isBriefLoading,
    hasError: hasBriefError,
    retry: retryBrief,
  } = useContentBrief(
    contentIds,
    selectedIndex,
    selectedContentId,
    isLatestSelection,
    isActive,
    initialContentBrief,
  );
  const brief = loadedBriefContentId === selectedContentId ? loadedBrief : null;
  const selectedPlaceholder = items[selectedIndex];
  const {
    record,
    isLoading: isRecordLoading,
    hasError: hasRecordError,
    retry: retryRecord,
  } = useCelebContentRecord(
    celebId,
    selectedContentId,
    initialContentRecord,
    isActive,
  );
  const selectedItem = record?.content_id === selectedContentId ? record : selectedPlaceholder;
  const isNavigationDisabled = total <= 1;

  /* 작품을 넘기면 새 제목부터 읽어야 한다. 긴 감상배경을 내려 보던 중이라면 제목이 화면 위로
     밀려나 있어, 넘긴 뒤에도 이전 작품의 본문 자리를 그대로 보게 된다.
     카드가 화면보다 훨씬 길어 scrollIntoView의 "nearest"는 아래 가장자리로 맞춰 오히려 더 내려간다.
     위로 벗어났을 때만 위쪽으로 맞추고, 제목이 이미 보이면 화면을 건드리지 않는다. */
  const rootRef = useRef<HTMLElement>(null);
  const revealRequestedAtRef = useRef(0);
  const goPrevious = useCallback(() => {
    revealRequestedAtRef.current = performance.now();
    selectPrevious();
  }, [selectPrevious]);
  const goNext = useCallback(() => {
    revealRequestedAtRef.current = performance.now();
    selectNext();
  }, [selectNext]);

  /* 누른 그 자리에서 바로 재면 아직 이전 작품이 그려져 있어 스크롤이 엉뚱한 지점을 향한다.
     새 작품이 배치된 뒤(페인트 전)에 재고 한 번에 옮긴다. 부드럽게 밀면 그 사이 카드 높이가
     바뀌어 목표가 흔들리고 아래로 갔다 오는 것처럼 보인다 — 그래서 즉시 옮긴다.

     시각으로 재는 이유: 화살표를 눌러도 순회 대상이 하나뿐이면 고른 작품이 그대로라 이 자리가
     돌지 않는다. 참·거짓 표식이면 그 요청이 남아 있다가, 나중에 목차에서 고르거나 목록이
     뒤늦게 채워질 때 눌린 적 없는 화면이 튄다. 눌린 직후가 아니면 손대지 않는다. */
  useLayoutEffect(() => {
    const requestedAt = revealRequestedAtRef.current;
    revealRequestedAtRef.current = 0;
    if (requestedAt === 0 || performance.now() - requestedAt > REVEAL_WINDOW_MS) return;

    const root = rootRef.current;
    if (!root) return;
    const { top } = root.getBoundingClientRect();
    if (top >= HEADER_OFFSET) return;
    window.scrollTo({ top: window.scrollY + top - HEADER_OFFSET, behavior: "instant" });
  }, [selectedIndex]);

  if (total === 0) return null;

  return (
    <section
      ref={rootRef}
      data-expand-item-count={total}
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
        onClick={goPrevious}
      />
      <ExpandIndexRail
        groups={presentation.groups}
        isOpen={isIndexOpen}
        indexId={indexId}
        navRef={indexNavRef}
        setItemRef={setIndexItemRef}
        labels={indexLabels}
        collapsedGroupTypes={collapsedGroupTypes}
        scrollTargetIndex={keepSelectedItemVisible ? selectedIndex : null}
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
        onPrevious={goPrevious}
        onNext={goNext}
      />

      <div
        data-testid="expand-detail-body"
        aria-busy={isBriefLoading || isRecordLoading}
        className="col-start-2 row-start-2 min-w-0 md:col-start-3 [&>article]:rounded-none [&>article]:border-0"
      >
        <ExpandCard
          key={selectedItem.id}
          item={selectedItem}
          brief={brief}
          isBriefLoading={isBriefLoading}
          isRecordLoading={isRecordLoading}
          hasBriefError={hasBriefError}
          hasRecordError={hasRecordError}
          onRetryBrief={retryBrief}
          onRetryRecord={retryRecord}
          isActive={isActive}
          ownerNickname={ownerNickname}
          ownerAvatarUrl={ownerAvatarUrl}
        />
        <ExpandBottomNavigation
          label={t("expandBottomNavigation")}
          previousLabel={t("expandPrevBook")}
          nextLabel={t("expandNextBook")}
          disabled={isNavigationDisabled}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      </div>

      <ExpandArrowButton
        direction="next"
        label={t("expandNext")}
        disabled={isNavigationDisabled}
        placement="desktop"
        onClick={goNext}
      />
    </section>
  );
}
