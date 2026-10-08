/*
  파일명: /app/(main)/explore/works/page.tsx
  기능: 작품 모드 첫 화면
  책임: 첫 화면에서 곧바로 작품이 보이도록 분야별 베스트셀러(표지 순위 격자)를 세운다.
        기관 선정·불후의 명작·박물관·학당은 2번 구획 「주제별 탐색」 카드로 안내한다. 공용 목차로 두 구획을 오간다.
        예전 첫 화면은 기관 선정이었는데 기관 로고·선정 목록이 먼저 나와 작품까지 두 번 더 눌러야 했다(26.09.28 유저 지시로 자리 교체).
        옛 베스트셀러 주소(/explore/works/popular)는 이 화면으로 옮긴다(popular/page.tsx).
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { WORKS_FEATURED_LINKS } from "@/constants/navigation";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import HubSection from "@/components/shared/HubSection";
import { hubAtlasNavItems, hubSectionId } from "@/components/shared/hubSectionUtils";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { EXPLORE_HUB_GROUP, EXPLORE_LENS_IMAGES, REORGANIZING_WORK_LENSES } from "@/constants/exploreLenses";
import { chartCategory } from "@/lib/library/chartSources";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { BestsellerMain } from "./sections";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("library.meta");
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: await getLocalizedAlternates("/explore/works"),
  };
}

export default async function WorksPage({ searchParams }: { searchParams: Promise<{ category?: string; source?: string }> }) {
  const { category: categoryParam, source } = await searchParams;
  const category = chartCategory(categoryParam);
  const t = await getTranslations("library.hub");
  const pending = await getTranslations("pending");
  // 그림·재편 중 여부는 exploreLenses가 쥔다
  const imageOf = (key: string) => EXPLORE_LENS_IMAGES[key]?.src ?? "";
  const readyPages = WORKS_FEATURED_LINKS.filter(page => !REORGANIZING_WORK_LENSES.has(page.key!));
  const reorganizingPages = WORKS_FEATURED_LINKS.filter(page => REORGANIZING_WORK_LENSES.has(page.key!));

  // 분야 선택과 표지를 바로 보여 준다. 목차는 베스트셀러와 주제별 탐색 구획을 잇는다.
  const hubGroup = EXPLORE_HUB_GROUP.works;
  const titles = [t("bestsellerLabel"), t("quickNav")];

  return (
    <div className="works-hub-page pb-[60px] min-[1340px]:pb-8">
      <AsyncIntlProvider>
        <AtlasNavSections items={hubAtlasNavItems(titles, hubGroup)} />
      </AsyncIntlProvider>
      <div className="space-y-8 md:space-y-10">
        <section id={hubSectionId(0, hubGroup)} aria-labelledby="works-chart-title">
          <h2 id="works-chart-title" className="mb-3 text-center text-base font-semibold text-text-primary">{titles[0]}</h2>
          {/* 분야를 바꾸면 그 분야 차트를 새로 불러오는 동안 자리표를 보인다 */}
          <Lane key={`${category}-${source ?? ""}`} fallback={<PendingBlock variant="grid" count={10} label={pending("loading")} />}>
            <BestsellerMain category={category} source={source} />
          </Lane>
        </section>
        <HubSection title={titles[1]} id={hubSectionId(1, hubGroup)}>
          <nav aria-label={titles[1]}>
        {/* 크기는 두 단계 — 큰 카드(휴대폰 두 열 타일) | 낮은 줄 카드 */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {readyPages.map(page => (
            <ExploreFeatureCard key={page.key} href={page.href} title={t(`${page.key}Label`)} description={t(page.key!)} imageSrc={imageOf(page.key!)} />
          ))}
        </div>
        {/* 재편 중인 화면 — 내용은 계속 열어 두되 완성된 입구와 같은 크기로 앞세우지 않는다 */}
        {reorganizingPages.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:gap-4">
            {reorganizingPages.map(page => (
              <ExploreFeatureCard key={page.key} compact href={page.href} title={t(`${page.key}Label`)} description={t(page.key!)} imageSrc={imageOf(page.key!)} badge={t("reorganizing")} />
            ))}
          </div>
        )}
          </nav>
        </HubSection>
      </div>
    </div>
  );
}
