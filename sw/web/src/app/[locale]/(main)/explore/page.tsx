/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 큐레이션 섹션별로 셀럽을 소개하는 허브 역할
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getPersonaExtremes } from "@/actions/home/getPersonaExtremes";
import { getFeaturedTags } from "@/actions/home/getFeaturedTags";
import HubSection from "@/components/shared/HubSection";
import { EXPLORE_GROUP_ID, EXPLORE_SECTIONS, EXPLORE_STANDALONE, exploreSection } from "@/components/shared/hubSectionUtils";
import HubNav from "@/components/shared/HubNav";
import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";
import TopByTypeGrid from "@/components/features/user/explore/hub/TopByTypeGrid";
import PersonaExtremeGrid from "@/components/features/user/explore/hub/PersonaExtremeGrid";
import SpotlightCard from "@/components/features/user/explore/hub/SpotlightCard";
import PopularBooks from "@/components/features/home/PopularBooks";

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
      {/* 서브페이지 네비게이터 — SSoT config에서 라벨·순서·넘버링 동기화 */}
      <HubNav
        hubItems={EXPLORE_SECTIONS.map((s) => ({ label: t(s.key), href: s.moreHref, icon: s.icon }))}
        standaloneItems={EXPLORE_STANDALONE.map((s) => ({ label: t(s.key), href: s.href, icon: s.icon }))}
        groupId={EXPLORE_GROUP_ID}
      />

      {/* 1/6 왕성한 탐구자 */}
      {deepReaders.length > 0 && (
        <HubSection {...exploreSection("deepReaders", t)} hideDivider>
          <HubCelebGrid celebs={deepReaders} />
        </HubSection>
      )}

      {/* 2/6 분야별 랭킹 */}
      {topByType.length > 0 && (
        <HubSection {...exploreSection("topByType", t)}>
          <TopByTypeGrid entries={topByType} />
        </HubSection>
      )}

      {/* 3/6 비범한 인물 */}
      {personaExtremes.length > 0 && (
        <HubSection {...exploreSection("personaExtremes", t)}>
          <PersonaExtremeGrid entries={personaExtremes} />
        </HubSection>
      )}

      {/* 4/6 스포트라이트 */}
      <HubSection {...exploreSection("spotlight", t)}>
        <SpotlightCard locale={locale} tags={spotlightTagNames} />
      </HubSection>

      {/* 5/6 전체 탐구자 */}
      {allCelebs.length > 0 && (
        <HubSection {...exploreSection("allCelebs", t)}>
          <HubCelebGrid celebs={allCelebs} />
        </HubSection>
      )}

      {/* 6/6 사색가 */}
      {lightCelebs.length > 0 && (
        <HubSection {...exploreSection("lightCelebs", t)}>
          <HubCelebGrid celebs={lightCelebs} />
        </HubSection>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <>
      <HubContent />
      {/* 쿠팡 제휴: AdSense 승인 전까지 비활성 */}
      {/* <PopularBooks /> */}
    </>
  );
}
