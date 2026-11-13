/*
  파일명: /components/features/library/curated/CuratedListContents.tsx
  기능: 선정 목록의 반응형 진열. 카드는 한 번만 렌더링한다.
  책임: 두 가지 보기를 준다 — 기본은 상자 격자로 한 구간(10~20편)부터 보이고 「+N」·「전체보기」로 늘리는 「격자 보기」,
        다른 하나는 한 편씩 크게 보는 「펼쳐보기」(CuratedListExpand). 3열 격자는 아무것도 읽을 수 없었고,
        펼쳐보기만 두면 표지가 벽처럼 늘어선 맛이 사라진다(26.09.13 유저 지적).
        조작 줄은 같은 모양의 단추 둘이다. 왼쪽은 격자에서 「구간 목록」, 펼침에서 「작품 목록」 모달을 열고,
        오른쪽은 보는 방식을 고른다. 두 보기는 고른 작품 번호 하나를 나눠 쓴다 —
        격자의 구간은 그 번호가 든 구간이고, 펼침은 그 번호를 띄운다. 보기를 바꿔도 보던 자리가 이어진다.
*/ // ------------------------------
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, ListOrdered, Maximize2, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CuratedListDetail } from "@/actions/library/types";
import ArchiveIndexToggle from "@/components/features/user/contentLibrary/controlBar/ArchiveIndexToggle";
import { ExpandBottomNavigation } from "@/components/features/user/contentLibrary/expand/ExpandNavigation";
import FilterModal from "@/components/shared/filters/FilterModal";
import { cn } from "@/lib/utils";
import useMediaQuery from "@/hooks/useMediaQuery";

import CuratedListExpand, { MOBILE_STICKY_BAR_CLASS } from "./CuratedListExpand";
import { CuratedTileGrid } from "./CuratedListGrid";
import CuratedRangeIndex, { rangeLabel, type Range } from "./CuratedRangeIndex";

type ViewMode = "grid" | "focus";
type OpenPanel = "index" | "mode" | null;

/** 구간 크기. 100편까지는 10편씩, 그보다 크면 20편씩 — 구간 수가 열 개 안팎이 되게 */
const rangeSizeFor = (total: number) => (total <= 100 ? 10 : 20);
/** 화면 맨 위 고정 머리글(64px)에 격자 머리가 가리지 않을 최소 높이 */
const HEADER_OFFSET = 80;

export default function CuratedListContents({ list }: { list: CuratedListDetail }) {
  const t = useTranslations("library.curated");
  const { items } = list;
  const total = items.length;
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  /* 기본 구간 뒤로 더 펼친 편수. 「+N」이 한 구간씩 늘리고 「전체보기」가 끝까지 채운다 */
  const [extraCount, setExtraCount] = useState(0);
  const gridRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const revealRequestedRef = useRef(false);

  const rangeSize = rangeSizeFor(total);
  const ranges = useMemo(() => {
    const out: Range[] = [];
    for (let start = 0; start < total; start += rangeSize) {
      out.push({ start, end: Math.min(total, start + rangeSize) });
    }
    return out;
  }, [total, rangeSize]);
  const rangeIndex = Math.min(ranges.length - 1, Math.floor(selectedIndex / rangeSize));
  const range = ranges[rangeIndex];
  const isGrid = isDesktop || viewMode === "grid";
  /* 격자가 그리는 범위 — PC는 처음부터, 모바일은 고른 구간부터 시작해 더 펼친 만큼 뒤로 늘어난다 */
  const shownStart = isDesktop ? 0 : (range?.start ?? 0);
  const shownEnd = Math.min(total, shownStart + rangeSize + extraCount);
  const gridItems = items.slice(shownStart, shownEnd);
  const nextCount = Math.min(rangeSize, total - shownEnd);

  const togglePanel = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  /* 격자 윗변이 고정 띠 밑에 들어가 있으면 띠 바로 아래로 맞춘다. 펼친 격자는 길이가 바뀌므로
     새 내용이 그려진 뒤에 잰다. 띠 아랫변은 화면 좌표로 재지 않고 붙는 자리(top)와 높이로 셈한다 —
     격자가 줄어 문서가 짧아진 직후에는 붙은 띠의 화면 좌표가 낡은 값으로 나온다 */
  useLayoutEffect(() => {
    if (!revealRequestedRef.current) return;
    revealRequestedRef.current = false;
    const bar = barRef.current;
    const limit = bar ? (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight : HEADER_OFFSET;
    const top = gridRef.current?.getBoundingClientRect().top ?? limit;
    if (top < limit) {
      window.scrollTo({ top: window.scrollY + top - limit, behavior: "instant" });
    }
  }, [selectedIndex, extraCount]);

  /* 구간을 바꾸면 그 구간의 첫 작품을 고른 것으로 두고 더 펼친 것은 접는다 */
  const goRange = (next: number) => {
    const target = ranges[(next + ranges.length) % ranges.length];
    if (!target) return;
    revealRequestedRef.current = true;
    setSelectedIndex(target.start);
    setExtraCount(0);
    setOpenPanel(null);
  };

  /* 전체보기 — 첫 작품부터 끝까지 한 번에 그린다. 뒤 구간을 보던 모바일은 앞쪽이 새로 생기므로 격자 머리로 올린다 */
  const showAll = () => {
    if (shownStart > 0) {
      revealRequestedRef.current = true;
      setSelectedIndex(0);
    }
    setExtraCount(total);
  };

  if (!range) return null;

  const modeOptions = [
    { value: "grid", label: t("viewGrid"), icon: <LayoutGrid size={16} aria-hidden /> },
    { value: "focus", label: t("viewFocus"), icon: <Maximize2 size={16} aria-hidden /> },
  ];

  /* 조작 줄 — 왼쪽은 목록(구간·작품), 오른쪽은 보는 방식. 같은 모양으로 나란히.
     격자에서는 이 줄만, 펼쳐보기에서는 「← 제목 →」 머리까지 함께 고정 머리글 아래에 붙어 따라온다 */
  const toolbar = (
    <div className="grid grid-cols-2 gap-2">
      <ArchiveIndexToggle
        isOpen={openPanel === "index"}
        onToggle={() => togglePanel("index")}
        label={isGrid ? t("rangeButton", { range: rangeLabel({ start: shownStart, end: shownEnd }) }) : t("itemIndex")}
        icon={isGrid ? ListOrdered : Menu}
        className="min-w-0"
      />
      <ArchiveIndexToggle
        isOpen={openPanel === "mode"}
        onToggle={() => togglePanel("mode")}
        label={isGrid ? t("viewGrid") : t("viewFocus")}
        icon={isGrid ? LayoutGrid : Maximize2}
        className="min-w-0"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {isGrid ? (
        <>
          <div ref={barRef} className={cn(MOBILE_STICKY_BAR_CLASS, "md:hidden")}>
            {toolbar}
          </div>
          <section
            ref={gridRef}
            className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015]"
          >
            <div className="p-3 md:p-5">
              <CuratedTileGrid list={list} items={gridItems} columnsClassName="grid-cols-2 md:grid-cols-5 lg:grid-cols-6" />
              {nextCount > 0 && <div className="flex items-center justify-center gap-2 pt-4">
                <button type="button" onClick={() => setExtraCount(count => count + nextCount)}
                  aria-label={t("showMoreLabel", { count: nextCount })}
                  className="min-h-11 rounded-lg border border-white/[0.08] px-4 py-2 font-mono text-[13px] tabular-nums text-text-secondary hover:border-accent/40 hover:text-accent">
                  {t("showMore", { count: nextCount })}
                </button>
                <button type="button" onClick={showAll}
                  className="min-h-11 rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent">
                  {t("showAll")}
                </button>
              </div>}
            </div>
            <div className="md:hidden">
              <ExpandBottomNavigation
                label={t("rangeNav")}
                previousLabel={t("rangePrev")}
                nextLabel={t("rangeNext")}
                disabled={ranges.length <= 1}
                onPrevious={() => goRange(rangeIndex - 1)}
                onNext={() => goRange(rangeIndex + 1)}
              />
            </div>
          </section>
        </>
      ) : (
        <CuratedListExpand
          list={list}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          isIndexOpen={openPanel === "index"}
          onIndexOpenChange={(open) => setOpenPanel(open ? "index" : null)}
          toolbar={toolbar}
        />
      )}

      {/* 구간 목록 — 격자 보기에서 왼쪽 단추가 연다. 구간마다 첫 작품 제목을 곁들여 어디쯤인지 짚게 한다 */}
      {!isDesktop && isGrid && openPanel === "index" && (
        <CuratedRangeIndex ranges={ranges} items={items} current={rangeIndex}
          onSelect={goRange} onClose={() => setOpenPanel(null)} />
      )}

      {/* 보는 방식 — 서가 조작대의 모바일 보기 선택과 같은 모달 */}
      <FilterModal
        title={t("viewMode")}
        isOpen={!isDesktop && openPanel === "mode"}
        current={viewMode}
        options={modeOptions}
        onClose={() => setOpenPanel(null)}
        onChange={(value) => {
          setViewMode(value as ViewMode);
          setOpenPanel(null);
        }}
      />
    </div>
  );
}
