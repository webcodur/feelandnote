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
import { isAdmin } from "@/lib/auth/checkAdmin";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/types/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "explore.faction" });
  const tags = await getFeaturedTags();
  const tag = tags.find((tg) => tg.slug === slug && tg.is_featured);
  const tagName = tag
    ? (locale === "en" ? tag.name_en?.trim() : tag.name)
    : null;

  return {
    title: tagName ? `${tagName} · ${t("metaTitle")}` : t("metaTitle"),
    alternates: await getLocalizedAlternates(`/explore/faction/${slug}`),
  };
}

export default async function FactionSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [featuredTags, supabase] = await Promise.all([getFeaturedTags(), createClient()]);
  const tag = featuredTags.find((tg) => tg.slug === slug && tg.is_featured);

  if (!tag) notFound();

  const canEditNames = await isAdmin(supabase);

  return (
    <AsyncIntlProvider>
      <FeaturedFaction
        tags={featuredTags}
        location="explore-pc"
        initialTagId={tag.id}
        canEditNames={canEditNames}
      />
    </AsyncIntlProvider>
  );
}
