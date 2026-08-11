/*
  파일명: /app/(main)/explore/page.tsx
  기능: 탐색 허브 페이지
  책임: 큐레이션 섹션별로 셀럽을 소개하는 허브 역할
*/ // ------------------------------

import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { getCelebs } from "@/actions/home/getCelebs";
import { getTopByContentType } from "@/actions/home/getTopByContentType";
import { getSpectrumDistribution } from "@/actions/spectrum/getSpectrumDistribution";
import { getFactionHubPreviews } from "@/actions/home/getFactionHubPreviews";
import HubSection from "@/components/shared/HubSection";
import { EXPLORE_GROUP_ID, EXPLORE_SECTIONS, EXPLORE_STANDALONE, hubNavItems, hubSection, withoutMore } from "@/components/shared/hubSectionUtils";
import HubNav from "@/components/shared/HubNav";
import RankingTabs from "@/components/features/user/explore/hub/RankingTabs";
import SpectrumDistribution from "@/components/features/user/explore/spectrumAnalysis/SpectrumDistribution";
import FactionCard from "@/components/features/user/explore/hub/FactionCard";
import PopularBooks from "@/components/features/home/PopularBooks";

const HUB_SPECTRUM_MIN_INFLUENCE = 40;

async function recoverHubData<T>(label: string, query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(`[ExplorePage] ${label} 조회 실패:`, error);
    return fallback;
  }
}

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
  const [trendingCelebs, topByType, spectrumPeople, allCelebs, factionTagNames] = await Promise.all([
    // 최근 30일 조회수 순 — 누적으로 뽑으면 앞자리가 영원히 고정된다
    recoverHubData("인기 인물", async () => (await getCelebs({ sortBy: "trending", limit: 12 })).celebs, []),
    recoverHubData("분야별 기록왕", getTopByContentType, []),
    recoverHubData("성향 분포", () => getSpectrumDistribution({ minInfluence: HUB_SPECTRUM_MIN_INFLUENCE }), []),
    recoverHubData("랜덤 인물", async () => (await getCelebs({ sortBy: "daily_recommend", limit: 12, tiers: ["full"] })).celebs, []),
    recoverHubData("세력도감", getFactionHubPreviews, []),
  ]);

  /* 데이터가 비어 접히는 구획이 있다. 목차와 구획 번호는 반드시 "실제로 그려지는 것"에서만 뽑는다 —
     정적 목록에서 뽑으면 접힌 구획이 목차에 남아 눌러도 아무 일이 없고 번호도 어긋난다. */
  const shown: Record<string, boolean> = {
    // 인기·기록왕·랜덤은 전부 프로필 구획 안의 탭이다 — 별도 구획이 아니다
    ranking: trendingCelebs.length > 0 || topByType.length > 0 || allCelebs.length > 0,
    spectrumAnalysis: spectrumPeople.length > 0,
    faction: factionTagNames.length > 0,
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

      {/* 프로필 — 인기 · 기록왕 · 랜덤 탭. 전체 링크는 기업가·종합점수 목록으로 고정해 래퍼에서 뗀다.
          인기는 영향력(고정값)과 달리 최근 30일 조회로 매겨 순위가 흐른다 */}
      {shown.ranking && (
        <HubSection {...withoutMore(sec("ranking"))}>
          <RankingTabs trending={trendingCelebs} topByType={topByType} dailyPicks={allCelebs} />
        </HubSection>
      )}

      {/* 성향 분석 — 성향 분포 */}
      {shown.spectrumAnalysis && (
        <HubSection {...sec("spectrumAnalysis")}>
          <SpectrumDistribution people={spectrumPeople} />
        </HubSection>
      )}

      {/* 세력도감 */}
      {shown.faction && (
        <HubSection {...sec("faction")}>
          <FactionCard locale={locale} tags={factionTagNames} />
        </HubSection>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <>
      <HubContent />
      {/* 제휴 도서 — 링크가 걸린 책이 없거나 영문 화면이면 컴포넌트가 스스로 접는다 */}
      <PopularBooks />
    </>
  );
}
