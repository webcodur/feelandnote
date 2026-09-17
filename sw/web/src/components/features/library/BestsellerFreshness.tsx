"use client";

import { useLocale, useTranslations } from "next-intl";

export interface BestsellerFreshnessProps {
  updatedAt: string;
  basisDate?: string;
  sources: { name: string; url: string }[];
  isStale: boolean;
}

export default function BestsellerFreshness({ updatedAt, basisDate, sources, isStale }: BestsellerFreshnessProps) {
  const locale = useLocale();
  const t = useTranslations("library.popular.freshness");
  const isKorean = locale === "ko";
  const dateValue = isKorean ? basisDate ?? "" : updatedAt;
  const date = new Date(dateValue);
  const hasDate = dateValue.length > 0 && Number.isFinite(date.getTime());
  const formattedDate = hasDate
    ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
        ...(!isKorean ? { hour: "2-digit" as const, minute: "2-digit" as const, timeZoneName: "short" as const } : {}),
      }).format(date)
    : "";

  return (
    /* 한 줄 요지 — 좁은 화면에서는 wrap으로 자연스럽게 넘어간다. 출처 링크도 같은 줄에 둔다.
       판매처·차트 종류는 위 부제/설명이 이미 말하므로 여기서 되풀이하지 않는다 */
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm leading-relaxed text-text-secondary">
      {hasDate && <time dateTime={dateValue}>{t(isKorean ? "basisDate" : "updated", { date: formattedDate })}</time>}
      {!hasDate && <span>{t("unknownDate")}</span>}
      {isStale && <span className="font-medium text-accent">{t("delayed")}</span>}
      {sources.length > 0 && (
        <span className="inline-flex items-baseline gap-x-1.5">
          <span className="text-text-tertiary">{t("source")}</span>
          {sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
              className="rounded-sm underline decoration-border underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {source.name}
            </a>
          ))}
        </span>
      )}
    </div>
  );
}
