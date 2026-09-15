"use client";

import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MythTradition, MythWork } from "@/actions/home/mythAtlasTypes";
import { BlurDissolve, FormattedText, splitReadableParagraphs } from "@/components/ui";

import { MYTH_LAYOUT as layout } from "./mythLayout";

interface Props {
  tradition: MythTradition | null;
  memberCount: number;
  workCount: number;
  /** 이 전승으로 들어가는 책 한 권. 인물을 고르기 전에도 살 수 있게 개요에 세운다 */
  entryWork: MythWork | null;
}

export default function MythTraditionOverview({ tradition, memberCount, workCount, entryWork }: Props) {
  const t = useTranslations("explore.hub.myth");
  const locale = useLocale();
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
      <div className="relative bg-black">
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

            {entryWork && <EntryWorkCard work={entryWork} locale={locale} label={t("entryWork")} />}

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

/* 전승으로 들어가는 책 한 줄. 구매 링크가 있으면 판매처로, 아니면 작품 화면으로 보낸다.
   테두리 색과 제휴 표기는 인물 카드 아래 책 선반과 같은 규칙을 쓴다 */
function EntryWorkCard({ work, locale, label }: { work: MythWork; locale: string; label: string }) {
  const showPurchase = locale === "ko" && work.category === "book";
  const body = (
    <>
      <div className="relative h-[68px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
        {work.thumbnailUrl ? (
          <Image src={work.thumbnailUrl} alt="" fill unoptimized sizes="52px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-1 text-center text-[10px] font-black leading-tight text-accent/50">{work.title}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${layout.entryLabel} text-accent`}>{label}</p>
        <h4 className={`${layout.entryTitle} text-text-primary group-hover:text-accent`}>{work.title}</h4>
        <p className={layout.entryCreator}>{work.creator}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/85 text-text-tertiary" aria-hidden>
        <ArrowUpRight size={15} />
      </span>
    </>
  );

  const shared = "group mt-4 flex shrink-0 items-center gap-3 rounded-2xl border bg-bg-card p-2.5";
  if (showPurchase) {
    return (
      <div className="mt-4 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-bg-card">
        <Link href={`/content/${work.id}?category=${work.category}`} className="group flex items-center gap-3 p-2.5 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          {body}
        </Link>
        <div className="border-t border-border/40 px-2.5 py-1.5">
          <AffiliateBookAction contentId={work.id} editionId={work.editionId} coupangUrl={work.coupangUrl} showNotice />
        </div>
      </div>
    );
  }
  return (
    <Link href={`/content/${work.id}?category=${work.category}`} className={`${shared} border-stone-heavy hover:border-accent/70`}>
      {body}
    </Link>
  );
}
