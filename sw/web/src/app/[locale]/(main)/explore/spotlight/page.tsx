/*
  파일명: /app/(main)/explore/spotlight/page.tsx
  기능: 스포트라이트 독립 페이지
  책임: 스포트라이트(FeaturedSpotlight)를 독립 페이지로 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getFeaturedTags } from "@/actions/home";
import FeaturedSpotlight from "@/components/features/landing/FeaturedSpotlight";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("explore.spotlight");
  return {
    title: t("metaTitle"),
    alternates: await getLocalizedAlternates("/explore/spotlight"),
  };
}

async function SpotlightServer({ initialTagId }: { initialTagId?: string }) {
  const featuredTags = await getFeaturedTags();

  return (
    <AsyncIntlProvider>
      <FeaturedSpotlight tags={featuredTags} location="explore-pc" initialTagId={initialTagId} />
    </AsyncIntlProvider>
  );
}

export default async function SpotlightPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag : undefined;

  return <SpotlightServer initialTagId={tag} />;
}
