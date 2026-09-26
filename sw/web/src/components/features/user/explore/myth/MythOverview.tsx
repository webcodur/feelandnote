"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Loader2, PanelTop, Play, Square } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Myth } from "@/actions/home/mythTypes";
import { BlurDissolve } from "@/components/ui";
import FactionArtworkViewer from "@/components/features/faction/FactionArtworkViewer";
import FactionArtworkTitle from "@/components/features/faction/FactionArtworkTitle";
import MythTitleImage from "./MythTitleImage";
import MythOverviewReading from "./MythOverviewReading";
import { MYTH_LAYOUT as layout } from "./mythLayout";
import { useFactionDescVoice } from "@/hooks/useFactionDescVoice";
import { useReadingNarration } from "@/hooks/useReadingNarration";

interface Props {
  myth: Myth;
  memberCount: number;
  workCount: number;
  overviewLabel?: string;
  fallback?: string;
  navigation: (overview: ReactNode) => ReactNode;
}

// 낮은 표지의 이미지 확대와 개요 읽기는 별도 조작으로 연다.
export default function MythOverview({ myth, memberCount, workCount, overviewLabel, fallback, navigation }: Props) {
  const t = useTranslations("explore.hub.myth");
  const tVoice = useTranslations("celebPage");
  const locale = useLocale() === "en" ? "en" : "ko";
  const text = myth.description ?? fallback ?? t("mythOverviewFallback");
  const voice = useFactionDescVoice(myth.id, locale, text);
  const narration = useReadingNarration(voice?.audioUrl ?? "");
  const playing = narration.status === "playing" || narration.status === "loading";
  const playbackLabel = tVoice(playing ? "readingStop" : narration.status === "paused" ? "readingResume" : "readingPlay");
  const [reading, setReading] = useState(false);
  const [zoom, setZoom] = useState(false);
  const closeReading = useCallback(() => setReading(false), []);
  const closeZoom = useCallback(() => setZoom(false), []);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const images = myth.images.filter((image) => !unavailable.includes(image.url));
  const cover = images[0] ?? null;
  const label = overviewLabel ?? t("mythOverview");

  return (
    <>
      <div data-artwork={cover ? "available" : "absent"}
        className={`${layout.selectionDetails} ${cover ? "" : layout.selectionWithoutArtwork}`}>
        <div className={layout.selectionControls}>
          {navigation(
            <div className="flex min-w-fit flex-1 items-stretch gap-1.5">
              <button type="button" data-overview-trigger aria-label={`${myth.name} · ${label}`}
                aria-haspopup="dialog" aria-expanded={reading} onClick={() => setReading(true)}
                className={layout.overviewButton}>
                <PanelTop size={16} className="shrink-0" aria-hidden />{label}
              </button>
              {narration.available && <button type="button" data-overview-playback aria-pressed={playing}
                aria-label={`${label} · ${playbackLabel}`} title={playbackLabel} aria-busy={narration.status === "loading" || undefined}
                onClick={playing ? narration.stop : narration.play}
                className={`grid size-10 shrink-0 place-items-center rounded-lg border outline-none hover:border-accent hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent ${playing ? "border-accent/60 bg-accent/10 text-accent" : "border-white/20 bg-bg-main text-text-primary"}`}>
                {narration.status === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : playing ? <Square size={15} aria-hidden /> : <Play size={16} aria-hidden />}
              </button>}
            </div>
          )}
        </div>
        {cover && (
          <div className={layout.selectionArtwork}>
            <button type="button" data-artwork-zoom aria-label={`${myth.name} · ${t("enlargeImage")}`}
              aria-haspopup="dialog" aria-expanded={zoom} onClick={() => setZoom(true)}
              className={`group ${layout.overviewImage} cursor-zoom-in border border-white/10 outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent`}>
              <BlurDissolve key={cover.url} className="absolute inset-0 transition-transform duration-300 motion-safe:group-hover:scale-105">
                <MythTitleImage src={cover.url} alt="" priority className="md:object-cover"
                  sizes="(min-width: 1280px) 565px, (min-width: 768px) 50vw, calc(100vw - 24px)"
                  onUnavailable={() => setUnavailable((urls) => [...urls, cover.url])} />
              </BlurDissolve>
              <FactionArtworkTitle title={myth.name} />
            </button>
          </div>
        )}
      </div>
      {zoom && <FactionArtworkViewer images={images} title={myth.name} titleInArtwork onClose={closeZoom} />}
      {reading && (
        <MythOverviewReading voice={voice} narration={narration} text={text}
          title={myth.name} onClose={closeReading}
          notice={<p className="mb-4 text-sm text-text-secondary">{t("mythOverviewStats", { people: memberCount, works: workCount })}</p>} />
      )}
    </>
  );
}
