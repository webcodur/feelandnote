"use client";

import { useLocale, useTranslations } from "next-intl";

export interface BestsellerFreshnessProps {
  updatedAt: string;
  sources: { name: string; url: string }[];
  isStale: boolean;
}

export default function BestsellerFreshness({ updatedAt, sources, isStale }: BestsellerFreshnessProps) {
  const locale = useLocale();
  const t = useTranslations("library.popular.freshness");
  const date = new Date(updatedAt);
  const hasDate = updatedAt.length > 0 && Number.isFinite(date.getTime());
  const formattedDate = hasDate
    ? new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Seoul",
      }).format(date)
    : "";

  return (
    <div className="space-y-1.5 text-center text-sm leading-relaxed text-text-secondary">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>{t("schedule")}</span>
        {hasDate && <time dateTime={updatedAt}>{t("updated", { date: formattedDate })}</time>}
        {!hasDate && <span>{t("unknownDate")}</span>}
        {isStale && <span className="font-medium text-accent">{t("delayed")}</span>}
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>{t("source")}</span>
          {sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
              className="rounded-sm underline decoration-border underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {source.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
