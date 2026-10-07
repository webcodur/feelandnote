"use client";

import { useLocale, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import SourceLink from "@/components/ui/SourceLink";
import ContentInfoDialog from "@/components/shared/content/ContentInfoDialog";
import ContentDescription from "@/components/shared/content/ContentDescription";
import type { ChartCategory } from "@/lib/library/chartSources";
import type { ChartShelfItem } from "./ChartShelf";

export default function ChartWorkModal({ item, category, onClose }: {
  item: ChartShelfItem;
  category: Exclude<ChartCategory, "BOOK">;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("library.popular");
  const music = category === "MUSIC";
  const source = category === "VIDEO" ? "apple-movies" : category === "GAME" ? "steam" : "apple-music";
  const date = item.releaseDate ? new Date(item.releaseDate) : null;
  const published = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date) : null;
  const facts = [
    published ? { label: t(`charts.detail.${music ? "musicReleased" : "released"}`), value: published } : null,
    item.genres?.length ? { label: t("detail.genre"), value: item.genres.join(" · ") } : null,
    item.developers?.length ? { label: t("charts.detail.developer"), value: item.developers.join(" · ") } : null,
    item.publishers?.length ? { label: t("charts.detail.publisher"), value: item.publishers.join(" · ") } : null,
    item.explicit ? { label: t("charts.detail.advisory"), value: t("charts.detail.explicit") } : null,
  ].filter(fact => fact !== null);
  return <ContentInfoDialog type={category} title={item.title} creator={item.creator} thumbnail={item.artwork}
    label={t("rank", { rank: item.rank })} facts={facts} factsExtra={item.footer} onClose={onClose}
    purchase={{ contentId: category === "GAME" ? `steam-${item.id}` : `${category.toLowerCase()}-chart-${item.id}`,
      type: category, title: item.title, creator: item.creator, thumbnail: item.artwork,
      placement: "popular-chart", initialAccess: item.access }}>
    {!music && <ContentDescription title={t(`charts.detail.${category === "VIDEO" ? "synopsis" : "aboutGame"}`)}
      description={item.description} emptyLabel={t("charts.detail.unavailable")} />}
      <div className="mt-5 flex justify-end text-xs text-text-tertiary">
        <SourceLink sourceUrl={item.sourceUrl}
          className="inline-flex min-h-11 items-center gap-1 rounded-control underline decoration-text-tertiary underline-offset-4 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t("freshness.source")}: {t(`charts.sources.${source}`)}<ExternalLink size={11} aria-hidden />
          <span className="sr-only">{t("newTab")}</span>
        </SourceLink>
      </div>
  </ContentInfoDialog>;
}
