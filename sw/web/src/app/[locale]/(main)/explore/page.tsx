import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { NAV_ITEMS } from "@/constants/navigation";
import { EXPLORE_HUB_GROUP, EXPLORE_LENS_IMAGES, FIGURE_LENS_GROUPS } from "@/constants/exploreLenses";
import { getTrendCountryOptions, parseTrendCountry } from "@/constants/trendCountries";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { EXPLORE_LENS_GROUP_HEADING_CLASS } from "@/components/shared/ExploreCard.styles";
import HubNav from "@/components/shared/HubNav";
import HubSection from "@/components/shared/HubSection";
import { hubAnchorItems } from "@/components/shared/hubSectionUtils";
import { FiguresFilterResult } from "./figures/sections";
import { parseFilterParams } from "./figures/filterParams";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/explore"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function ExplorePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilterParams(await searchParams);
  const visitorCountry = parseTrendCountry((await headers()).get("CF-IPCountry"));
  const trendCountry = filters.trendCountry ?? visitorCountry ?? "KR";
  filters.trendCountry = trendCountry;
  const trendCountryOptions = getTrendCountryOptions(visitorCountry, trendCountry);
  const t = await getTranslations("explore.hub");
  const nav = await getTranslations("nav.sub");
  const pending = await getTranslations("pending");
  // 관점별 보기 — 주소·이름은 메뉴 설정(NAV_ITEMS), 그림·묶음·순서는 exploreLenses가 쥔다
  const hrefByKey = new Map(NAV_ITEMS.find((item) => item.key === "explore")!.subLinks!.map((page) => [page.key!, page.href]));

  // 홈과 같은 문법 — 모드 탭 아래 목차, 번호 구획 둘(인물 목록 · 관점별 보기). 목차 라벨은 구획 제목과 같은 문구다
  const hubGroup = EXPLORE_HUB_GROUP.figures;
  const titles = [t("navCelebs"), t("quickNav")];

  return (
    <div>
      <HubNav hubItems={hubAnchorItems(titles, hubGroup)} groupId={hubGroup} />
      <div className="space-y-8 md:space-y-10">
        <HubSection title={titles[0]} index={0} total={titles.length} groupId={hubGroup} hideDivider>
          <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
            <FiguresFilterResult params={filters} trendCountryOptions={trendCountryOptions} />
          </Lane>
        </HubSection>
        <HubSection title={titles[1]} index={1} total={titles.length} groupId={hubGroup}>
          {/* 쓰임새별 묶음. 크기는 큰 카드(휴대폰 두 열 타일) | 낮은 줄 카드 두 단계뿐이다 */}
          <nav aria-label={titles[1]} className="space-y-8 md:space-y-10">
          {FIGURE_LENS_GROUPS.map((group) => (
            <section key={group.key} aria-labelledby={`explore-lens-${group.key}`}>
              <h3 id={`explore-lens-${group.key}`} className={EXPLORE_LENS_GROUP_HEADING_CLASS}>{t(`lensGroups.${group.key}`)}</h3>
              <div className={group.size === "compact" ? "grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3" : "grid grid-cols-2 gap-3 md:gap-4"}>
                {group.items.map((key) => {
                  const href = hrefByKey.get(key);
                  const image = EXPLORE_LENS_IMAGES[key];
                  return href && image && (
                    <ExploreFeatureCard key={key} href={href} title={nav(key)} description={t(`pageDescriptions.${key}`)}
                      imageSrc={image.src} imageKind={image.kind} compact={group.size === "compact"} />
                  );
                })}
              </div>
            </section>
          ))}
          </nav>
        </HubSection>
      </div>
    </div>
  );
}
