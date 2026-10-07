"use client";

import { useLocale, useTranslations } from "next-intl";
import { RetryBlock } from "@/components/ui/pending";
import type { SteamChartSelection } from "@/lib/library/steamChart";
import ChartShelf from "./ChartShelf";

export default function SteamChartGrid({ chart }: { chart: SteamChartSelection | null }) {
  const locale = useLocale();
  const t = useTranslations("library.popular.charts");
  if (chart?.status !== "ready") return <RetryBlock message={t("loadFailed")} />;
  const number = new Intl.NumberFormat(locale);

  return (
    <div className="space-y-5">
      <ChartShelf category="GAME" label={t("GAME.steam.title")} items={chart.items.map(item => ({
        ...item,
        sourceUrl: item.url,
        creator: t("GAME.steam.players", { count: number.format(item.players) }),
        access: { links: [{ service: "steam", url: item.url, title: "", platforms: ["PC"] }] },
        footer: (
          <div className="space-y-2 text-center">
            <p className="text-xs tabular-nums text-text-secondary">{t("GAME.steam.peak", { count: number.format(item.peakPlayers) })}</p>
          </div>
        ),
      }))} />
      <p className="text-center text-xs text-text-tertiary">{t("GAME.steam.credit")}</p>
    </div>
  );
}
