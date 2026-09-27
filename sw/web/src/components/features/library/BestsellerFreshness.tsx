"use client";

import { useLocale, useTranslations } from "next-intl";

export interface BestsellerFreshnessProps {
  updatedAt: string;
  basisDate?: string;
  sources: { name: string; url: string }[];
  isStale: boolean;
}

// 도서 차트의 기준일·지연 표시. ChartSourceNotice 요약줄 meta로 붙는다 — 인라인 요소만 출력한다.
// 출처 링크는 아코디언 본문의 「원본 사이트 보기」와 겹치므로 여기서는 그리지 않는다.
export default function BestsellerFreshness({ updatedAt, basisDate, isStale }: BestsellerFreshnessProps) {
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
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {hasDate && <time dateTime={dateValue}>{t(isKorean ? "basisDate" : "updated", { date: formattedDate })}</time>}
      {!hasDate && <span>{t("unknownDate")}</span>}
      {isStale && <span className="font-medium text-accent">{t("delayed")}</span>}
    </span>
  );
}
