/*
  파일명: /app/(main)/explore/faction/page.tsx
  기능: 세력도감 대문
  책임: 고른 섹션(`?section=`, 없으면 첫 섹션)의 첫 테마를 연다. 옛 주소(`?tag=`)는 테마 주소로 보낸다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { getFeaturedTags } from "@/actions/home";
import { redirect } from "@/i18n/navigation";
import { buildFactionSections, factionSectionKey } from "@/lib/faction-sections";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionAtlasScreen from "./FactionAtlasScreen";

export async function generateMetadata() {
  const t = await getTranslations("explore.faction");
  return {
    title: t("metaTitle"),
    alternates: await getLocalizedAlternates("/explore/faction"),
  };
}

export default async function FactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, tags, locale, pending] = await Promise.all([
    searchParams,
    getFeaturedTags(),
    getLocale() as Promise<Locale>,
    getTranslations("pending"),
  ]);

  // 옛 주소(?tag=태그id)는 테마 주소로, 묶음이면 그 섹션으로 보낸다
  const legacyTag = typeof params.tag === "string" ? tags.find((tag) => tag.id === params.tag) : undefined;
  if (legacyTag?.slug) {
    redirect({
      href: legacyTag.isGroup ? `/explore/faction?section=${legacyTag.slug}` : `/explore/faction/${legacyTag.slug}`,
      locale,
    });
  }

  const sections = buildFactionSections(tags);
  const requested = typeof params.section === "string" ? params.section : undefined;
  const section = sections.find((item) => factionSectionKey(item) === requested) ?? sections[0];

  if (!section) {
    return <p className="py-12 text-center text-sm text-text-secondary">{pending("empty")}</p>;
  }

  return <FactionAtlasScreen sections={sections} section={section} theme={section.themes[0]} locale={locale} />;
}
