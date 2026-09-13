/*
  파일명: /app/(main)/explore/ranking/page.tsx
  기능: 분야별 랭킹 전체 보기
  책임: 상단 메뉴에서 선택한 매체의 Top 10 인물과 공통 감상작만 조회해 표시한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { getCategoryByDbType } from "@/constants/categories";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { CONTENT_TYPES, getRankingHref, resolveRankingType } from "./constants";
import { TopByTypeMedia } from "./sections";

/* 콜드 상태에서 봇이 받는 완성 HTML이 중간에 잘리지 않게 상한을 넉넉히 둔다 */
export const maxDuration = 30;

/* Lane이 요청 헤더(UA)를 읽어 화면을 동적으로 만든다 — 정적 재검증은 더 이상 의미가 없어 지웠다 */

interface PageProps {
  searchParams: Promise<{ category?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  const type = resolveRankingType((await searchParams).category);
  const [t, tc] = await Promise.all([
    getTranslations("explore.topByType"),
    getTranslations("content.category"),
  ]);
  return {
    title: `${tc(type.toLowerCase())} · ${t("metaTitle")}`,
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates(getRankingHref(type)),
  };
}

export default async function TopByTypePage({ searchParams }: PageProps) {
  const type = resolveRankingType((await searchParams).category);
  const [t, tc, tr] = await Promise.all([
    getTranslations("pending"),
    getTranslations("content.category"),
    getTranslations("explore.topByType"),
  ]);

  return (
    <div className="space-y-10">
      <nav aria-label={tr("metaTitle")} className="flex flex-wrap justify-center gap-2">
        {CONTENT_TYPES.map((entry) => {
          const Icon = getCategoryByDbType(entry)?.lucideIcon;
          const active = type === entry;
          return <Link
            key={entry}
            href={getRankingHref(entry)}
            prefetch={false}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${active
              ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
              : "border-border/40 bg-bg-card/40 text-text-secondary hover:border-accent/40 hover:bg-bg-card hover:text-accent"}`}
          >
            {Icon && <Icon size={16} aria-hidden />}
            {tc(entry.toLowerCase())}
          </Link>;
        })}
      </nav>
      <Lane
        key={type}
        fallback={
          <PendingBlock
            variant="grid"
            cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            count={10}
            label={t("loading")}
          />
        }
      >
        <TopByTypeMedia type={type} />
      </Lane>
    </div>
  );
}
