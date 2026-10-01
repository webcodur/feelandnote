"use client";

import { useEffect } from "react";
import { ChevronRight, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import styles from "./AtlasPicker.module.css";

export interface AtlasPickerOption {
  id: string | null;
  name: string;
  count?: number;
  disabled?: boolean;
  scenes?: number;
  themeId?: string;
  context?: string;
}

export default function AtlasPickerOptions({ level, items, currentId, onSelect, searching, transitionKey, loading, error, onRetry, pulseId, nextLabel }: {
  level: number; items: AtlasPickerOption[]; currentId: string | null;
  onSelect: (item: AtlasPickerOption) => void; searching: boolean;
  transitionKey: string; loading: boolean; error: boolean; onRetry: () => void;
  pulseId: string | null; nextLabel?: string;
}) {
  const t = useTranslations("explore.ui.atlas");
  const tScenes = useTranslations("explore.hub.myth");
  const scenesLabel = tScenes("keyScenes");
  const { ref, cursorClassName, dragProps } = useMouseDragScroll("y");
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const revealSelected = () => {
      const selected = list.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!selected || !list.offsetHeight) return;
      const bounds = list.getBoundingClientRect();
      const scale = bounds.height / list.offsetHeight;
      if (!scale) return;
      const item = selected.getBoundingClientRect();
      const top = bounds.top + (list.clientTop + 8) * scale;
      const bottom = bounds.top + (list.clientTop + list.clientHeight - 8) * scale;
      if (item.top < top) list.scrollTop += (item.top - top) / scale;
      else if (item.bottom > bottom) list.scrollTop += (item.bottom - bottom) / scale;
    };
    revealSelected();
    const observer = new ResizeObserver(revealSelected);
    observer.observe(list);
    return () => observer.disconnect();
  }, [currentId, ref, transitionKey, loading]);
  return (
    <div ref={ref} {...dragProps} role="tabpanel" tabIndex={0} id="atlas-panel" aria-busy={loading} aria-labelledby={searching ? "atlas-search-results" : `atlas-tab-${level}`} data-atlas-panel data-atlas-column={level}
      className={`${cursorClassName} custom-scrollbar flex h-[clamp(210px,40dvh,306px)] min-h-0 max-h-[44dvh] flex-col overflow-y-auto select-none rounded-xl border border-white/10 bg-bg-secondary p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 sm:h-[258px] sm:max-h-[min(36dvh,300px)] [overflow-anchor:none]`}>
      {/* 모바일은 화면 높이에 따라 목록 공간을 늘린다. 넘치는 목록의 자동 여백은 0으로 줄어 첫 행을 보존한다. */}
      <div key={transitionKey} data-atlas-panel-content className={`my-auto flex shrink-0 flex-wrap items-start justify-center gap-2 ${loading ? "" : styles.panelEnter}`}>
        {(loading || error) && <div role="status" className="flex min-h-20 w-full items-center justify-center gap-3 text-sm text-text-secondary">
          {t(error ? "loadError" : "loading")}
          {error && <button type="button" onClick={onRetry} className="rounded border border-accent/50 px-3 py-2 text-accent outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent">{t("retry")}</button>}
        </div>}
        {!loading && !error && items.map((item) => {
          const selected = item.id === currentId;
          const pulse = Boolean(nextLabel && selected && item.id === pulseId);
          return (
            <button key={item.id ?? "all"} data-atlas-option={item.id ?? "all"} type="button" disabled={item.disabled} aria-pressed={selected} title={item.disabled ? t("comingSoon") : level === 2 && selected && !searching ? t("clickAgainConfirm") : pulse ? t("openNext", { next: nextLabel! }) : undefined} aria-describedby={pulse || level === 2 ? "atlas-picker-hint" : undefined}
              aria-label={[item.name, item.context, item.count, item.scenes ? scenesLabel : null].filter((value) => value !== null && value !== undefined).join(" · ")}
              onClick={() => onSelect(item)}
              className={`relative isolate flex min-h-10 min-w-0 max-w-full touch-manipulation items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${selected ? "border-accent/60 text-accent hover:bg-accent/10" : "border-white/15 text-text-primary hover:border-white/40 hover:bg-white/5"} disabled:cursor-default disabled:text-text-tertiary disabled:opacity-50`}>
              <span aria-hidden data-atlas-chip-light className={`pointer-events-none absolute -inset-px -z-10 rounded-full bg-accent/10 shadow-[inset_0_0_12px_rgba(212,175,55,0.12)] transition-opacity duration-200 ease-out motion-reduce:transition-none ${selected ? "opacity-100" : "opacity-0"}`} />
              {pulse && <span aria-hidden data-atlas-pulse className={`pointer-events-none absolute -inset-px rounded-full border border-accent/60 ${styles.chipPulse}`} />}
              {Boolean(item.scenes) && <span title={scenesLabel} className="shrink-0 text-accent"><Images size={13} aria-hidden /></span>}
              <span className="min-w-0 break-keep [overflow-wrap:anywhere]">
                {item.name}
                {item.context && <span className="ms-1.5 text-xs font-normal text-text-secondary">{item.context}</span>}
              </span>
              {item.disabled && <span className="shrink-0 text-xs font-medium text-text-tertiary">{t("comingSoon")}</span>}
              {!item.disabled && item.count !== undefined && <span className="shrink-0 text-xs font-medium tabular-nums text-text-secondary">{item.count}</span>}
              {nextLabel && <ChevronRight aria-hidden data-atlas-open-next size={12} className={`pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 rounded-full border border-accent/60 bg-bg-main text-accent transition-opacity duration-200 motion-reduce:transition-none ${pulse ? "opacity-100" : "opacity-0"}`} />}
            </button>
          );
        })}
        {!loading && !error && items.length === 0 && <p role="status" className="p-2 text-sm text-text-secondary">{t(searching ? "noResults" : "comingSoon")}</p>}
      </div>
    </div>
  );
}
