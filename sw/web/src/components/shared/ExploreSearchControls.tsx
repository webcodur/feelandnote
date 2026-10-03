"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

/*
  탐색 두 모드의 검색·정렬·필터 조작. 바깥 상자로 한 번 더 감싸지 않는다 — 입력창과 단추가 각자 면을 가지므로
  상자 안 상자가 된다. 선택 단추는 모두 같은 모양(카드 면 + 얇은 선)이고, 기본값에서 벗어나면 글자·선만 금색으로 바뀐다.
  매체 범주 칩은 CategoryChip이 쥔다.
*/
export const EXPLORE_PANEL_CLASS = "mx-auto mb-5 w-full max-w-2xl space-y-3 md:mb-6";
export const EXPLORE_CONTROL_CLASS = "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control border border-line bg-bg-card px-3 text-sm font-medium text-text-primary hover:border-line-strong hover:bg-bg-raised outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";
/** 선택 단추가 기본값에서 벗어났을 때 덧붙인다 */
export const EXPLORE_CONTROL_CHANGED_CLASS = "border-accent/45 text-accent hover:border-accent/70";

/*
  배치는 모든 폭에서 두 줄이다 — 검색창이 한 줄을 다 쓰고, 선택 단추 셋(인물: 리뷰 유무 | 정렬 | 필터,
  작품: 국가 | 주제 | 기관)은 그 아래 줄을 같은 폭으로 나눈다. 넓은 화면에서 검색창 옆에 단추를 붙이면
  단추 글자 길이에 따라 검색창 폭이 모드마다 달라지고, 두 모드의 조작 줄 모양이 어긋난다.
*/
export default function ExploreSearchControls({ value, placeholder, searchLabel, clearLabel, onChange, onSubmit, onClear, disabled = false, children }: {
  value: string;
  placeholder: string;
  searchLabel: string;
  clearLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  disabled?: boolean;
  /** 선택 단추 셋 */
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <form className="flex min-h-11 min-w-0 items-center rounded-control border border-line bg-bg-card hover:border-line-strong focus-within:border-accent/60"
        onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}
          aria-label={placeholder} className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:appearance-none" />
        {value && <button type="button" onClick={onClear} aria-label={clearLabel}
          className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={14} /></button>}
        <button type="submit" disabled={disabled} aria-label={searchLabel}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"><Search size={17} /></button>
      </form>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}
