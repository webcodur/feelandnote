"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useTranslations } from "next-intl";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { READING_PLAYBACK_RATES, useReadingNarration } from "@/hooks/useReadingNarration";
import ReviewScrollBox from "@/components/features/user/contentLibrary/expand/ReviewScrollBox";
import ContentTextModal from "@/components/ui/ContentTextModal";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";

type ReadingTab = "guide" | "monologue";

interface Props {
  reading: CelebBySlugProfile["reading"];
  /** 화면 언어로 고른 가상독백. 영문이 없으면 한국어가 온다 */
  virtualMonologue: string | null;
  celebId: string;
  /** 가상독백 모달의 화자 표시 */
  celebName: string;
  voiceV?: number;
  readingLocale: Locale;
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** Changing the person, language or source stops the previous recording. */
export default function FigureReadingTabs(props: Props) {
  const t = useTranslations("celebPage");
  const [tab, setTab] = useState<ReadingTab>("guide");
  const [openText, setOpenText] = useState<ReadingTab | null>(null);
  const guide = props.reading?.guide.trim() ?? "";
  const monologue = props.virtualMonologue?.trim() ?? "";
  if (!guide && !monologue) return null;

  const player = (
    <ReadingPlayer
      key={`${props.celebId}:${props.readingLocale}:${props.voiceV}:${props.reading?.guide}`}
      {...props}
      onOpenText={() => setOpenText("guide")}
    />
  );
  // 인물 안내는 좁은 화면에서만, 가상독백은 폭과 무관하게 높이를 가두고 눌러 모달로 읽는다(감상배경 상자와 같은 모듈)
  const monologueBox = (
    <ReviewScrollBox onOpen={() => setOpenText("monologue")} openLabel={t("readingExpandMonologue")}>
      <MonologueText text={monologue} />
    </ReviewScrollBox>
  );
  const modals = (
    <>
      {openText === "guide" && guide ? (
        <ContentTextModal isOpen onClose={() => setOpenText(null)} title={t("personGuide")} text={guide} />
      ) : null}
      {openText === "monologue" && monologue ? (
        <VirtualMonologueModal name={props.celebName} text={monologue} onClose={() => setOpenText(null)} />
      ) : null}
    </>
  );

  // 모드가 하나면 탭 없이 상자 윗변에서 글을 소폭 떼어 시작한다
  if (!guide || !monologue) {
    return (
      <>
        <div className="pt-4 md:pt-6">{guide ? player : monologueBox}</div>
        {modals}
      </>
    );
  }

  const tabs: ArchiveTabItem<ReadingTab>[] = [
    { key: "guide", label: t("personGuide") },
    { key: "monologue", label: t("virtualMonologue") },
  ];
  return (
    <>
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
      {modals}
    </>
  );
}

function MonologueText({ text }: { text: string }) {
  const paragraphs = useMemo(
    () => text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [text],
  );
  return (
    <div className="mx-auto max-w-3xl space-y-4 whitespace-pre-line font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </div>
  );
}

function ReadingPlayer({ reading, celebId, voiceV = 0, readingLocale, onOpenText }: Props & { onOpenText?: () => void }) {
  const t = useTranslations("celebPage");
  const text = reading?.guide.trim() ?? "";
  const paragraphs = useMemo(() => Array.from(text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g), (match) => ({ text: match[0], start: match.index })), [text]);
  const {
    available, status, currentTime, duration, playbackRate,
    play, pause, resume, stop, seek, setPlaybackRate,
  } = useReadingNarration(getReadingVoiceUrl(celebId, readingLocale, voiceV));
  const timing = useReadingTiming(celebId, readingLocale, voiceV, text, duration, available);
  const sentence = activeReadingSegment(timing, currentTime, status);
  const active = status === "playing" || status === "loading";

  const activeMarkRef = useRef<HTMLElement | null>(null);
  const sentenceStart = sentence?.textStart;
  useEffect(() => {
    if (status !== "playing" || sentenceStart === undefined) return;
    const mark = activeMarkRef.current;
    if (!mark) return;
    /* 높이를 가둔 상자(좁은 화면)가 읽는 문장을 숨길 때만 상자 안에서 따라간다.
       펼쳐 둔 넓은 화면이나 페이지 스크롤은 건드리지 않는다 */
    let box = mark.parentElement;
    while (box && box.scrollHeight <= box.clientHeight + 1) box = box.parentElement;
    if (box && box !== document.body && box !== document.documentElement) {
      mark.scrollIntoView({ block: "nearest" });
    }
  }, [sentenceStart, status]);

  return (
    <div>
      <div inert={!available} aria-hidden={!available} style={{ visibility: available ? "visible" : "hidden" }}>
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
      <ReviewScrollBox mobileOnly onOpen={onOpenText} openLabel={t("readingExpandGuide")}>
        <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
          {paragraphs.map((paragraph) => {
            const start = sentence ? Math.max(0, sentence.textStart - paragraph.start) : 0;
            const end = sentence ? Math.min(paragraph.text.length, sentence.textEnd - paragraph.start) : 0;
            const beginsHere = !!sentence && sentence.textStart >= paragraph.start && sentence.textStart < paragraph.start + paragraph.text.length;
            return <p key={paragraph.start}>{end > start ? <>
              {paragraph.text.slice(0, start)}
              <mark ref={beginsHere ? activeMarkRef : undefined} className="rounded-sm bg-accent/15 text-accent [box-decoration-break:clone]" aria-current="true">{paragraph.text.slice(start, end)}</mark>
              {paragraph.text.slice(end)}
            </> : paragraph.text}</p>;
          })}
        </div>
      </ReviewScrollBox>
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
