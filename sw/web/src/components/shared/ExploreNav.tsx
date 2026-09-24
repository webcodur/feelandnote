/*
  파일명: /components/shared/ExploreNav.tsx
  기능: 탐색 도감 선택기 — 신화 탐색(지역·신화·그룹)과 세력도감(섹션·테마·진영)이 함께 쓴다
  책임: 줄 목록 하나로 넓은 화면의 칩 줄(알약·네모·밑줄 탭)과 좁은 화면의 줄별 선택 단추·창(ExplorePickerSheet)을 그린다.
        항목은 주소 이동(href)이나 화면 안 선택(onSelect) 둘 다 받고, 고를 수 없는 항목은 누르면 잠깐 안내를 띄운다.
        선택을 풀 수 있는 줄(onClear)은 고른 항목 끝에 ×를 붙이고, 그 항목을 다시 누르면 선택을 푼다.
        고른 칩은 줄 가운데로 옮긴다. 상자 안에 덧붙는 줄(신화 인물 줄)은 children으로 받는다.
        바깥 윤곽선이 따로 있는 화면(신화 탐색)은 bareOnMobile로 좁은 화면의 상자 겹침을 걷는다.
*/ // ------------------------------

"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { useTranslations } from "next-intl";
import ExplorePickerSheet from "@/components/shared/ExplorePickerSheet";
import { EXPLORE_NAV_LAYOUT as layout } from "@/components/shared/exploreNavLayout";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface ExploreNavItem {
  id: string;
  name: string;
  count?: number;
  /** 이름 앞에 붙는 그림(매체 아이콘 등) */
  icon?: ReactNode;
  /** 있으면 주소 이동 링크다. 없으면 줄의 onSelect로 넘긴다 */
  href?: string;
  /** 고를 수 없는 항목(작업 예정) — 누르면 줄의 onDisabledSelect만 부른다 */
  disabled?: boolean;
  /** 고른 칩을 accent 대신 이 색으로 그린다 — 항목마다 고유색이 있을 때(스펙트럼 축) 쓴다 */
  color?: string;
}

export interface ExploreNavRow {
  id: string;
  /** 줄 이름 — 넓은 화면 nav의 aria-label, 좁은 화면 창 제목·단추 설명 */
  label: string;
  /** 윗줄 알약 · 아랫줄 네모 · 셋째 줄 밑줄 탭 */
  shape: "pill" | "square" | "tab";
  items: ExploreNavItem[];
  activeId: string | null;
  onSelect?: (id: string) => void;
  onDisabledSelect?: (id: string) => void;
  /** 잠깐 안내를 띄울 고를 수 없는 항목 */
  noticeId?: string | null;
  /** 고를 수 없는 항목의 안내 문구(예: 「작업 예정」) */
  noticeLabel?: string;
  /** 고른 항목이 없을 때 좁은 화면 단추에 보일 글 */
  emptyLabel?: string;
  /** 좁은 화면 단추를 한 줄 전체 폭으로 — 기본은 반 폭 */
  wide?: boolean;
  /** 좁은 화면에서 선택기 양옆에 이전·다음 화살표를 붙인다 */
  mobileArrows?: boolean;
  /** 있으면 고른 항목을 다시 눌러 선택을 푼다(신화 그룹 줄). 화면 안 선택(onSelect) 줄에서만 쓴다 */
  onClear?: () => void;
  /** 선택 풀기 안내 — 고른 칩의 제목·읽기 도구 이름에 붙는다 */
  clearLabel?: string;
}

const DISABLED = "cursor-not-allowed border-dashed border-white/[0.1] bg-transparent text-white/35";
const DISABLED_NOTICE = "cursor-not-allowed border-dashed border-white/25 bg-white/[0.05] text-text-secondary";
const COUNT = "text-xs font-medium text-text-tertiary";

function itemClass(row: ExploreNavRow, item: ExploreNavItem, selected: boolean) {
  if (row.shape === "tab") {
    return cn(layout.groupTab, selected
      ? item.color ? "border-(--chip-c) text-(--chip-c)" : "border-accent text-accent"
      : "border-transparent text-text-secondary hover:text-text-primary");
  }
  const tone = selected
    ? item.color
      ? "border-(--chip-c) bg-(--chip-c)/10 text-(--chip-c) hover:bg-(--chip-c)/20"
      : layout.chipSelected
    : item.disabled ? (row.noticeId === item.id ? DISABLED_NOTICE : DISABLED) : layout.chipIdle[row.shape];
  return cn(layout.chip, row.shape === "pill" ? layout.pill : layout.square, tone);
}

function ChipRow({ row }: { row: ExploreNavRow }) {
  const { ref, cursorClassName, dragProps } = useMouseDragScroll();

  /* 고른 칩을 줄 가운데로 옮긴다 — 한 줄짜리 목록이라 고른 칩이 화면 밖에 있을 수 있다 */
  useEffect(() => {
    const scroller = ref.current;
    const selected = scroller?.querySelector<HTMLElement>("[data-selected]");
    if (!scroller || !selected) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    scroller.scrollLeft += selectedRect.left - scrollerRect.left - (scrollerRect.width - selectedRect.width) / 2;
  }, [row.activeId, ref]);

  return (
    <nav className={layout.chipNav} aria-label={row.label}>
      <div ref={ref} {...dragProps} className={cn(layout.navList, cursorClassName)}>
        {row.items.map((item) => {
          const selected = item.id === row.activeId;
          const clears = selected && Boolean(row.onClear);
          const className = itemClass(row, item, selected);
          const style = item.color ? { "--chip-c": item.color } as CSSProperties : undefined;
          const showingNotice = row.noticeId === item.id;
          const content = item.disabled ? (
            /* 누르면 이름 자리에 잠깐 안내를 띄웠다 돌아온다. 두 글을 한 칸에 겹쳐 두어 칩 폭이 그대로다 — 폭이 바뀌면 옆 칩이 밀린다 */
            <span className="grid">
              <span className={cn("[grid-area:1/1]", showingNotice && "invisible")}>{item.name}</span>
              <span aria-hidden className={cn("[grid-area:1/1] flex items-center justify-center gap-1 whitespace-nowrap", !showingNotice && "invisible")}>
                <Clock3 size={13} aria-hidden />
                {row.noticeLabel}
              </span>
            </span>
          ) : (
            <>
              {item.icon}
              {item.name}
              {item.count !== undefined && <span className={cn(COUNT, row.shape === "tab" && "ms-1.5")}>{item.count}</span>}
              {clears && <X size={12} aria-hidden className="ms-1 shrink-0" />}
            </>
          );

          if (item.href && !item.disabled) {
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                scroll={false}
                draggable={false}
                aria-current={selected ? "true" : undefined}
                data-selected={selected || undefined}
                style={style}
                className={className}
              >
                {content}
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              aria-label={
                item.disabled && row.noticeLabel ? `${item.name} · ${row.noticeLabel}`
                  : clears && row.clearLabel ? `${item.name} · ${row.clearLabel}`
                  : undefined
              }
              title={clears ? row.clearLabel : undefined}
              data-selected={selected || undefined}
              style={style}
              onClick={() => (item.disabled ? row.onDisabledSelect?.(item.id) : clears ? row.onClear?.() : row.onSelect?.(item.id))}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobileRow({ row }: { row: ExploreNavRow }) {
  const t = useTranslations("explore.ui");
  const router = useRouter();
  const active = row.items.find((item) => item.id === row.activeId);
  const choices = row.items.filter((item) => !item.disabled && (item.href || row.onSelect));
  const cycleIds = row.onClear ? [null, ...choices.map((item) => item.id)] : choices.map((item) => item.id);
  const canStep = cycleIds.length > 1;
  const step = (direction: -1 | 1) => {
    if (!canStep) return;
    const currentIndex = cycleIds.indexOf(row.activeId);
    const nextIndex = (currentIndex + direction + cycleIds.length) % cycleIds.length;
    const nextId = cycleIds[nextIndex];
    if (nextId === null) {
      row.onClear?.();
      return;
    }
    const next = choices.find((item) => item.id === nextId);
    if (next?.href) router.push(next.href, { scroll: false });
    else row.onSelect?.(nextId);
  };
  const notice = (
    <span aria-hidden className="flex shrink-0 items-center gap-1 text-xs font-medium text-text-secondary">
      <Clock3 size={13} aria-hidden />
      {row.noticeLabel}
    </span>
  );

  const picker = (
    <ExplorePickerSheet
      className={row.wide && !row.mobileArrows ? "col-span-2" : undefined}
      title={row.label}
      label={
        active ? (
          <>
            {active.name}
            {active.count !== undefined && <span className={cn(COUNT, "ms-1.5")}>{active.count}</span>}
          </>
        ) : (
          row.emptyLabel ?? ""
        )
      }
      activeItemId={row.activeId}
      groups={[{
        id: row.id,
        items: row.items.map((item) => ({
          id: item.id,
          name: item.name,
          count: item.count,
          href: item.href,
          disabled: item.disabled,
          note: row.noticeId === item.id
            ? notice
            : row.onClear && item.id === row.activeId ? <X size={13} aria-hidden className="shrink-0" /> : undefined,
        })),
      }]}
      onSelect={(_, id) => (row.onClear && id === row.activeId ? row.onClear() : row.onSelect?.(id))}
      onDisabledSelect={row.onDisabledSelect}
      wrapLabel={row.mobileArrows}
    />
  );

  if (!row.mobileArrows) return picker;

  const arrowClass = "grid size-10 place-items-center rounded-lg border border-accent/35 bg-accent/[0.06] text-accent hover:border-accent hover:bg-accent/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default disabled:border-white/10 disabled:bg-transparent disabled:text-text-tertiary";
  return (
    <div className="col-span-2 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
      <button type="button" onClick={() => step(-1)} disabled={!canStep} aria-label={`${t("prev")} ${row.label}`} className={arrowClass}>
        <ChevronLeft size={18} aria-hidden />
      </button>
      {picker}
      <button type="button" onClick={() => step(1)} disabled={!canStep} aria-label={`${t("next")} ${row.label}`} className={arrowClass}>
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}

export default function ExploreNav({ rows, children, bareOnMobile = false }: { rows: ExploreNavRow[]; children?: ReactNode; bareOnMobile?: boolean }) {
  return (
    <div className={cn(layout.navigation, bareOnMobile && layout.navigationBareMobile)}>
      <div className={layout.mobilePicker}>
        {rows.map((row) => <MobileRow key={row.id} row={row} />)}
      </div>
      {rows.map((row) => <ChipRow key={row.id} row={row} />)}
      {children}
    </div>
  );
}
