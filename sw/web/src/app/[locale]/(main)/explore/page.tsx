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
import { getFactionHubPreviews } from "@/actions/home/getFactionHubPreviews";
import HubSection from "@/components/shared/HubSection";
import { EXPLORE_GROUP_ID, EXPLORE_SECTIONS, EXPLORE_STANDALONE, hubNavItems, hubSection, withoutMore } from "@/components/shared/hubSectionUtils";
import HubNav from "@/components/shared/HubNav";
import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";
import RankingTabs from "@/components/features/user/explore/hub/RankingTabs";
import PersonaDistribution from "@/components/features/user/explore/personaAnalysis/PersonaDistribution";
import FactionCard from "@/components/features/user/explore/hub/FactionCard";

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
  const [trendingResult, deepReadersResult, topByType, personaPeople, allResult, factionTagNames] = await Promise.all([
    // 최근 30일 조회수 순 — 누적으로 뽑으면 앞자리가 영원히 고정된다
    getCelebs({ sortBy: "trending", limit: 12 }),
    getCelebs({ sortBy: "content_count", minContentCount: 30, limit: 6 }),
    getTopByContentType(),
    getPersonaDistribution(),
    getCelebs({ sortBy: "daily_recommend", limit: 12, tiers: ["full"] }),
    getFactionHubPreviews(),
  ]);

  const trendingCelebs = trendingResult.celebs;
  const deepReaders = deepReadersResult.celebs;
  const allCelebs = allResult.celebs;
  /* 데이터가 비어 접히는 구획이 있다. 목차와 구획 번호는 반드시 "실제로 그려지는 것"에서만 뽑는다 —
     정적 목록에서 뽑으면 접힌 구획이 목차에 남아 눌러도 아무 일이 없고 번호도 어긋난다. */
  const shown: Record<string, boolean> = {
    // 인기 프로필은 랭킹 구획 안의 첫 탭이다 — 별도 구획이 아니다
    ranking: trendingCelebs.length > 0 || deepReaders.length > 0 || topByType.length > 0,
    personaAnalysis: personaPeople.length > 0,
    faction: true,
    allCelebs: allCelebs.length > 0,
  };
  const sections = EXPLORE_SECTIONS.filter((s) => shown[s.key]);
  const sec = (key: string) => hubSection(sections, EXPLORE_GROUP_ID, key, t);

  return (
    <div className="space-y-12 md:space-y-16">
      {/* 목차 줄 — 그려지는 구획 + 별도 화면. 라벨·순서·번호는 config 단일원천에서 온다 */}
      <HubNav
        hubItems={hubNavItems(sections, t)}
        standaloneItems={EXPLORE_STANDALONE.map((s) => ({ label: t(s.key), href: s.href, icon: s.icon }))}
        groupId={EXPLORE_GROUP_ID}
      />

      {/* 랭킹 — 인기 프로필 · 기록 수집가 · 분야별 챔피언 탭. 더보기는 탭마다 달라 래퍼에서 뗀다.
          인기 프로필은 영향력(고정값)과 달리 최근 30일 조회로 매겨 순위가 흐른다 */}
      {shown.ranking && (
        <HubSection {...withoutMore(sec("ranking"))}>
          <RankingTabs trending={trendingCelebs} deepReaders={deepReaders} topByType={topByType} />
        </HubSection>
      )}

      {/* 성향 분석 — 성향 분포 */}
      {shown.personaAnalysis && (
        <HubSection {...sec("personaAnalysis")}>
          <PersonaDistribution people={personaPeople} />
        </HubSection>
      )}

      {/* 세력도감 */}
      <HubSection {...sec("faction")}>
        <FactionCard locale={locale} tags={factionTagNames} />
      </HubSection>

      {/* 전체 탐구자 */}
      {shown.allCelebs && (
        <HubSection {...sec("allCelebs")}>
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
