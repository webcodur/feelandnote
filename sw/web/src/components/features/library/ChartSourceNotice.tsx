"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChartCategory, ChartSource } from "@/lib/library/chartSources";

interface Props {
  category: ChartCategory;
  source: ChartSource;
  /** 요약줄에 붙는 갱신 시각 등 인라인 메타 */
  meta?: ReactNode;
}

export default function ChartSourceNotice({ category, source, meta }: Props) {
  const t = useTranslations("library.popular.charts");
  const tp = useTranslations("library.popular");
  const tPurchase = useTranslations("content.purchaseInfo");
  const notice = category === "GAME" ? `GAME.${source.id}` : category;

  return (
    <div className="space-y-1 text-center text-xs leading-relaxed text-text-secondary">
      <p className="text-sm text-text-primary">{t(`${notice}.summary`)}</p>
      {meta && <p>{meta}</p>}
      <p>
        <a href={source.url} target="_blank" rel="noopener noreferrer"
          className="underline decoration-border underline-offset-4 hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t("viewSource")}<ExternalLink size={11} aria-hidden="true" className="mb-px ml-0.5 inline" />
          <span className="sr-only">{tp("newTab")}</span>
        </a>
      </p>
      {source.affiliateLinks && <p className="text-text-tertiary">{tPurchase("notice")}</p>}
    </div>
  );
}
