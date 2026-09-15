"use client";

import { useTranslations } from "next-intl";
import type { BestsellerItem } from "@/actions/library/types";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";

export default function PopularPreview({
  items,
  restCount,
  ...freshness
}: { items: BestsellerItem[]; restCount: number } & BestsellerFreshnessProps) {
  const t = useTranslations("library.popular");

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-text-secondary">{t("chartEmpty")}</p>;
  }

  return (
    <div className="space-y-5">
      <BestsellerFreshness {...freshness} />
      <BookChartGrid items={items} />
      {/* 허브는 앞 순위 몇 권만 세운다 — 남은 권수를 알려 아래 「더 보기」로 잇는다 */}
      {restCount > 0 && (
        <p className="text-center text-xs text-text-tertiary md:text-[13px]">
          {t("previewRest", { count: restCount })}
        </p>
      )}
    </div>
  );
}
