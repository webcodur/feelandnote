/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 원전 바로가기 단추
 * - 목차 위치: sourceWorks
 * - 데이터: source/edition props
 * - 구매 링크는 여기 두지 않는다 — 제목 아래 통합 구매 모듈(BookPurchaseSummary)이 서점 링크를 창으로 연다
 * - 함께 보기: FigureBookFeature.tsx, FigureBookWorksSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { ArrowUpRight, BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";

interface FigureBookActionsProps {
  source: FigureBookContent;
  className: string;
  compact?: boolean;
}

export default function FigureBookActions({
  source,
  className,
  compact = false,
}: FigureBookActionsProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const contentHref = `${locale === "en" ? "/en" : ""}/content/${source.id}?category=${source.category}`;

  return (
    <div className={`relative z-10 ${className}`}>
      <a
        href={contentHref}
        className="effect-bevel group inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap border border-accent bg-accent px-3 py-2.5 text-sm font-black text-bg-secondary hover:bg-accent-hover active:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
      >
        <BookOpenText size={17} aria-hidden />
        {t("sourceWorkOpen")}
        {!compact && (
          <ArrowUpRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        )}
      </a>
    </div>
  );
}
