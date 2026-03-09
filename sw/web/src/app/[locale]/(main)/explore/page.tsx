/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 큐레이션 섹션별로 셀럽을 소개하는 허브 역할
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { Users, Rss, Sparkles, BarChart3, Fingerprint, BookOpenText } from "lucide-react";
import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getPersonaExtremes } from "@/actions/home/getPersonaExtremes";
import { getFeaturedTags } from "@/actions/home/getFeaturedTags";
import HubSection from "@/components/shared/HubSection";
import { hubSectionNav } from "@/components/shared/hubSectionUtils";
import HubNav from "@/components/shared/HubNav";
import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";
import TopByTypeGrid from "@/components/features/user/explore/hub/TopByTypeGrid";
import PersonaExtremeGrid from "@/components/features/user/explore/hub/PersonaExtremeGrid";
import SpotlightCard from "@/components/features/user/explore/hub/SpotlightCard";
import HubSkeleton from "@/components/features/user/explore/hub/HubSkeleton";
import PopularBooks from "@/components/features/home/PopularBooks";

// #region SSoT: 허브 네비게이션 + 섹션 넘버링 공유 config
const GROUP_ID = "explore";
const SECTIONS = [
  { key: "deepReaders",     navKey: "navCelebs",     href: "/explore/figures",    icon: <Users size={14} /> },
  { key: "topByType",       navKey: "navTopByType",  href: "/explore/ranking",    icon: <BarChart3 size={14} /> },
  { key: "personaExtremes", navKey: "navPersona",    href: "/explore/persona",    icon: <Fingerprint size={14} /> },
  { key: "spotlight",       navKey: "navSpotlight",  href: "/explore/spotlight",  icon: <Sparkles size={14} /> },
] as const;
const STANDALONE = [
  { navKey: "navFeed",      href: "/explore/feed",      icon: <Rss size={14} /> },
  { navKey: "navDirectory", href: "/explore/directory",  icon: <BookOpenText size={14} /> },
] as const;
const nav = (key: string) => hubSectionNav(SECTIONS, GROUP_ID, key);
// #endregion

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: getAlternates("/explore"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
  };
}

async function HubContent() {
  const locale = await getLocale();
  const t = await getTranslations("explore.hub");

  // 병렬 데이터 페칭
  const [deepReadersResult, topByType, personaExtremes, lightResult, allResult, featuredTags] = await Promise.all([
    getCelebs({ sortBy: "content_count", minContentCount: 30, limit: 6 }),
    getTopByContentType(),
    getPersonaExtremes(),
    getCelebs({ sortBy: "influence", limit: 6, tier: "light" }),
    getCelebs({ sortBy: "daily_recommend", limit: 12, tier: "full" }),
    getFeaturedTags(),
  ]);

  const deepReaders = deepReadersResult.celebs;
  const lightCelebs = lightResult.celebs;
  const allCelebs = allResult.celebs;
  const spotlightTagNames = featuredTags
    .filter(tag => tag.is_featured && tag.celebs.length > 0)
    .slice(0, 4)
    .map(tag => ({
      id: tag.id,
      name: tag.name,
      name_en: tag.name_en,
      description: tag.description,
      description_en: tag.description_en,
      color: tag.color,
      celebs: tag.celebs.slice(0, 4).map(c => ({
        id: c.id,
        avatar_url: c.avatar_url,
        nickname: c.nickname,
        nickname_en: c.nickname_en,
      }))
    }));

  return (
    <div className="space-y-12 md:space-y-16">
      {/* 서브페이지 네비게이터 */}
      <HubNav
        hubItems={SECTIONS.map((s) => ({ label: t(s.navKey), href: s.href, icon: s.icon }))}
        standaloneItems={STANDALONE.map((s) => ({ label: t(s.navKey), href: s.href, icon: s.icon }))}
        groupId={GROUP_ID}
      />

      {/* 왕성한 기록가들 */}
      {deepReaders.length > 0 && (
        <HubSection
          title={t("deepReaders")}
          subtitle={t("deepReadersSub")}
          moreHref="/explore/figures?sortBy=content_count"
          moreLabel={t("viewMore")}
          hideDivider
          {...nav("deepReaders")}
        >
          <HubCelebGrid celebs={deepReaders} />
        </HubSection>
      )}

      {/* 분야별 최다 기록가 */}
      {topByType.length > 0 && (
        <HubSection title={t("topByType")} subtitle={t("topByTypeSub")} moreHref="/explore/ranking" moreLabel={t("viewAll")} {...nav("topByType")}>
          <TopByTypeGrid entries={topByType} />
        </HubSection>
      )}

      {/* 비범한 기록가 */}
      {personaExtremes.length > 0 && (
        <HubSection
          title={t("personaExtremes")}
          subtitle={t("personaExtremesSub")}
          moreHref="/explore/persona"
          moreLabel={t("viewAll")}
          {...nav("personaExtremes")}
        >
          <PersonaExtremeGrid entries={personaExtremes} />
        </HubSection>
      )}

      {/* 스포트라이트 */}
      <HubSection
        title={t("spotlight")}
        subtitle={t("spotlightSub")}
        moreHref="/explore/spotlight"
        moreLabel={t("viewAll")}
        {...nav("spotlight")}
      >
        <SpotlightCard locale={locale} tags={spotlightTagNames} />
      </HubSection>

      {/* 전체 인물 (Nav 대상 아님) */}
      {allCelebs.length > 0 && (
        <HubSection
          title={t("allCelebs")}
          subtitle={t("allCelebsSub")}
          moreHref="/explore/figures?tier=full"
          moreLabel={t("viewAll")}
        >
          <HubCelebGrid celebs={allCelebs} />
        </HubSection>
      )}

      {/* 사색가들 (Nav 대상 아님) */}
      {lightCelebs.length > 0 && (
        <HubSection
          title={t("lightCelebs")}
          subtitle={t("lightCelebsSub")}
          moreHref="/explore/figures?tier=light"
          moreLabel={t("viewAll")}
        >
          <HubCelebGrid celebs={lightCelebs} />
        </HubSection>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <>
      <Suspense fallback={<HubSkeleton />}>
        <HubContent />
      </Suspense>
      <PopularBooks />
    </>
  );
}
