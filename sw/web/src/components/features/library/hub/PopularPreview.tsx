"use client";

import { useLocale, useTranslations } from "next-intl";
import type { BestsellerItem } from "@/actions/library/types";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";

export default function PopularPreview({
  items,
  restCount,
  ...freshness
}: { items: BestsellerItem[]; restCount: number } & BestsellerFreshnessProps) {
  const t = useTranslations("library.popular");
  const locale = useLocale();

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-text-secondary">{t("chartEmpty")}</p>;
  }

  return (
    <div className="space-y-5">
      {/* 차트 머리말 — 수수료 안내는 판매 단추 안에 묻지 않고 기준일 줄 옆에 둔다 */}
      <div className="flex items-center justify-center gap-2">
        <BestsellerFreshness {...freshness} />
        {locale === "ko" && (
          <BookPurchaseInfo className="inline-flex size-6 shrink-0 items-center justify-center self-center rounded-full border border-white/10" />
        )}
      </div>
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
