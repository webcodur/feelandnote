import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export default async function RetiredCelebFeedPage() {
  redirect({ href: '/explore', locale: await getLocale() })
}

/* 인물 피드 화면은 비활성화한다. 기존 구현은 주석으로 보존한다.
import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import { getCelebFeed } from "@/actions/home";
import CelebFeedSection from "@/components/features/agora/CelebFeedSection";

export async function generateMetadata() {
  const t = await getTranslations("explore.celebFeed");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/explore/feed"),
  };
}

async function CelebFeedServer() {
  const celebFeedData = await getCelebFeed({ limit: 10 });

  return (
    <>
      <CelebFeedSection
        initialReviews={celebFeedData.reviews}
        initialCursor={celebFeedData.nextCursor}
        initialHasMore={celebFeedData.hasMore}
      />
    </>
  );
}

export default function CelebFeedPage() {
  return <Lane fallback={<PendingBlock variant="rows" count={5} />}><CelebFeedServer /></Lane>;
}
*/
