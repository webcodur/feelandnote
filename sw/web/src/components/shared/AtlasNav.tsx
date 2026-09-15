/*
  파일명: /components/shared/AtlasNav.tsx
  기능: 탐색 도감 선택기 — 신화 탐색(지역·신화·그룹)과 세력도감(섹션·테마·진영)이 함께 쓴다
  책임: 줄 목록 하나로 넓은 화면의 칩 줄(알약·네모·밑줄 탭)과 좁은 화면의 줄별 선택 단추·창(AtlasPickerSheet)을 그린다.
        항목은 주소 이동(href)이나 화면 안 선택(onSelect) 둘 다 받고, 고를 수 없는 항목은 누르면 잠깐 안내를 띄운다.
        고른 칩은 줄 가운데로 옮긴다. 상자 안에 덧붙는 줄(신화 인물 줄)은 children으로 받는다.
*/ // ------------------------------

"use client";

import { useEffect, type ReactNode } from "react";
import { Clock3 } from "lucide-react";
import AtlasPickerSheet from "@/components/shared/AtlasPickerSheet";
import { ATLAS_NAV_LAYOUT as layout } from "@/components/shared/atlasNavLayout";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface AtlasNavItem {
  id: string;
  name: string;
  count?: number;
  /** 있으면 주소 이동 링크다. 없으면 줄의 onSelect로 넘긴다 */
  href?: string;
  /** 고를 수 없는 항목(작업 예정) — 누르면 줄의 onDisabledSelect만 부른다 */
  disabled?: boolean;
}

export interface AtlasNavRow {
  id: string;
  /** 줄 이름 — 넓은 화면 nav의 aria-label, 좁은 화면 창 제목·단추 설명 */
  label: string;
  /** 윗줄 알약 · 아랫줄 네모 · 셋째 줄 밑줄 탭 */
  shape: "pill" | "square" | "tab";
  items: AtlasNavItem[];
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
}

const DISABLED = "cursor-not-allowed border-dashed border-white/[0.1] bg-transparent text-white/35";
const DISABLED_NOTICE = "cursor-not-allowed border-dashed border-white/25 bg-white/[0.05] text-text-secondary";
const COUNT = "text-xs font-medium text-text-tertiary";

function itemClass(row: AtlasNavRow, item: AtlasNavItem, selected: boolean) {
  if (row.shape === "tab") {
    return cn(layout.groupTab, selected ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-text-primary");
  }
  const tone = selected ? layout.chipSelected : item.disabled ? (row.noticeId === item.id ? DISABLED_NOTICE : DISABLED) : layout.chipIdle[row.shape];
  return cn(layout.chip, row.shape === "pill" ? layout.pill : layout.square, tone);
}

function ChipRow({ row }: { row: AtlasNavRow }) {
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
          const className = itemClass(row, item, selected);
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
              {item.name}
              {item.count !== undefined && <span className={cn(COUNT, row.shape === "tab" && "ms-1.5")}>{item.count}</span>}
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
              aria-label={item.disabled && row.noticeLabel ? `${item.name} · ${row.noticeLabel}` : undefined}
              data-selected={selected || undefined}
              onClick={() => (item.disabled ? row.onDisabledSelect?.(item.id) : row.onSelect?.(item.id))}
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

function MobileRow({ row }: { row: AtlasNavRow }) {
  const active = row.items.find((item) => item.id === row.activeId);
  const notice = (
    <span aria-hidden className="flex shrink-0 items-center gap-1 text-xs font-medium text-text-secondary">
      <Clock3 size={13} aria-hidden />
      {row.noticeLabel}
    </span>
  );

  return (
    <AtlasPickerSheet
      className={row.wide ? "col-span-2" : undefined}
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
          note: row.noticeId === item.id ? notice : undefined,
        })),
      }]}
      onSelect={(_, id) => row.onSelect?.(id)}
      onDisabledSelect={row.onDisabledSelect}
    />
  );
}

export default function AtlasNav({ rows, children }: { rows: AtlasNavRow[]; children?: ReactNode }) {
  return (
    <div className={layout.navigation}>
      <div className={layout.mobilePicker}>
        {rows.map((row) => <MobileRow key={row.id} row={row} />)}
      </div>
      {rows.map((row) => <ChipRow key={row.id} row={row} />)}
      {children}
    </div>
  );
}
