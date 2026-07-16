/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 큐레이션 섹션별로 셀럽을 소개하는 허브 역할
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getPersonaDistribution } from "@/actions/persona/getPersonaDistribution";
import { getFeaturedTags } from "@/actions/home/getFeaturedTags";
import HubSection from "@/components/shared/HubSection";
import { EXPLORE_GROUP_ID, EXPLORE_SECTIONS, EXPLORE_STANDALONE, exploreSection } from "@/components/shared/hubSectionUtils";
import HubNav from "@/components/shared/HubNav";
import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";
import RankingTabs from "@/components/features/user/explore/hub/RankingTabs";
import PersonaDistribution from "@/components/features/user/explore/personaAnalysis/PersonaDistribution";
import SpotlightCard from "@/components/features/user/explore/hub/SpotlightCard";
import PopularBooks from "@/components/features/home/PopularBooks";

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/explore"),
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
  const [deepReadersResult, topByType, personaPeople, allResult, featuredTags] = await Promise.all([
    getCelebs({ sortBy: "content_count", minContentCount: 30, limit: 6 }),
    getTopByContentType(),
    getPersonaDistribution(),
    getCelebs({ sortBy: "daily_recommend", limit: 12, tiers: ["full"] }),
    getFeaturedTags(),
  ]);

  const deepReaders = deepReadersResult.celebs;
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

  // 랭킹 섹션은 탭 내부에서 탭별 더보기를 처리하므로 섹션 래퍼의 더보기는 생략
  const rs = exploreSection("ranking", t);
  const rankingSection = { title: rs.title, subtitle: rs.subtitle, index: rs.index, total: rs.total, groupId: rs.groupId };

  return (
    <div className="space-y-12 md:space-y-16">
      {/* 서브페이지 네비게이터 — SSoT config에서 라벨·순서·넘버링 동기화 */}
      <HubNav
        hubItems={EXPLORE_SECTIONS.map((s) => ({ label: t(s.key), href: s.moreHref, icon: s.icon }))}
        standaloneItems={EXPLORE_STANDALONE.map((s) => ({ label: t(s.key), href: s.href, icon: s.icon }))}
        groupId={EXPLORE_GROUP_ID}
      />

      {/* 1/4 랭킹 — 왕성한 탐구자 · 분야별 최고 탭 */}
      {(deepReaders.length > 0 || topByType.length > 0) && (
        <HubSection {...rankingSection} hideDivider>
          <RankingTabs deepReaders={deepReaders} topByType={topByType} />
        </HubSection>
      )}

      {/* 2/4 성향 분석 — 성향 분포 */}
      {personaPeople.length > 0 && (
        <HubSection {...exploreSection("personaAnalysis", t)}>
          <PersonaDistribution people={personaPeople} />
        </HubSection>
      )}

      {/* 3/4 스포트라이트 */}
      <HubSection {...exploreSection("spotlight", t)}>
        <SpotlightCard locale={locale} tags={spotlightTagNames} />
      </HubSection>

      {/* 4/4 전체 탐구자 */}
      {allCelebs.length > 0 && (
        <HubSection {...exploreSection("allCelebs", t)}>
          <HubCelebGrid celebs={allCelebs} />
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
