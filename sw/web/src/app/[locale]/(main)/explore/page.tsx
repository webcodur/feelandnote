import hubStyles from "@/components/shared/HubSection.module.css";
import { getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { NAV_ITEMS } from "@/constants/navigation";
import { EXPLORE_HUB_GROUP, EXPLORE_LENS_IMAGES, FIGURE_LENS_GROUPS, FIGURE_AUXILIARY_LINKS } from "@/constants/exploreLenses";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { resolveTrendCountry, TREND_COUNTRY_COOKIE } from "@/constants/trendCountries";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { EXPLORE_LENS_GROUP_HEADING_CLASS } from "@/components/shared/ExploreCard.styles";
import HubSection from "@/components/shared/HubSection";
import { hubAtlasNavItems, hubSectionId } from "@/components/shared/hubSectionUtils";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { FiguresFilterResult } from "./figures/sections";
import { parseFilterParams } from "./figures/filterParams";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("explore.meta");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/explore"),
    // openGraph는 선언하지 않는다 — 레이아웃의 대표 이미지·사이트명을 지키고 제목·설명은 Next가 채운다([locale]/layout.tsx)
  };
}

export default async function ExplorePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilterParams(await searchParams);
  const [requestCookies, requestHeaders] = await Promise.all([cookies(), headers()]);
  filters.trendCountry = resolveTrendCountry(filters.trendCountry, requestCookies.get(TREND_COUNTRY_COOKIE)?.value, requestHeaders.get("CF-IPCountry"));
  const t = await getTranslations("explore.hub");
  const nav = await getTranslations("nav.sub");
  const pending = await getTranslations("pending");
  // 주제별 탐색 — 주소·이름은 메뉴 설정(NAV_ITEMS), 그림·묶음·순서는 exploreLenses가 쥔다
  const hrefByKey = new Map(NAV_ITEMS.find((item) => item.key === "explore")!.subLinks!.map((page) => [page.key!, page.href]));

  // 홈과 같은 번호 구획으로 목록과 주제별 탐색을 목차에 연결한다.
  const hubGroup = EXPLORE_HUB_GROUP.figures;
  const titles = [t("navCelebs"), t("quickNav")];

  return (
    <div className={hubStyles.page}>
      <AsyncIntlProvider>
        <AtlasNavSections items={hubAtlasNavItems(titles, hubGroup)} />
      </AsyncIntlProvider>
      <div>
        <HubSection title={titles[0]} id={hubSectionId(0, hubGroup)} index={0} total={titles.length} hideDivider>
          <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
            <FiguresFilterResult params={filters} />
          </Lane>
        </HubSection>
        <HubSection title={titles[1]} id={hubSectionId(1, hubGroup)} index={1} total={titles.length}>
          {/* 쓰임새별 묶음. 크기는 큰 카드(휴대폰 두 열 타일) | 낮은 줄 카드 두 단계뿐이다 */}
          <nav aria-label={titles[1]} className="space-y-8 md:space-y-10">
          {FIGURE_LENS_GROUPS.map((group) => (
            <section key={group.key} aria-labelledby={`explore-lens-${group.key}`}>
              <h3 id={`explore-lens-${group.key}`} className={EXPLORE_LENS_GROUP_HEADING_CLASS}>{t(`lensGroups.${group.key}`)}</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {group.items.map((key) => {
                  const href = hrefByKey.get(key);
                  const image = EXPLORE_LENS_IMAGES[key];
                  return href && image && (
                    <ExploreFeatureCard key={key} href={href} title={nav(key)} description={t(`pageDescriptions.${key}`)}
                      imageSrc={image.src} imageKind={image.kind} imageFit={image.fit} compact={group.size === "compact"} />
                  );
                })}
              </div>
            </section>
          ))}
          <div className="flex justify-center gap-2 sm:gap-3">
            {FIGURE_AUXILIARY_LINKS.map((key) => {
              const href = hrefByKey.get(key);
              return href && (
                <Link key={key} href={href} prefetch={false}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-sm text-text-secondary hover:bg-accent/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {nav(key)}<ArrowRight size={14} aria-hidden />
                </Link>
              );
            })}
          </div>
          </nav>
        </HubSection>
      </div>
    </div>
  );
}
