"use client";

import { useTranslations } from "next-intl";
import { RetryBlock } from "@/components/ui/pending";
import type { MusicChartSelection } from "@/lib/library/musicChart";
import ChartShelf from "./ChartShelf";

export default function MusicChartGrid({ chart }: { chart: MusicChartSelection | null }) {
  const t = useTranslations("library.popular.charts");
  if (chart?.status !== "ready") return <RetryBlock message={t("loadFailed")} />;

  return (
    <div className="space-y-5">
      <ChartShelf category="MUSIC" label={t("MUSIC.title")} items={chart.items.map(item => ({
        ...item,
        artwork: item.artwork?.replace(/\/\d+x\d+bb\.(png|jpg)$/, "/400x400bb.$1") ?? null,
        creator: item.artist,
        access: { links: [{ service: "appleMusic", url: item.url, title: "", platforms: [] }] },
      }))} />
      <p className="text-center text-xs text-text-tertiary">{chart.copyright}</p>
    </div>
  );
}
