"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal, { ModalBody } from "@/components/ui/Modal";
import {
  READING_PLAYBACK_RATE_MAX,
  READING_PLAYBACK_RATE_MIN,
  READING_PLAYBACK_RATE_STEP,
  READING_PLAYBACK_RATES,
  useReadingNarration,
} from "@/hooks/useReadingNarration";

type Narration = ReturnType<typeof useReadingNarration>;

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

const SLIDER_CLASS = "h-5 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent accent-accent hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:size-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-thumb]:size-[9px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent";

function sliderFill(percent: number) {
  return { background: `linear-gradient(to right, var(--color-accent) ${percent}%, var(--color-stone-light) ${percent}%) center / 100% 3px no-repeat` };
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
export default function ReadingNarrationControls({ narration, label }: { narration: Narration; label?: string }) {
  const t = useTranslations("celebPage");
  const { available, status, currentTime, duration, playbackRate, play, pause, resume, stop, seek, setPlaybackRate } = narration;
  const active = status === "playing" || status === "loading";
  const [speedOpen, setSpeedOpen] = useState(false);

  return (
    <div inert={!available} aria-disabled={!available || undefined} className={available ? "" : "opacity-40 transition-opacity"}>
      <div className="mx-auto mb-4 max-w-sm rounded-xl border border-white/15 bg-white/[0.045] px-4 py-2.5" role="group" aria-label={label ?? t("readingControls")}>
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
          {/* 네이티브 select 팝업은 본문 자동 스크롤(AutoScrollReadingText)에 닫힌다 — React 모달은 스크롤에 닫히지 않아 여기에 띄운다 */}
          <NarrationButton
            label={`${t("readingSpeed")} ${playbackRate}×`}
            onClick={() => setSpeedOpen(true)}
          >
            <span className="text-[11px] font-medium leading-none tabular-nums">{playbackRate}×</span>
          </NarrationButton>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-text-secondary">
          <span className="min-w-7">{formatTime(currentTime)}</span>
          <input
            type="range" min={0} max={duration} step={0.1}
            value={Math.min(currentTime, duration)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label={t("readingPosition")}
            style={sliderFill(duration ? currentTime / duration * 100 : 0)}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            className={SLIDER_CLASS}
          />
          <span className="min-w-7 text-right">{formatTime(duration)}</span>
        </div>
      </div>
      <Modal isOpen={speedOpen && available} onClose={() => setSpeedOpen(false)} title={t("readingSpeed")} size="sm" animateHeight={false}>
        <ModalBody className="px-5 pb-4 pt-1">
          <div className="text-center text-2xl font-semibold tabular-nums text-accent">{playbackRate}×</div>
          <div className="mt-3 flex items-center gap-2 text-[11px] tabular-nums text-text-secondary">
            <span>{READING_PLAYBACK_RATE_MIN}×</span>
            <input
              type="range"
              min={READING_PLAYBACK_RATE_MIN}
              max={READING_PLAYBACK_RATE_MAX}
              step={READING_PLAYBACK_RATE_STEP}
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
              aria-label={t("readingSpeed")}
              style={sliderFill((playbackRate - READING_PLAYBACK_RATE_MIN) / (READING_PLAYBACK_RATE_MAX - READING_PLAYBACK_RATE_MIN) * 100)}
              className={SLIDER_CLASS}
            />
            <span>{READING_PLAYBACK_RATE_MAX}×</span>
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            {READING_PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                aria-pressed={rate === playbackRate}
                className={`rounded-full border px-2.5 py-1 text-xs tabular-nums enabled:hover:border-accent/60 enabled:hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${rate === playbackRate ? "border-accent/60 bg-accent/15 text-accent" : "border-white/20 text-text-secondary"}`}
              >
                {rate}×
              </button>
            ))}
          </div>
          {duration > 0 && (
            <p className="mt-3 text-center text-[11px] tabular-nums text-text-secondary">
              {t("readingTimeLeft")} {formatTime((duration - currentTime) / playbackRate)}
            </p>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
