/*
  파일명: /components/features/user/explore/sections/TopByTypeCard/SharedContentInsight.tsx
  기능: 매체 하나의 공통 감상 콘텐츠 인사이트
  책임: 셀럽 상세와 같은 ContentCard로 작품을 감상 인원 순서대로 배치한다.
        순번과 공유 인원 수만 표지 위 칩으로 얹고 별도 푸터는 두지 않는다.
*/ // ------------------------------

"use client";

import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ContentCard } from "@/components/ui/cards";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import type { SharedContent } from "@/actions/home/getSharedContents";
import type { ContentType } from "@/types/database";

export default function SharedContentInsight({
  items,
  color,
  type,
}: {
  items: SharedContent[];
  color: string;
  type: string;
}) {
  const t = useTranslations("explore.topByType");
  const tc = useTranslations("content.category");
  const locale = useLocale();
  if (items.length === 0) return null;

  const fallbackTitle = locale === "en" ? "Untitled" : "제목 미상";
  const ordered = [...items].sort((a, b) => b.celeb_count - a.celeb_count);

  return (
    <section aria-labelledby="shared-content-title" className="mt-8 space-y-4 border-t border-white/[0.06] pt-7">
      <div>
        <h3 id="shared-content-title" className="break-keep text-xl font-black tracking-tight text-text-primary sm:text-2xl">
          {t("sharedTitle", { media: tc(type.toLowerCase()) })}
        </h3>
        <p className="mt-1 break-keep text-xs leading-relaxed text-text-secondary sm:text-sm">{t("sharedDesc")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        {ordered.map((item, index) => (
          <div key={item.content_id} className="min-w-0">
            <ContentCard
              contentId={item.content_id}
              contentType={item.content_type as ContentType}
              title={item.title ?? fallbackTitle}
              creator={item.creator}
              thumbnail={item.thumbnail_url}
              href={`/content/${item.content_id}`}
              showHeader={false}
              showStats={false}
              /* 한국어 도서 카드는 서재 격자와 같은 구매 모듈을 표지 아래 붙인다 — YES24 단추 + 값표(★ 평점·가격) */
              posterFooterNode={
                locale === "ko" && item.content_type === "BOOK" ? (
                  <AffiliateBookAction contentId={item.content_id} compact />
                ) : undefined
              }
              overlayTopLeft={
                <span className="rounded-md bg-black/75 px-1.5 py-1 font-mono text-[10px] font-bold tabular-nums text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
              }
              overlayTopRight={
                <span
                  className="flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-1 text-[10px] font-bold tabular-nums text-white"
                  title={t("sharedBy")}
                >
                  <Users size={10} style={{ color }} aria-hidden />
                  {t("sharedCount", { count: item.celeb_count })}
                </span>
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}
