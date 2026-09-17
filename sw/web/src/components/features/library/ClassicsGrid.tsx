/*
  파일명: /components/features/library/ClassicsGrid.tsx
  기능: 불후의 명작 작품 카드 격자
  책임: 인기 작품 화면 본문과 서가 허브 미리보기가 같은 카드 격자를 쓴다.
*/ // ------------------------------

"use client";

import { useLocale } from "next-intl";
import { ContentCard } from "@/components/ui/cards";
import CardBookPurchase from "@/components/features/commerce/CardBookPurchase";
import { getCategoryByDbType } from "@/constants/categories";
import type { LibraryContent } from "@/actions/library/types";
import type { ContentType } from "@/types/database";

export default function ClassicsGrid({ contents }: { contents: LibraryContent[] }) {
  const locale = useLocale();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 justify-center max-w-6xl mx-auto">
      {contents.map((content) => (
        <ContentCard
          key={content.id}
          contentId={content.id}
          contentType={content.type as ContentType}
          title={content.title}
          titleBadge={content.title_badge}
          creator={content.creator}
          thumbnail={content.thumbnail_url}
          celebCount={content.celeb_count}
          userCount={content.user_count}
          rating={content.avg_rating ?? undefined}
          href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
          titleKo={content.title_ko}
          titleEn={content.title_en}
          creatorEn={content.creator_en}
          thumbnailEn={content.thumbnail_en}
          hasEnEdition={content.has_en_edition}
          fallbackDescription={locale === "en" ? (content.review_en || content.review || null) : (content.review || content.review_en || null)}
          posterFooterNode={content.type === "BOOK" && (
            <CardBookPurchase
              contentId={content.id}
              title={content.title}
              creator={content.creator}
              affiliateUrl={content.affiliate_url}
            />
          )}
        />
      ))}
    </div>
  );
}
