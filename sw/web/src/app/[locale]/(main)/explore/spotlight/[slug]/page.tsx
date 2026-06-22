/*
  파일명: /app/(main)/explore/spotlight/[slug]/page.tsx
  기능: 테마별 고유 주소 스포트라이트 페이지 (예: /explore/spotlight/xai)
  책임: slug로 기획전 테마를 찾아 해당 테마를 펼친 채 보여준다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getFeaturedTags } from "@/actions/home";
import FeaturedSpotlight from "@/components/features/landing/FeaturedSpotlight";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("explore.spotlight");
  const tags = await getFeaturedTags();
  const tag = tags.find((tg) => tg.slug === slug);

  return {
    title: tag ? `${tag.name} · ${t("metaTitle")}` : t("metaTitle"),
    alternates: getAlternates(`/explore/spotlight/${slug}`),
  };
}

export default async function SpotlightSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const featuredTags = await getFeaturedTags();
  const tag = featuredTags.find((tg) => tg.slug === slug);

  if (!tag) notFound();

  return (
    <AsyncIntlProvider>
      <FeaturedSpotlight tags={featuredTags} location="explore-pc" initialTagId={tag.id} />
    </AsyncIntlProvider>
  );
}
