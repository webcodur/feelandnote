/*
  파일명: /app/(main)/explore/faction/[slug]/page.tsx
  기능: 세력도감 테마 주소 (예: /explore/faction/xai)
  책임: 그 테마를 고른 채 세력도감 화면을 연다. 묶음 주소(예: /explore/faction/ai)로 오면 그 섹션으로 보낸다.
        테마의 정식 주소이므로 메타 설명과 구성원 구조화 데이터를 싣는다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getFeaturedFactions } from "@/actions/home";
import { redirect } from "@/i18n/navigation";
import { buildFactionSections, localizedFactionDescription, localizedFactionName } from "@/lib/faction-sections";
import { getLocalizedAlternates, toSeoDescription } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionScreen from "../FactionScreen";

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const [t, factions] = await Promise.all([
    getTranslations({ locale, namespace: "explore.faction" }),
    getFeaturedFactions(),
  ]);
  const faction = factions.find((f) => f.slug === slug && f.is_featured && !f.isGroup);
  const title = faction ? `${localizedFactionName(faction, locale)} · ${t("metaTitle")}` : t("metaTitle");
  const rawDescription = faction ? localizedFactionDescription(faction, locale) : null;
  const description = rawDescription ? toSeoDescription(rawDescription) : undefined;

  return {
    title,
    description,
    alternates: await getLocalizedAlternates(`/explore/faction/${slug}`),
    openGraph: { title, description },
  };
}

export default async function FactionEntryPage({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const factions = await getFeaturedFactions();
  const faction = factions.find((f) => f.slug === slug);

  if (faction?.isGroup) redirect({ href: `/explore/faction?section=${slug}`, locale });

  const sections = buildFactionSections(factions);
  const section = faction ? sections.find((item) => item.entries.some((entry) => entry.id === faction.id)) : undefined;
  if (!faction || !section) notFound();

  return <FactionScreen sections={sections} section={section} entry={faction} locale={locale} withJsonLd />;
}
