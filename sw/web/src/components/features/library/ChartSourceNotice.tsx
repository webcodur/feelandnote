"use client";

/*
  베스트셀러 출처 안내 — 분야 칩 바로 아래 결과 줄 자리(탐색 두 모드와 같은 위치)에 선다.
  첫 줄: 무엇의 순위인지(국내 도서 · 일별 판매 순위). 둘째 줄: 갱신 시각 · 출처 원본으로 가는 링크(「YES24에서 원본 보기」).
  제휴 링크를 쓰는 출처만 수수료 고지를 한 줄 더 붙인다. 예전에는 네 줄로 쌓아 목록 머리가 길었다.
*/

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChartCategory, ChartSource } from "@/lib/library/chartSources";

interface Props {
  category: ChartCategory;
  source: ChartSource;
  /** 갱신 시각 등 인라인 메타 */
  meta?: ReactNode;
}

export default function ChartSourceNotice({ category, source, meta }: Props) {
  const t = useTranslations("library.popular.charts");
  const tp = useTranslations("library.popular");
  const tPurchase = useTranslations("content.purchaseInfo");
  const notice = category === "GAME" ? `GAME.${source.id}` : category;

  return (
    <div className="space-y-0.5 text-center text-xs leading-relaxed text-text-secondary">
      <p role="status" className="text-sm font-medium text-text-primary">{t(`${notice}.summary`)}</p>
      <p className="flex flex-wrap items-center justify-center gap-x-2">
        {meta && <span>{meta}</span>}
        {meta && <span aria-hidden className="text-text-tertiary">·</span>}
        <a href={source.url}
          className="inline-flex min-h-9 items-center rounded-control underline decoration-text-tertiary underline-offset-4 hover:text-accent hover:decoration-accent outline-none focus-visible:ring-2 focus-visible:ring-accent" target="_blank" rel="noopener noreferrer">
          {source.id === "apple-books"
            ? `${tp("freshness.source")}: ${t(`sources.${source.id}`)}`
            : t("viewSourceAt", { source: t(`sources.${source.id}`) })}<ExternalLink size={11} aria-hidden="true" className="ms-0.5" />
          <span className="sr-only">{tp("newTab")}</span>
        </a>
      </p>
      {source.affiliateLinks && <p className="text-text-tertiary">{tPurchase("notice")}</p>}
    </div>
  );
}
