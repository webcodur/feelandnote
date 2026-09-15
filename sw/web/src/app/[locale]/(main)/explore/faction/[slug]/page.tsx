/*
  파일명: /app/(main)/explore/faction/[slug]/page.tsx
  기능: 세력도감 테마 주소 (예: /explore/faction/xai)
  책임: 그 테마를 고른 채 세력도감 화면을 연다. 묶음 주소(예: /explore/faction/ai)로 오면 그 섹션으로 보낸다.
        테마의 정식 주소이므로 메타 설명과 구성원 구조화 데이터를 싣는다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getFeaturedTags } from "@/actions/home";
import { redirect } from "@/i18n/navigation";
import { buildFactionSections, localizedTagDescription, localizedTagName } from "@/lib/faction-sections";
import { getLocalizedAlternates, toSeoDescription } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionAtlasScreen from "../FactionAtlasScreen";

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const [t, tags] = await Promise.all([
    getTranslations({ locale, namespace: "explore.faction" }),
    getFeaturedTags(),
  ]);
  const tag = tags.find((tg) => tg.slug === slug && tg.is_featured && !tg.isGroup);
  const title = tag ? `${localizedTagName(tag, locale)} · ${t("metaTitle")}` : t("metaTitle");
  const rawDescription = tag ? localizedTagDescription(tag, locale) : null;
  const description = rawDescription ? toSeoDescription(rawDescription) : undefined;

  return {
    title,
    description,
    alternates: await getLocalizedAlternates(`/explore/faction/${slug}`),
    openGraph: { title, description },
  };
}

export default async function FactionThemePage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const tags = await getFeaturedTags();
  const tag = tags.find((tg) => tg.slug === slug);

  if (tag?.isGroup) redirect({ href: `/explore/faction?section=${slug}`, locale });

  const sections = buildFactionSections(tags);
  const section = tag ? sections.find((item) => item.themes.some((theme) => theme.id === tag.id)) : undefined;
  if (!tag || !section) notFound();

  return <FactionAtlasScreen sections={sections} section={section} theme={tag} locale={locale} withJsonLd />;
}
