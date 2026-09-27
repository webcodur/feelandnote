"use client";

import { useLocale, useTranslations } from "next-intl";

// 차트 갱신 시각 + 지연 표시. ChartSourceNotice 아코디언의 요약줄 meta로 붙는 인라인 요소만 출력한다.
export default function ChartFreshness({ updatedAt, isStale }: { updatedAt: string; isStale: boolean }) {
  const locale = useLocale();
  const korean = locale !== "en";
  const t = useTranslations("library.popular.charts");
  const tp = useTranslations("library.popular");
  // 숫자 시각으로 서버와 브라우저의 ICU 차이를 피한다.
  const updated = new Date(Date.parse(updatedAt) + (korean ? 9 * 3600_000 : 0)).toISOString().slice(0, 16).replace("T", " ");

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <time dateTime={updatedAt}>{t("updated", { date: updated, zone: korean ? "KST" : "UTC" })}</time>
      {isStale && <span className="text-accent">{tp("freshness.delayed")}</span>}
    </span>
  );
}
