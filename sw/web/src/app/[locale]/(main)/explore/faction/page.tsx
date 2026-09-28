/*
  파일명: /app/(main)/explore/faction/page.tsx
  기능: 세력도감 대문
  책임: 고른 섹션(`?section=`, 없으면 첫 섹션)의 첫 테마를 연다. 옛 주소(`?tag=`, `?faction=`)는 테마 주소로 보낸다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { getFeaturedFactions } from "@/actions/home";
import { redirect } from "@/i18n/navigation";
import { buildFactionSections, factionSectionKey, localizedFactionName } from "@/lib/faction-sections";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionScreen from "./FactionScreen";

/** 설명문에 이름을 싣는 섹션 수 — 넘치면 「등 N개」로 줄인다 */
const META_SECTION_NAMES = 4;

export async function generateMetadata() {
  const [t, factions, locale] = await Promise.all([
    getTranslations("explore.faction"),
    getFeaturedFactions(),
    getLocale() as Promise<Locale>,
  ]);
  // 설명이 없으면 사이트 공통 설명을 물려받아 홈과 중복됐다 — 실제 섹션 이름과 규모로 쓴다
  const sections = buildFactionSections(factions);
  const people = new Set(sections.flatMap((section) => section.entries.flatMap((entry) => entry.celebs.map((celeb) => celeb.id))));
  const themes = sections.reduce((sum, section) => sum + section.entries.length, 0);
  const names = sections.slice(0, META_SECTION_NAMES).map((section) => localizedFactionName(section.faction, locale));
  return {
    title: t("hubMetaTitle"),
    description: sections.length > 0
      ? t("metaDescription", {
        // 한국어는 뒤에 「등」이 붙으므로 쉼표로만 잇고, 영어는 「A, B, and C」로 잇는다
        sections: locale === "en" ? new Intl.ListFormat("en", { type: "conjunction" }).format(names) : names.join(", "),
        themes,
        people: people.size,
      })
      : undefined,
    alternates: await getLocalizedAlternates("/explore/faction"),
  };
}

export default async function FactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, factions, locale, pending] = await Promise.all([
    searchParams,
    getFeaturedFactions(),
    getLocale() as Promise<Locale>,
    getTranslations("pending"),
  ]);

  // 옛 주소(?tag= 또는 허브 카드의 ?faction= ID)는 테마 주소로, 묶음이면 그 섹션으로 보낸다
  const legacyId = typeof params.faction === "string" ? params.faction : params.tag;
  const legacyEntry = typeof legacyId === "string" ? factions.find((faction) => faction.id === legacyId) : undefined;
  if (legacyEntry?.slug) {
    redirect({
      href: legacyEntry.isGroup ? `/explore/faction?section=${legacyEntry.slug}` : `/explore/faction/${legacyEntry.slug}`,
      locale,
    });
  }

  const sections = buildFactionSections(factions);
  const requested = typeof params.section === "string" ? params.section : undefined;
  const section = sections.find((item) => factionSectionKey(item) === requested) ?? sections[0];

  if (!section) {
    return <p className="py-12 text-center text-sm text-text-secondary">{pending("empty")}</p>;
  }

  return <FactionScreen sections={sections} section={section} entry={section.entries[0]} locale={locale} />;
}
