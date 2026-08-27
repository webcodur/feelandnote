/*
  파일명: /components/features/library/hub/PopularPreview.tsx
  기능: 서가 허브의 「인기 작품」 미리보기
  책임: 지금 가장 주목받는 주간 베스트셀러 상위 6편을 대칭 그리드로 진열하며, 한/영 에디션 전환을 지원한다.
*/ // ------------------------------

"use client";

import { useLocale } from "next-intl";
import { ContentCard } from "@/components/ui/cards";
import type { BestsellerItem } from "@/actions/library/types";

export default function PopularPreview({ items }: { items: BestsellerItem[] }) {
  const locale = useLocale();
  if (!items || items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 justify-center max-w-6xl mx-auto">
      {items.map((item) => {
        const cleanIsbn = item.isbn ? item.isbn.trim().split(/\s+/).pop() : null;
        const href = cleanIsbn
          ? `/content/${cleanIsbn}?category=book`
          : `/search?q=${encodeURIComponent(item.title)}`;

        return (
          <ContentCard
            key={item.id}
            contentId={cleanIsbn || item.id}
            contentType="BOOK"
            title={item.title}
            creator={item.creator}
            thumbnail={item.thumbnail_url}
            thumbnailEn={item.thumbnail_en || item.thumbnail_url}
            href={href}
            titleKo={item.title_ko || (locale === "ko" ? item.title : undefined)}
            titleEn={item.title_en || (locale === "en" ? item.title : undefined)}
            creatorEn={item.creator_en || (locale === "en" ? item.creator : undefined)}
            hasEnEdition={!!item.title_en}
            fallbackDescription={item.description ?? null}
            fallbackMetadata={{
              publisher: item.publisher ?? undefined,
              publishDate: item.published_date ?? undefined,
              isbn: cleanIsbn ?? undefined,
            }}
          />
        );
      })}
    </div>
  );
}
