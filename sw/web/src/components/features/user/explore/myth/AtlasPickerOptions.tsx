"use client";

import { ChevronRight, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./AtlasPicker.module.css";
import SceneCompletionBadge from "./SceneCompletionBadge";

export interface AtlasPickerOption {
  id: string | null;
  name: string;
  count?: number;
  disabled?: boolean;
  scenes?: number;
  scenesComplete?: boolean;
  completedSceneNames?: string[];
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
  const showCompletionLegend = !searching && level === 0 && !loading && !error && items.some((item) => item.completedSceneNames?.length);
  return (
    <div role="tabpanel" tabIndex={0} id="atlas-panel" aria-busy={loading} aria-labelledby={searching ? "atlas-search-results" : `atlas-tab-${level}`} data-atlas-panel data-atlas-column={level}
      className="flex shrink-0 flex-col select-none rounded-xl border border-white/10 bg-bg-secondary p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 [@media(max-height:560px)]:p-1">
      {showCompletionLegend && <p className="mb-3 text-center text-xs leading-5 text-text-secondary">
        {tScenes("scenesCompleteCountLegend")}
      </p>}
      <div key={transitionKey} data-atlas-panel-content className={`flex shrink-0 flex-wrap items-start justify-center gap-2 ${loading ? "" : styles.panelEnter}`}>
        {(loading || error) && <div role="status" className="flex min-h-20 w-full items-center justify-center gap-3 text-sm text-text-secondary">
          {t(error ? "loadError" : "loading")}
          {error && <button type="button" onClick={onRetry} className="rounded border border-accent/50 px-3 py-2 text-accent outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent">{t("retry")}</button>}
        </div>}
        {!loading && !error && items.map((item) => {
          const selected = item.id === currentId;
          const pulse = Boolean(nextLabel && selected && item.id === pulseId);
          const completedCount = item.completedSceneNames?.length ?? 0;
          const completedLabel = completedCount ? tScenes("scenesCompleteCount", { count: completedCount }) : null;
          const peopleLabel = item.count !== undefined ? t("peopleCount", { count: item.count }) : null;
          return (
            <button key={item.id ?? "all"} data-atlas-option={item.id ?? "all"} type="button" disabled={item.disabled} aria-pressed={selected} title={item.disabled ? t("comingSoon") : level === 2 && selected && !searching ? t("clickAgainConfirm") : pulse ? t("openNext", { next: nextLabel! }) : undefined} aria-describedby={pulse || level === 2 ? "atlas-picker-hint" : undefined}
              aria-label={[item.name, item.context, item.scenesComplete ? tScenes("scenesComplete") : null, peopleLabel, completedLabel].filter((value) => value !== null && value !== undefined).join(" · ")}
              onClick={() => onSelect(item)}
              className={`relative isolate flex min-h-10 min-w-0 max-w-full flex-wrap touch-manipulation items-center justify-center gap-x-2 gap-y-1.5 rounded-full border px-3.5 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${selected ? "border-accent/60 text-accent hover:bg-accent/10" : "border-white/15 text-text-primary hover:border-white/40 hover:bg-white/5"} disabled:cursor-default disabled:text-text-tertiary disabled:opacity-50`}>
              <span aria-hidden data-atlas-chip-light className={`pointer-events-none absolute -inset-px -z-10 rounded-full bg-accent/10 shadow-[inset_0_0_12px_rgba(212,175,55,0.12)] transition-opacity duration-200 ease-out motion-reduce:transition-none ${selected ? "opacity-100" : "opacity-0"}`} />
              {pulse && <span aria-hidden data-atlas-pulse className={`pointer-events-none absolute -inset-px rounded-full border border-accent/60 ${styles.chipPulse}`} />}
              <span className="flex min-w-0 max-w-full shrink-0 items-center justify-center gap-2">
                <span className="min-w-0 break-keep [overflow-wrap:anywhere]">
                  {item.name}
                  {item.context && <span className="ms-1.5 text-xs font-normal text-text-secondary">{item.context}</span>}
                </span>
                {item.disabled && <span className="shrink-0 text-xs font-medium text-text-tertiary">{t("comingSoon")}</span>}
                {!item.disabled && item.scenesComplete && <SceneCompletionBadge shortLabel />}
              </span>
              {!item.disabled && peopleLabel && <span title={peopleLabel} aria-hidden data-atlas-person-count
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums text-text-secondary">
                <Users size={13} aria-hidden />
                <span>{item.count}</span>
              </span>}
              {!item.disabled && completedCount > 0 && <span data-scene-completion-count={completedCount}
                title={`${completedLabel}: ${item.completedSceneNames!.join(", ")}`}
                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-2 py-0.5 text-[11px] font-medium tabular-nums text-sky-100/85">
                <span aria-hidden>{tScenes("scenesCompleteCountShort", { count: completedCount })}</span>
                <span className="sr-only">{completedLabel}</span>
              </span>}
              {nextLabel && <ChevronRight aria-hidden data-atlas-open-next size={12} className={`pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 rounded-full border border-accent/60 bg-bg-main text-accent transition-opacity duration-200 motion-reduce:transition-none ${pulse ? "opacity-100" : "opacity-0"}`} />}
            </button>
          );
        })}
        {!loading && !error && items.length === 0 && <p role="status" className="p-2 text-sm text-text-secondary">{t(searching ? "noResults" : "comingSoon")}</p>}
      </div>
    </div>
  );
}
