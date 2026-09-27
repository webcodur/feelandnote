"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import ContentCard from "@/components/ui/cards/ContentCard";
import ContentAccessPanel from "@/components/features/commerce/ContentAccessPanel";
import type { ContentAccess } from "@/lib/commerce/contentAccess";
import type { ChartCategory } from "@/lib/library/chartSources";

interface ChartShelfItem {
  id: string | number;
  rank: number;
  title: string;
  creator?: string;
  artwork: string | null;
  access: ContentAccess;
  footer?: ReactNode;
}

// 도서 선반(AffiliateBookList)과 같은 작품 카드·순위·반응형 배치를 쓴다.
export default function ChartShelf({ label, category, items }: {
  label: string;
  category: Exclude<ChartCategory, "BOOK">;
  items: ChartShelfItem[];
}) {
  const t = useTranslations("library.popular");
  const [openId, setOpenId] = useState<string | number | null>(null);

  return (
    <section className="mx-auto w-full max-w-6xl border-t border-white/5 pt-4 md:pt-6">
      {/* 좁은 화면: 두 열 세로 격자(불후의 명작과 같은 배치) · 넓은 화면: 가운데 정렬해 줄바꿈 */}
      <ol aria-label={label}
        className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:justify-center md:gap-5">
        {items.map(item => (
          <li key={item.id} value={item.rank}
            className="relative min-w-0 md:w-[180px]">
            <span className="mb-1 block text-2xl leading-none tabular-nums text-accent">
              <span className="sr-only">{t("rank", { rank: item.rank })}</span>
              <span aria-hidden="true">{item.rank}</span>
            </span>
            <ContentCard
              contentId={`${category.toLowerCase()}-chart-${item.id}`}
              contentType={category}
              title={item.title}
              creator={item.creator}
              thumbnail={item.artwork}
              onClick={() => setOpenId(item.id)}
              imageFit="contain"
              showHeader={false}
              showStats={false}
              showIntro={false}
              showGradient={false}
              className="hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              posterFooterNode={<div className="space-y-2">
                {item.footer}
                <ContentAccessPanel
                  contentId={category === "GAME" ? `steam-${item.id}` : `${category.toLowerCase()}-chart-${item.id}`}
                  type={category} title={item.title} creator={item.creator} thumbnail={item.artwork}
                  placement="popular-chart" compact initialAccess={item.access}
                  open={openId === item.id} onOpenChange={open => setOpenId(open ? item.id : null)} />
              </div>}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
