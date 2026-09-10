/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 원전 대표 서지·소개
 * - 목차 위치: sourceWorks
 * - 데이터: source props, editions 판본 선택
 * - 함께 보기: FigureBookWorksSection.tsx, FigureBookActions.tsx, FigureBookIntroduction.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import ContentImage from "@/components/ui/ContentImage";
import FigureBookActions from "./FigureBookActions";
import FigureBookEditionPicker from "./FigureBookEditionPicker";
import FigureBookIntroduction from "./FigureBookIntroduction";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import AnimatedHeight from "@/components/ui/AnimatedHeight";

interface FigureBookFeatureProps {
  source: FigureBookContent;
}
/* ── 1. 날짜 표기 ── */
function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (locale !== "en") {
    const year = String(date.getUTCFullYear()).slice(-2).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function FigureBookFeature({
  source,
}: FigureBookFeatureProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const [editionSelection, setEditionSelection] = useState(() => ({
    sourceId: source.id,
    editionId: source.editions[0]?.id ?? 0,
  }));
  const selectedEditionId = editionSelection.sourceId === source.id ? editionSelection.editionId : source.editions[0]?.id ?? 0;
  const edition = source.editions.find((item) => item.id === selectedEditionId)
    ?? source.editions[0];
  const introduction = useBookIntroduction(edition?.bookIntroduction, locale, edition?.description);
  if (!edition) return null;

  const releaseDate = formatDate(edition.releaseDate, locale);
  const meta = [
    { label: t("sourceWorkPublisher"), value: edition.publisher },
    { label: t("sourceWorkReleaseDate"), value: releaseDate },
    { label: "ISBN", value: edition.isbn },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <div className="flex flex-col gap-4">
      <FigureBookEditionPicker
        source={source}
        selectedEditionId={edition.id}
        onSelect={(editionId) => setEditionSelection({ sourceId: source.id, editionId })}
      />
      {/* ── 3. 표지·소개·서지 ── */}
      <div className="relative grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 rounded-lg border border-accent-dim/30 bg-stone-heavy bg-texture-marble px-3 py-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-x-6 sm:px-4 sm:py-5 md:px-6 lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-x-7 lg:py-7">
        <span className="pointer-events-none absolute inset-y-0 start-0 w-1/3 bg-gradient-to-e from-transparent to-accent/[0.04]" aria-hidden />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-e from-transparent via-accent-dim to-transparent" aria-hidden />

        <div className="relative w-full self-start md:row-span-2 lg:row-span-1">
          <span className="effect-engraved absolute -inset-2 border border-accent-dim/40 bg-stone-heavy" aria-hidden />
          <span className="absolute -bottom-4 -end-4 h-20 w-16 bg-accent/10" aria-hidden />
          <div className="effect-bevel relative aspect-[2/3] overflow-hidden border border-accent/50 bg-bg-secondary shadow-2xl">
            {edition.thumbnailUrl ? (
              <ContentImage
                src={edition.thumbnailUrl}
                alt={edition.title}
                sizes="(max-width: 639px) 80px, (max-width: 1023px) 132px, 168px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-accent">
                <BookOpenText size={36} strokeWidth={1.3} aria-hidden />
                <span className="px-4 text-center text-sm font-bold">{edition.title}</span>
              </div>
            )}
          </div>
          <FigureBookActions
            source={source}
            edition={edition}
            compact
            className="mt-5 hidden flex-col gap-2 lg:flex"
          />
        </div>

        <div className="contents lg:relative lg:block lg:min-w-0">
          <header className="col-start-2 flex min-w-0 flex-col items-center justify-center self-center text-center md:self-start lg:flex-row lg:items-baseline lg:justify-center lg:gap-4 lg:text-center">
            <h3 className="text-3d-gold max-w-3xl break-keep text-lg font-black leading-tight sm:text-2xl md:text-3xl lg:min-w-0 lg:truncate lg:whitespace-nowrap">
              {source.title}
            </h3>
            {(source.creator || edition.creator) && (
              <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary sm:text-base lg:mt-0 lg:shrink-0 lg:whitespace-nowrap">
                {source.creator || edition.creator}
              </p>
            )}
          </header>

          <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2">
            <AnimatedHeight independent duration={320} className="w-full">
              {introduction.failed ? (
                <RetryBlock onRetry={introduction.retry} />
              ) : (
                <FigureBookIntroduction
                  key={edition.id}
                  description={introduction.description || t("sourceWorkIntroductionEmpty")}
                  label={t("sourceWorkIntroduction")}
                  loading={introduction.loading}
                  sourceTitle={source.title}
                />
              )}
            </AnimatedHeight>
          </div>
          {meta.length > 0 && (
            <AnimatedHeight independent duration={320} className="col-span-2 mt-5 lg:col-span-1">
              <dl className="effect-engraved border-s border-t border-stone-light bg-stone-heavy/70">
                {meta.map(({ label, value }) => (
                  <div
                    key={label}
                    className="grid min-h-11 grid-cols-[76px_minmax(0,1fr)] border-b border-e border-stone-light bg-bg-secondary/50 sm:grid-cols-[108px_minmax(0,1fr)]"
                  >
                    <dt className="effect-engraved flex items-center justify-center border-e border-stone-light px-3 py-2.5 text-center text-sm font-bold text-text-tertiary">
                      {label}
                    </dt>
                    <dd className="effect-bevel min-w-0 break-words px-4 py-2.5 text-sm font-semibold leading-relaxed text-text-primary">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </AnimatedHeight>
          )}

          <FigureBookActions
            source={source}
            edition={edition}
            className="col-span-2 mt-5 flex flex-col gap-2 sm:flex-row lg:hidden"
          />
        </div>
      </div>
    </div>
  );
}
