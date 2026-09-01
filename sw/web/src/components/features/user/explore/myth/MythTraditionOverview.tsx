"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythTradition } from "@/actions/home/mythAtlasTypes";
import { BlurDissolve, FormattedText, splitReadableParagraphs } from "@/components/ui";

interface Props {
  tradition: MythTradition | null;
  memberCount: number;
  workCount: number;
}

export default function MythTraditionOverview({ tradition, memberCount, workCount }: Props) {
  const t = useTranslations("explore.hub.myth");
  const [imageIndex, setImageIndex] = useState(0);
  const images = tradition?.images ?? [];
  const activeImage = images[imageIndex] ?? images[0] ?? null;
  const description = tradition?.description ?? t("mythOverviewFallback");

  const moveImage = (direction: -1 | 1) => {
    if (images.length < 2) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <section aria-labelledby="myth-overview-title" className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-black">
      <div className="relative bg-black">
        <figure className="relative aspect-[3/2] w-full overflow-hidden" aria-label={tradition?.name ?? t("allTraditions")}>
          {activeImage ? (
            <BlurDissolve key={activeImage.url} className="absolute inset-0">
              <Image
                src={activeImage.url}
                alt={activeImage.label ?? tradition?.name ?? ""}
                fill
                unoptimized
                priority={imageIndex === 0}
                sizes="100vw"
                className="object-contain"
                style={{ filter: "none" }}
              />
            </BlurDissolve>
          ) : (
            <div className="absolute inset-0 bg-bg-secondary" />
          )}
          {images.length > 1 && (
            <div className="absolute end-5 top-5 z-10 flex items-center gap-1 rounded-2xl border border-white/10 bg-black/75 p-1 shadow-lg" aria-label={t("titleArtControls")}>
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
          <h3 id="myth-overview-title" className="absolute bottom-5 start-5 z-10 max-w-[calc(100%-2.5rem)] text-[2.1rem] font-black leading-[1.05] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.75)] md:bottom-7 md:start-7 md:max-w-[calc(100%-3.5rem)] md:text-5xl lg:bottom-8 lg:start-8 lg:max-w-[53%] xl:text-[3.5rem]">
            <span
              className="box-decoration-clone px-1.5 py-0.5 [box-decoration-break:clone]"
              style={{ textShadow: "0 2px 5px rgba(0,0,0,.98), 0 0 22px rgba(0,0,0,.72)" }}
            >
              {tradition?.name ?? t("allTraditions")}
            </span>
          </h3>
        </figure>

        <div className="relative z-10 bg-black px-5 pb-6 pt-5 md:px-7 md:pb-7 md:pt-6 lg:absolute lg:inset-y-0 lg:end-0 lg:flex lg:w-[43%] lg:items-center lg:bg-transparent lg:px-6 lg:py-8 xl:px-8">
          <div className="flex w-full min-w-0 flex-col lg:h-[430px] lg:rounded-[20px] lg:border lg:border-white/[0.09] lg:bg-black/[0.88] lg:p-6 lg:shadow-[0_18px_44px_rgba(0,0,0,.28)]">
            <div className="flex items-center justify-between gap-3">
              <p className="flex shrink-0 items-center gap-2 text-xs font-bold tracking-[.16em] text-accent md:text-sm">
                <BookOpenText size={17} aria-hidden />
                {t("mythOverview")}
              </p>
              <p className="min-w-0 text-end text-[11px] font-semibold leading-5 text-text-tertiary md:text-xs">
                {t("mythOverviewStats", { people: memberCount, works: workCount })}
              </p>
            </div>

            <div className="scrollbar-thin mt-4 h-56 overflow-y-auto pe-2 [overflow-anchor:none] md:h-64 lg:min-h-0 lg:flex-1">
              <div className="space-y-5 break-keep text-[15px] leading-[1.9] text-text-secondary md:text-[16.5px] md:leading-[1.95]">
                {splitReadableParagraphs(description).map((paragraph, index) => (
                  <p key={index}>
                    <FormattedText text={paragraph} />
                  </p>
                ))}
              </div>
            </div>

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
    </section>
  );
}
