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
import { buildFactionDescription, buildFactionTitle } from "@/lib/atlasMeta";
import { buildFactionSections, localizedFactionDescription, localizedFactionHeadline, localizedFactionName } from "@/lib/faction-sections";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionLastSeen from "@/components/features/faction/FactionLastSeen";
import FactionScreen from "../FactionScreen";

type PageParams = Promise<{ locale: Locale; slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }) {
  const { locale, slug } = await params;
  const [t, factions] = await Promise.all([
    getTranslations({ locale, namespace: "explore.faction" }),
    getFeaturedFactions(),
  ]);
  const faction = factions.find((f) => f.slug === slug && f.is_featured && !f.isGroup);
  const alternates = await getLocalizedAlternates(`/explore/faction/${slug}`);
  if (!faction) return { title: t("metaTitle"), alternates };
  // 제목은 「세력 이름: 대표 2명 등」, 설명은 한 줄 정의 + 그룹·인물로 끝나는 「만나 보세요!」(26.09.30 채택).
  // 「OpenAI · 세력도감」처럼 아무도 검색하지 않는 「세력도감」을 제목에 두지 않는다(26.09.29)
  const seoLocale = locale === "en" ? "en" : "ko";
  const positions = new Map<string, number>();
  for (const celeb of faction.celebs) {
    const label = celeb.group_label?.trim();
    if (label) positions.set(label, Math.min(positions.get(label) ?? Infinity, celeb.group_position ?? Infinity));
  }
  const input = {
    name: localizedFactionName(faction, locale),
    headline: localizedFactionHeadline(faction, locale),
    description: localizedFactionDescription(faction, locale),
    leads: faction.celebs.slice(0, 6).map((celeb) => (locale === "en" ? celeb.nickname_en?.trim() || celeb.nickname : celeb.nickname)),
    memberCount: faction.celebs.length,
    isFiction: faction.is_fiction,
    groups: [...positions.keys()].sort((a, b) => positions.get(a)! - positions.get(b)!).map((label) =>
      seoLocale === "en" ? faction.celebs.find((celeb) => celeb.group_label === label)?.group_label_en?.trim() || null : label),
  };
  return {
    title: buildFactionTitle(input, seoLocale),
    description: buildFactionDescription(input, seoLocale),
    alternates,
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

  return (
    <>
      <FactionLastSeen slug={slug} />
      <FactionScreen sections={sections} section={section} entry={faction} locale={locale} withJsonLd />
    </>
  );
}
