"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

export const EXPLORE_PANEL_CLASS = "mx-auto mb-5 w-full max-w-xl space-y-2 rounded-xl border border-white/10 bg-white/[0.025] p-2 md:mb-7 md:p-2.5";
export const EXPLORE_CONTROL_CLASS = "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-2 text-xs font-medium text-text-primary hover:bg-white/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

export default function ExploreSearchControls({ value, placeholder, searchLabel, clearLabel, onChange, onSubmit, onClear, disabled = false, controlColumns = 3, children }: {
  value: string;
  placeholder: string;
  searchLabel: string;
  clearLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  disabled?: boolean;
  controlColumns?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${controlColumns === 2 ? "grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"}`}>
      <form className="col-span-full flex min-h-11 min-w-0 items-center rounded-md border border-white/10 bg-black/15 focus-within:border-accent/60 md:col-span-1"
        onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}
          aria-label={placeholder} className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-secondary/60 [&::-webkit-search-cancel-button]:appearance-none" />
        {value && <button type="button" onClick={onClear} aria-label={clearLabel}
          className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={14} /></button>}
        <button type="submit" disabled={disabled} aria-label={searchLabel}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded text-text-secondary hover:bg-white/10 hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"><Search size={17} /></button>
      </form>
      {children}
    </div>
  );
}
