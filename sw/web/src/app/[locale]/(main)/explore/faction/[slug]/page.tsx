/*
  파일명: /app/(main)/explore/faction/[slug]/page.tsx
  기능: 테마별 고유 주소 세력도감 페이지 (예: /explore/faction/xai)
  책임: slug로 세력도감 테마를 찾아 해당 테마를 펼친 채 보여준다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getFeaturedTags } from "@/actions/home";
import FeaturedFaction from "@/components/features/landing/FeaturedFaction";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("explore.faction");
  const tags = await getFeaturedTags();
  const tag = tags.find((tg) => tg.slug === slug);

  return {
    title: tag ? `${tag.name} · ${t("metaTitle")}` : t("metaTitle"),
    alternates: await getLocalizedAlternates(`/explore/faction/${slug}`),
  };
}

export default async function FactionSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const featuredTags = await getFeaturedTags();
  const tag = featuredTags.find((tg) => tg.slug === slug);

  if (!tag) notFound();

  return (
    <AsyncIntlProvider>
      <FeaturedFaction tags={featuredTags} location="explore-pc" initialTagId={tag.id} />
    </AsyncIntlProvider>
  );
}
