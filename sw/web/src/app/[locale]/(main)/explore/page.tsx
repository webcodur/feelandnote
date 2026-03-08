/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 큐레이션 섹션별로 셀럽을 소개하는 허브 역할
*/ // ------------------------------

import { Suspense } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";
import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getPersonaExtremes } from "@/actions/home/getPersonaExtremes";
import { getFeaturedTags } from "@/actions/home/getFeaturedTags";
import HubSection from "@/components/shared/HubSection";
import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";
import TopByTypeGrid from "@/components/features/user/explore/hub/TopByTypeGrid";
import PersonaExtremeGrid from "@/components/features/user/explore/hub/PersonaExtremeGrid";
import SpotlightCard from "@/components/features/user/explore/hub/SpotlightCard";
import HubSkeleton from "@/components/features/user/explore/hub/HubSkeleton";
import ExploreHubNav from "@/components/features/user/explore/hub/ExploreHubNav";

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
      <ExploreHubNav />

      {/* ========================================= */}
      {/* 파트 1: 기록가들 (Chroniclers) */}
      {/* ========================================= */}
      <div className="flex flex-col gap-1.5 md:gap-2 pt-4 md:pt-6 mb-2">
        <h1 className="text-3xl md:text-4xl font-black text-white px-1 tracking-tight">
          {t("groupDocumented")}
        </h1>
        <p className="text-sm md:text-base text-white/50 px-1 font-medium break-keep">
          {t("groupDocumentedDesc")}
        </p>
      </div>

      <div className="space-y-12 md:space-y-16">
        {/* 섹션 1: 왕성한 기록가들 */}
        {deepReaders.length > 0 && (
          <HubSection
            title={t("deepReaders")}
            subtitle={t("deepReadersSub")}
            moreHref="/explore/celebs?sortBy=content_count"
            moreLabel={t("viewMore")}
            hideDivider
          >
            <HubCelebGrid celebs={deepReaders} />
          </HubSection>
        )}

        {/* 섹션 2: 분야별 최다 기록가 */}
        {topByType.length > 0 && (
          <HubSection title={t("topByType")} subtitle={t("topByTypeSub")} moreHref="/explore/top-by-type" moreLabel={t("viewAll")}>
            <TopByTypeGrid entries={topByType} />
          </HubSection>
        )}

        {/* 섹션: 비범한 기록가 */}
        {personaExtremes.length > 0 && (
          <HubSection
            title={t("personaExtremes")}
            subtitle={t("personaExtremesSub")}
            moreHref="/explore/persona"
            moreLabel={t("viewAll")}
          >
            <PersonaExtremeGrid entries={personaExtremes} />
          </HubSection>
        )}

        {/* 섹션 4: 스포트라이트 */}
        <HubSection
          title={t("spotlight")}
          subtitle={t("spotlightSub")}
          moreHref="/explore/spotlight"
          moreLabel={t("viewAll")}
        >
          <SpotlightCard locale={locale} tags={spotlightTagNames} />
        </HubSection>

        {/* 섹션 5: 전체 인물 */}
        {allCelebs.length > 0 && (
          <HubSection
            title={t("allCelebs")}
            subtitle={t("allCelebsSub")}
            moreHref="/explore/celebs?tier=full"
            moreLabel={t("viewAll")}
          >
            <HubCelebGrid celebs={allCelebs} />
          </HubSection>
        )}
      </div>

      {/* ========================================= */}
      {/* 파트 2: 사색가들 (Thinkers of Unknown Records) */}
      {/* ========================================= */}
      {lightCelebs.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5 md:gap-2 pt-16 md:pt-20 border-t border-white/10 mt-8 mb-6">
            <h1 className="text-3xl md:text-4xl font-black text-white px-1 tracking-tight">
              {t("groupThinkers")}
            </h1>
            <p className="text-sm md:text-base text-white/50 px-1 font-medium break-keep">
              {t("groupThinkersDesc")}
            </p>
          </div>

          <HubSection
            title={t("lightCelebs")}
            subtitle={t("lightCelebsSub")}
            moreHref="/explore/celebs?tier=light"
            moreLabel={t("viewAll")}
            hideDivider
          >
            <HubCelebGrid celebs={lightCelebs} />
          </HubSection>
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <HubContent />
    </Suspense>
  );
}
