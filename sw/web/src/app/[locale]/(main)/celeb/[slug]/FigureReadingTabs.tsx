"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useTranslations } from "next-intl";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { READING_PLAYBACK_RATES, useAudioAvailable, useReadingNarration } from "@/hooks/useReadingNarration";
import ReviewScrollBox from "@/components/features/user/contentLibrary/expand/ReviewScrollBox";
import ContentTextModal from "@/components/ui/ContentTextModal";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";

type ReadingTab = "guide" | "monologue";

interface Props {
  reading: CelebBySlugProfile["reading"];
  /** 화면 언어로 고른 가상독백. 영문이 없으면 한국어가 온다 */
  virtualMonologue: string | null;
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
  /** 가상독백 본문이 실제로 쓰인 언어 — 표시 fallback과 따로 둔다 */
  monologueLocale: Locale;
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** Changing the person, language or source stops the previous recording. */
/** 음원이 실제로 올라간 모드는 탭 이름 뒤에 초록 배경이 맥박해 듣기 가능을 표시한다 */
function AudioTabLabel({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-hidden
        className="absolute -inset-x-2 -inset-y-1 rounded-md bg-emerald-400/15 motion-safe:animate-pulse"
      />
      <span className="relative text-emerald-400">{children}</span>
    </span>
  );
}

export default function FigureReadingTabs(props: Props) {
  const t = useTranslations("celebPage");
  const [tab, setTab] = useState<ReadingTab>("guide");
  const guide = props.reading?.guide.trim() ?? "";
  const monologue = props.virtualMonologue?.trim() ?? "";
  const guideUrl = guide ? getReadingVoiceUrl(props.celebId, props.readingLocale, props.voiceV ?? 0) : "";
  const monologueUrl = monologue ? getVirtualMonologueVoiceUrl(props.celebId, props.monologueLocale, props.voiceV ?? 0) : "";
  const guideAudio = useAudioAvailable(guideUrl);
  const monologueAudio = useAudioAvailable(monologueUrl);
  if (!guide && !monologue) return null;

  const player = (
    <ReadingPlayer
      key={`${props.celebId}:${props.readingLocale}:${props.voiceV}:${props.reading?.guide}`}
      text={guide}
      audioUrl={guideUrl}
      timingKind="reading"
      celebId={props.celebId}
      readingLocale={props.readingLocale}
      voiceV={props.voiceV}
      openLabel={t("readingExpandGuide")}
    />
  );
  // 인물 안내·가상독백 모두 짧게 미리 보고, 눌러 전문을 읽는다.
  const monologueBox = (
    <ReadingPlayer
      key={`${props.celebId}:${props.monologueLocale}:${props.voiceV}:vmonologue:${monologue}`}
      text={monologue}
      audioUrl={monologueUrl}
      timingKind="monologue"
      celebId={props.celebId}
      readingLocale={props.monologueLocale}
      voiceV={props.voiceV}
      openLabel={t("readingExpandMonologue")}
    />
  );

  // 모드가 하나면 탭 없이 상자 윗변에서 글을 소폭 떼어 시작한다
  if (!guide || !monologue) {
    return <div className="pt-4 md:pt-6">{guide ? player : monologueBox}</div>;
  }

  const tabs: ArchiveTabItem<ReadingTab>[] = [
    { key: "guide", label: guideAudio ? <AudioTabLabel>{t("personGuide")}</AudioTabLabel> : t("personGuide") },
    { key: "monologue", label: monologueAudio ? <AudioTabLabel>{t("virtualMonologue")}</AudioTabLabel> : t("virtualMonologue") },
  ];
  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-2"
        ariaLabel={t("reading")}
      />
      <div id={`archive-panel-${tab}`} role="tabpanel" aria-labelledby={`archive-tab-${tab}`}>
        {tab === "guide" ? player : monologueBox}
      </div>
    </div>
  );
}

function ReadingPlayer({ text, audioUrl, timingKind, celebId, voiceV = 0, readingLocale, openLabel }: {
  text: string;
  audioUrl: string;
  timingKind: "reading" | "monologue";
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
  openLabel: string;
}) {
  const t = useTranslations("celebPage");
  const [textOpen, setTextOpen] = useState(false);
  const {
    available, status, currentTime, duration, playbackRate,
    play, pause, resume, stop, seek, setPlaybackRate,
  } = useReadingNarration(audioUrl);
  const timing = useReadingTiming(celebId, readingLocale, voiceV, text, duration, available, timingKind);
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  // 모달 본문에서 문장을 누르면 그 시점으로 건너뛰어 재생한다
  const playFrom = (seconds: number) => { seek(seconds); play(); };
  const active = status === "playing" || status === "loading";

  return (
    <div>
      {/* 플레이어는 자리를 항상 지킨다 — 음원이 없거나 아직 확인 중이면 비활성 형상으로 둔다 */}
      <div
        inert={!available}
        aria-disabled={!available || undefined}
        className={available ? "" : "opacity-40 transition-opacity"}
      >
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
            className="h-5 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent accent-accent hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:size-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-[9px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
          />
          <span className="min-w-7 text-right">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <ReviewScrollBox onOpen={() => setTextOpen(true)} openLabel={openLabel}>
        <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
          <ReadingHighlightText text={text} mark={mark} />
        </div>
      </ReviewScrollBox>
      {textOpen && timingKind === "monologue" ? (
        <VirtualMonologueModal text={text} mark={mark} segments={timing?.segments} onPlayFrom={playFrom} onClose={() => setTextOpen(false)} />
      ) : null}
      {textOpen && timingKind === "reading" ? (
        <ContentTextModal isOpen onClose={() => setTextOpen(false)} title={t("personGuide")} text={text} mark={mark} segments={timing?.segments} onPlayFrom={playFrom} sentenceLabel={t("readingPlayFromHere")} />
      ) : null}
    </div>
  );
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
