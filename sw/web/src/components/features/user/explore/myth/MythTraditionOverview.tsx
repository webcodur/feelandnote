"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythPerson, MythTradition } from "@/actions/home/mythAtlasTypes";
import { BlurDissolve, FormattedText, splitReadableParagraphs } from "@/components/ui";
import { mythLeadImage } from "./mythLeadImage";

import { MYTH_LAYOUT as layout } from "./mythLayout";

interface Props {
  tradition: MythTradition | null;
  memberCount: number;
  workCount: number;
  /** 전승 차례의 앞 인물들 — 타이틀 아트의 빈 우측에 아바타로 세우는 대표 인물이다 */
  leadPeople: MythPerson[];
  /** 아바타를 누르면 그 인물 상세로 간다 */
  onSelectPerson: (id: string) => void;
}

export default function MythTraditionOverview({ tradition, memberCount, workCount, leadPeople, onSelectPerson }: Props) {
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
    <section aria-labelledby="myth-overview-title" className={layout.overview}>
      <div className="relative">
        <figure className={layout.artwork} aria-label={tradition?.name ?? t("allTraditions")}>
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
            <div className="absolute end-5 top-5 z-10 flex items-center gap-1 rounded-2xl border border-white/10 bg-black/75 p-1 shadow-lg lg:end-[calc(43%+2rem)]" aria-label={t("titleArtControls")}>
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
          {/* 대표 인물 — 그림의 빈 우측에 얼굴 셋을 세운다. 넓은 화면은 패널 기둥과 그림의 경계에 걸친다. 누르면 그 인물 상세로 간다 */}
          {leadPeople.length > 0 && (
            <div className="absolute end-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 rounded-full bg-black/55 p-1.5 ring-1 ring-white/15 backdrop-blur-sm lg:end-[calc(43%+2rem)]">
              {leadPeople.map((person) => {
                const face = person.avatarUrl ?? (tradition ? mythLeadImage(person, tradition.id) : null);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onSelectPerson(person.id)}
                    aria-label={person.name}
                    title={person.name}
                    className="group relative block size-11 overflow-hidden rounded-full bg-white/[0.06] ring-2 ring-black/60 hover:ring-accent focus-visible:outline-none focus-visible:ring-accent md:size-12"
                  >
                    {face ? (
                      <Image src={face} alt="" fill unoptimized sizes="48px" className="object-cover object-top" />
                    ) : (
                      <span aria-hidden className="grid h-full place-items-center font-serif text-lg font-black text-white/40">{person.name[0]}</span>
                    )}
                  </button>
                );
              })}
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

        <div className={layout.overviewPanel}>
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

            <div className={layout.description}>
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
