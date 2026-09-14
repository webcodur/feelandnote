"use client";

import { useTranslations } from "next-intl";
import type { BestsellerItem } from "@/actions/library/types";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";

export default function PopularPreview({ items, ...freshness }: { items: BestsellerItem[] } & BestsellerFreshnessProps) {
  const t = useTranslations("library.popular");

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-text-secondary">{t("chartEmpty")}</p>;
  }

  return (
    <div className="space-y-5">
      <BestsellerFreshness {...freshness} />
      <BookChartGrid items={items} />
    </div>
  );
}
