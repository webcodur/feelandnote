/*
  파일명: /components/features/library/curated/CuratedListContents.tsx
  기능: 선정 목록의 반응형 진열. 카드는 한 번만 렌더링한다.
  책임: 두 가지 보기를 준다 — 기본은 2열 상자 격자로 한 구간(10~20편)씩 보이는 「격자 보기」,
        다른 하나는 한 편씩 크게 보는 「펼쳐보기」(CuratedListExpand). 3열 격자는 아무것도 읽을 수 없었고,
        펼쳐보기만 두면 표지가 벽처럼 늘어선 맛이 사라진다(26.09.13 유저 지적).
        조작 줄은 같은 모양의 단추 둘이다. 왼쪽은 격자에서 「구간 목록」, 펼침에서 「작품 목록」 모달을 열고,
        오른쪽은 보는 방식을 고른다. 두 보기는 고른 작품 번호 하나를 나눠 쓴다 —
        격자의 구간은 그 번호가 든 구간이고, 펼침은 그 번호를 띄운다. 보기를 바꿔도 보던 자리가 이어진다.
*/ // ------------------------------
"use client";

import { useMemo, useRef, useState } from "react";
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
  const [visibleCount, setVisibleCount] = useState(() => rangeSizeFor(total));
  const gridRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

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
  const rangeItems = range ? items.slice(range.start, range.end) : [];
  const isGrid = isDesktop || viewMode === "grid";
  const gridItems = isDesktop ? items.slice(0, visibleCount) : rangeItems;
  const nextCount = Math.min(rangeSize, total - visibleCount);

  const togglePanel = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  /* 구간을 바꾸면 그 구간의 첫 작품을 고른 것으로 두고, 격자 윗변이 고정 띠 밑에 들어가 있으면 띠 바로 아래로 맞춘다.
     격자 자리는 내용이 바뀌어도 움직이지 않으므로 바꾸기 전에 재도 된다 */
  const goRange = (next: number) => {
    const target = ranges[(next + ranges.length) % ranges.length];
    if (!target) return;
    setSelectedIndex(target.start);
    setOpenPanel(null);
    const limit = barRef.current?.getBoundingClientRect().bottom ?? HEADER_OFFSET;
    const top = gridRef.current?.getBoundingClientRect().top ?? limit;
    if (top < limit) {
      window.scrollTo({ top: window.scrollY + top - limit, behavior: "instant" });
    }
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
        label={isGrid ? t("rangeButton", { range: rangeLabel(range) }) : t("itemIndex")}
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
              {nextCount > 0 && <div className="hidden pt-4 text-center md:block">
                <button type="button" onClick={() => setVisibleCount(count => count + nextCount)}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] text-text-secondary hover:border-accent/40 hover:text-accent">
                  {t("showRemaining", { count: nextCount })}
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
