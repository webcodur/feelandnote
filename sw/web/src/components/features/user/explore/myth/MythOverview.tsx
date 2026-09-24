"use client";

import { useState } from "react";
import MythTitleImage from "./MythTitleImage";
import { BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Myth } from "@/actions/home/mythTypes";
import { BlurDissolve, ClippedContentReadingText, FormattedText, splitReadableParagraphs } from "@/components/ui";
import ContentTextModal from "@/components/ui/ContentTextModal";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { useFactionDescVoice } from "@/hooks/useFactionDescVoice";
import { activeReadingSegment } from "@/lib/reading-timing";

import { MYTH_LAYOUT as layout } from "./mythLayout";

interface Props {
  myth: Myth | null;
  memberCount: number;
  workCount: number;
}

export default function MythOverview({ myth, memberCount, workCount }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale() === "en" ? "en" : "ko";
  const [imageIndex, setImageIndex] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const images = myth?.images ?? [];
  const activeImage = images[imageIndex] ?? images[0] ?? null;
  const description = myth?.description ?? t("mythOverviewFallback");
  const paragraphs = splitReadableParagraphs(description);
  const overviewTitle = myth?.name ?? t("allMyths");
  const isLongTitle = overviewTitle.length > 8;
  const overviewButtonLabel = `${overviewTitle} · ${t("mythOverview")}`;

  /* 개요 낭독 — 타이밍 JSON이 있을 때만 재생을 연다. 문장 강조는 개요 모달에 싣는다 */
  const descVoice = useFactionDescVoice(myth?.id, locale, myth?.description ?? "");
  const narration = useReadingNarration(descVoice?.audioUrl ?? "");
  const timing = descVoice?.timing && narration.duration > 0
    && Math.abs(descVoice.timing.duration - narration.duration) <= 0.15 ? descVoice.timing : null;
  const sentence = activeReadingSegment(timing, narration.currentTime, narration.status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  const playFrom = (seconds: number) => { narration.seek(seconds); narration.play(); };

  const moveImage = (direction: -1 | 1) => {
    if (images.length < 2) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <section aria-labelledby="myth-overview-title" className={layout.overview}>
      <div className="relative">
        <figure className={layout.artwork} aria-label={myth?.name ?? t("allMyths")}>
          {activeImage ? (
            <BlurDissolve key={activeImage.url} className="absolute inset-0">
              <MythTitleImage
                src={activeImage.url}
                alt={activeImage.label ?? myth?.name ?? ""}
                priority={imageIndex === 0}
              />
            </BlurDissolve>
          ) : (
            <div className="absolute inset-0 bg-bg-secondary" />
          )}
          {images.length > 1 && (
            <div className="absolute start-5 top-5 z-10 flex items-center gap-1 rounded-2xl border border-white/10 bg-black/75 p-1 shadow-lg" aria-label={t("titleArtControls")}>
              <button
                type="button"
                onClick={() => moveImage(-1)}
                className="group grid size-9 place-items-center rounded-full text-white/75 hover:bg-white/15 hover:text-white"
                aria-label={t("previousImage")}
              >
                <ChevronLeft size={18} className="transition-transform duration-200 group-active:-translate-x-0.5" />
              </button>
              <span className="min-w-10 text-center text-xs font-semibold tabular-nums text-white/75">{imageIndex + 1} / {images.length}</span>
              <button
                type="button"
                onClick={() => moveImage(1)}
                className="group grid size-9 place-items-center rounded-full text-white/75 hover:bg-white/15 hover:text-white"
                aria-label={t("nextImage")}
              >
                <ChevronRight size={18} className="transition-transform duration-200 group-active:translate-x-0.5" />
              </button>
            </div>
          )}
          <h3 id="myth-overview-title" className={`absolute bottom-5 end-5 z-10 max-w-[56%] text-end text-balance font-black leading-[1.05] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.75)] sm:text-[2.1rem] md:bottom-7 md:start-7 md:end-auto md:max-w-[calc(100%-3.5rem)] md:text-start md:text-5xl lg:bottom-8 lg:start-8 lg:max-w-[53%] xl:text-[3.5rem] ${isLongTitle ? "text-[1.5rem] max-[360px]:text-[1.25rem]" : "text-[1.75rem] max-[360px]:text-[1.5rem]"}`}>
            <span
              className="box-decoration-clone px-1.5 py-0.5 [box-decoration-break:clone]"
              style={{ textShadow: "0 2px 5px rgba(0,0,0,.98), 0 0 22px rgba(0,0,0,.72)" }}
            >
              {myth?.name ?? t("allMyths")}
            </span>
          </h3>
        </figure>

        <div className={layout.overviewPanel}>
          <button
            type="button"
            onClick={() => setOverviewOpen(true)}
            aria-label={overviewButtonLabel}
            aria-haspopup="dialog"
            title={overviewButtonLabel}
            className="absolute inset-0 z-20 hidden cursor-pointer rounded-[20px] outline-none ring-inset hover:bg-white/[0.04] hover:ring-1 hover:ring-accent/50 focus-visible:ring-2 focus-visible:ring-accent md:block"
          />
          <div className={layout.overviewBody}>
            <div className={layout.overviewHeader}>
              <p className="flex shrink-0 items-center gap-2 text-xs font-bold tracking-[.16em] text-accent md:text-sm">
                <BookOpenText size={17} aria-hidden />
                {t("mythOverview")}
              </p>
              <p className={layout.overviewStats}>
                {t("mythOverviewStats", { people: memberCount, works: workCount })}
              </p>
            </div>

            {descVoice ? (
              <div className="relative z-30 mt-1 -mb-3">
                <ReadingNarrationControls narration={narration} />
              </div>
            ) : null}

            <ClippedContentReadingText text={description} className={`${layout.description} relative`}>
              <div className="space-y-5 text-[15px] leading-[1.9] text-text-secondary md:text-[16.5px] md:leading-[1.95]">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>
                    <FormattedText text={paragraph} />
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOverviewOpen(true)}
                aria-label={overviewButtonLabel}
                aria-haspopup="dialog"
                title={overviewButtonLabel}
                className="absolute inset-0 z-10 cursor-pointer outline-none hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:hidden"
              />
            </ClippedContentReadingText>

            {images.length > 1 && (
              <div className="mt-4 flex items-center justify-end gap-1.5" aria-hidden>
                {images.map((image, index) => (
                  <span key={image.url} className={`h-1 rounded-full ${index === imageIndex ? "w-5 bg-accent" : "w-1 bg-stone-heavy"}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {overviewOpen && (
        <ContentTextModal
          isOpen
          onClose={() => setOverviewOpen(false)}
          title={overviewTitle}
          text={paragraphs.join("\n\n")}
          notice={descVoice ? <ReadingNarrationControls narration={narration} /> : null}
          mark={mark}
          segments={timing?.segments}
          status={narration.status}
          currentTime={narration.currentTime}
          onPlayFrom={playFrom}
          sentenceLabel={tCeleb("readingPlayFromHere")}
        />
      )}
    </section>
  );
}
