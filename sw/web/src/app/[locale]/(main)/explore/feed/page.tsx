/*
  파일명: /app/(main)/explore/feed/page.tsx
  기능: 인물 피드 페이지
  책임: 인물들의 아카이브 피드를 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getCelebFeed } from "@/actions/home";
import CelebFeedSection from "@/components/features/agora/CelebFeedSection";

export async function generateMetadata() {
  const t = await getTranslations("explore.celebFeed");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: getAlternates("/explore/feed"),
  };
}

async function CelebFeedServer() {
  const celebFeedData = await getCelebFeed({ limit: 10 });

  return (
    <AsyncIntlProvider>
      <CelebFeedSection
        initialReviews={celebFeedData.reviews}
        initialCursor={celebFeedData.nextCursor}
        initialHasMore={celebFeedData.hasMore}
      />
    </AsyncIntlProvider>
  );
}

export default function CelebFeedPage() {
  return <CelebFeedServer />;
}
