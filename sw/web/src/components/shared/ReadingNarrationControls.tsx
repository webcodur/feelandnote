"use client";

import type { ReactNode } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { READING_PLAYBACK_RATES, useReadingNarration } from "@/hooks/useReadingNarration";

type Narration = ReturnType<typeof useReadingNarration>;

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function NarrationButton({ label, onClick, children, disabled = false, busy = false, primary = false }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button" aria-label={label} aria-busy={busy || undefined}
      title={label} onClick={onClick} disabled={disabled}
      className={`relative flex h-10 w-11 shrink-0 items-center justify-center gap-1 rounded-lg border enabled:hover:border-accent/60 enabled:hover:bg-accent/15 enabled:hover:text-accent enabled:active:bg-accent/25 disabled:cursor-default disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${primary ? "border-accent/45 bg-accent/10 text-accent" : "border-white/20 bg-black/20 text-text-secondary"}`}
    >
      {children}
    </button>
  );
}

/** 셀럽 상세와 가상독백 목록이 같은 낭독 조작을 쓴다. */
export default function ReadingNarrationControls({ narration }: { narration: Narration }) {
  const t = useTranslations("celebPage");
  const { available, status, currentTime, duration, playbackRate, play, pause, resume, stop, seek, setPlaybackRate } = narration;
  const active = status === "playing" || status === "loading";

  return (
    <div inert={!available} aria-disabled={!available || undefined} className={available ? "" : "opacity-40 transition-opacity"}>
      <div className="mx-auto mb-4 max-w-sm rounded-xl border border-white/15 bg-white/[0.045] px-4 py-2.5" role="group" aria-label={t("readingControls")}>
        <div className="mx-auto grid w-fit grid-cols-5 items-center gap-1.5">
          <NarrationButton label={t("readingStop")} onClick={stop} disabled={status === "idle" && currentTime === 0}>
            <Square size={16} aria-hidden />
          </NarrationButton>
          <NarrationButton label={t("readingBack")} onClick={() => seek(currentTime - 10)} disabled={currentTime <= 0}>
            <RotateCcw size={14} strokeWidth={1.6} aria-hidden />
            <span className="text-[11px] font-medium leading-none tabular-nums">10</span>
          </NarrationButton>
          <NarrationButton
            label={active ? t("readingPause") : status === "paused" ? t("readingResume") : t("readingPlay")}
            onClick={active ? pause : status === "paused" ? resume : play}
            busy={status === "loading"}
            primary
          >
            {status === "loading" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : active ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
          </NarrationButton>
          <NarrationButton label={t("readingForward")} onClick={() => seek(currentTime + 10)} disabled={currentTime >= duration}>
            <RotateCw size={14} strokeWidth={1.6} aria-hidden />
            <span className="text-[11px] font-medium leading-none tabular-nums">10</span>
          </NarrationButton>
          <select
            aria-label={t("readingSpeed")}
            title={t("readingSpeed")}
            value={playbackRate}
            onChange={(event) => setPlaybackRate(Number(event.target.value))}
            className="h-10 w-11 cursor-pointer appearance-none rounded-lg border border-white/20 bg-black/20 text-center text-[11px] font-medium tabular-nums text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {READING_PLAYBACK_RATES.map((rate) => <option className="bg-bg-card" key={rate} value={rate}>{rate}×</option>)}
          </select>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-text-secondary">
          <span className="min-w-7">{formatTime(currentTime)}</span>
          <input
            type="range" min={0} max={duration} step={0.1}
            value={Math.min(currentTime, duration)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label={t("readingPosition")}
            style={{ background: `linear-gradient(to right, var(--color-accent) ${duration ? currentTime / duration * 100 : 0}%, var(--color-stone-light) ${duration ? currentTime / duration * 100 : 0}%) center / 100% 3px no-repeat` }}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            className="h-5 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent accent-accent hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:size-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:size-[9px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
          />
          <span className="min-w-7 text-right">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
