/*
  파일명: /app/(main)/explore/faction/page.tsx
  기능: 세력도감 대문
  책임: 고른 섹션(`?section=`, 없으면 첫 섹션)의 첫 테마를 연다. 옛 주소(`?tag=`, `?faction=`)는 테마 주소로 보낸다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { getFeaturedFactions } from "@/actions/home";
import { redirect } from "@/i18n/navigation";
import { buildFactionSections, FACTION_LAST_COOKIE, factionSectionKey, localizedFactionName } from "@/lib/faction-sections";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import FactionScreen from "./FactionScreen";
import Lane from "@/components/ui/pending/Lane";
import MythScreenSkeleton from "@/components/features/user/explore/myth/MythScreenSkeleton";

/** 설명문에 이름을 싣는 섹션 수 — 넘치면 「등 N개」로 줄인다 */
const META_SECTION_NAMES = 4;

export async function generateMetadata() {
  const [t, factions, locale] = await Promise.all([
    getTranslations("explore.faction"),
    getFeaturedFactions(),
    getLocale() as Promise<Locale>,
  ]);
  // 설명이 없으면 사이트 공통 설명을 물려받아 홈과 중복됐다 — 실제 섹션 이름으로 쓴다.
  // 세력·인물 수는 싣지 않는다 — 자주 바뀌는데 검색 결과는 다음 방문까지 옛 숫자를 보인다(26.09.29)
  const sections = buildFactionSections(factions);
  const names = sections.slice(0, META_SECTION_NAMES).map((section) => localizedFactionName(section.faction, locale));
  return {
    title: t("hubMetaTitle"),
    description: sections.length > 0
      ? t("metaDescription", {
        // 한국어는 뒤에 「등」이 붙으므로 쉼표로만 잇고, 영어는 「A, B, and C」로 잇는다
        sections: locale === "en" ? new Intl.ListFormat("en", { type: "conjunction" }).format(names) : names.join(", "),
      })
      : undefined,
    alternates: await getLocalizedAlternates("/explore/faction"),
  };
}

async function FactionPageBody({
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
  /* 고른 섹션이 없을 때만 마지막으로 보던 세력(쿠키)을 찾는다 — 신화의 세계와 같은 차례.
     탐색은 요청마다 그리고 앞단 캐시도 없어 쿠키를 읽어도 렌더 방식이 바뀌지 않는다 */
  const savedSlug = requested ? undefined : (await cookies()).get(FACTION_LAST_COOKIE)?.value;
  const savedEntry = savedSlug
    ? sections.flatMap((item) => item.entries).find((entry) => entry.slug === savedSlug)
    : undefined;
  const section = savedEntry
    ? sections.find((item) => item.entries.some((entry) => entry.id === savedEntry.id))
    : sections.find((item) => factionSectionKey(item) === requested) ?? sections[0];

  if (!section) {
    return <p className="py-12 text-center text-sm text-text-secondary">{pending("empty")}</p>;
  }

  return <FactionScreen sections={sections} section={section} entry={savedEntry ?? section.entries[0]} locale={locale} />;
}

export default function FactionPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Lane fallback={<MythScreenSkeleton faction />}><FactionPageBody {...props} /></Lane>;
}
