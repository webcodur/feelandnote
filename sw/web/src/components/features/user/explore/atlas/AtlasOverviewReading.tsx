"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import HubSection from "@/components/shared/HubSection";
import FormattedText from "@/components/ui/FormattedText";
import { useFactionDescVoice } from "@/hooks/useFactionDescVoice";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { activeReadingSegment } from "@/lib/reading-timing";
import { scrollToSection } from "@/lib/scroll/sectionNavigation";
import { MYTH_LAYOUT as layout } from "../myth/mythLayout";

interface Props {
  factionId: string;
  text: string;
  title: string;
  label: string;
  notice?: ReactNode;
  sectionIndex: number;
  sectionTotal: number;
}

/** 개요 전문은 처음부터 펼친다. 접어도 낭독의 재생 위치를 유지한다. */
export default function AtlasOverviewReading({ factionId, text, title, label, notice, sectionIndex, sectionTotal }: Props) {
  const t = useTranslations("celebPage");
  const tOverview = useTranslations("explore.hub.myth");
  const locale = useLocale() === "en" ? "en" : "ko";
  const voice = useFactionDescVoice(factionId, locale, text);
  const narration = useReadingNarration(voice?.audioUrl ?? "");
  const [expanded, setExpanded] = useState(true);
  const previewRef = useRef<HTMLButtonElement>(null);
  const preview = useMemo(() => {
    const sentences = new Intl.Segmenter(locale, { granularity: "sentence" }).segment(text);
    const beginning = Array.from(sentences).slice(0, 2).map(sentence => sentence.segment).join("").trimEnd();
    return `${beginning}${beginning.length < text.trimEnd().length ? " …" : ""}`;
  }, [locale, text]);
  const expandLabel = tOverview("overviewExpand");
  const collapseLabel = tOverview("overviewCollapse");
  const collapse = () => {
    setExpanded(false);
    requestAnimationFrame(() => {
      const preview = previewRef.current;
      const section = preview?.closest<HTMLElement>("[data-hub-section]");
      if (section && section.getBoundingClientRect().top < 0) scrollToSection(section);
      preview?.focus({ preventScroll: true });
    });
  };
  const id = useId();
  const contentId = `${id}-content`;
  const timing = voice?.timing && narration.duration > 0
    && Math.abs(voice.timing.duration - narration.duration) <= 0.15 ? voice.timing : null;
  const sentence = activeReadingSegment(timing, narration.currentTime, narration.status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;

  return (
    <HubSection id="atlas-overview" title={label} index={sectionIndex} total={sectionTotal}>
      <button ref={previewRef} type="button" data-overview-preview hidden={expanded}
        aria-label={`${title} · ${label} · ${expandLabel}`} aria-expanded={false} aria-controls={contentId}
        onClick={() => setExpanded(true)}
        className={`${layout.overviewText} w-full rounded-control border border-line-strong px-4 py-3 font-normal outline-none hover:border-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent`}>
        <span className="clip-fade-end block"><FormattedText text={preview} /></span>
      </button>
      <div id={contentId} data-overview-section data-overview-content hidden={!expanded}>
        {notice}
        {narration.available && <ReadingNarrationControls narration={narration} />}
        <div data-overview-text className={layout.overviewText}>
          <ReadingHighlightText text={text} mark={mark} segments={timing?.segments}
            onPlayFrom={narration.available ? (seconds) => { narration.seek(seconds); narration.play(); } : undefined}
            sentenceLabel={t("readingPlayFromHere")} />
        </div>
        <div className="mt-6 flex justify-center md:mt-8">
          <button type="button" data-overview-trigger aria-label={`${title} · ${label} · ${collapseLabel}`}
            aria-expanded={true} aria-controls={contentId} onClick={collapse}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line-strong bg-bg-main px-5 text-sm font-medium text-text-secondary outline-none hover:border-accent hover:bg-accent/15 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
            {collapseLabel}
          </button>
        </div>
      </div>
    </HubSection>
  );
}
