"use client";

import { useTranslations } from "next-intl";
import { RetryBlock } from "@/components/ui/pending";
import type { StoreChartSelection } from "@/lib/library/storeChart";
import ChartShelf from "./ChartShelf";

export default function StoreChartGrid({ chart }: { chart: StoreChartSelection | null }) {
  const t = useTranslations("library.popular.charts");
  if (chart?.status !== "ready") return <RetryBlock message={t("loadFailed")} />;

  return (
    <div className="space-y-5">
      <ChartShelf category="VIDEO" label={t("VIDEO.title")} items={chart.items.map(item => ({
        ...item,
        artwork: item.artwork?.replace(/\/\d+x\d+bb\.(png|jpg)$/, "/400x600bb.$1") ?? null,
        access: { links: [{ service: "appleTv", url: item.url, title: "", platforms: [] }] },
      }))} />
      <p className="text-center text-xs text-text-tertiary">{chart.copyright}</p>
    </div>
  );
}
