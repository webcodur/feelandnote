import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { NAV_ITEMS } from "@/constants/navigation";
import { EXPLORE_LENS_IMAGES, EXPLORE_LENS_SECTION_ID, EXPLORE_LIST_TOP_ID, FIGURE_LENS_GROUPS } from "@/constants/exploreLenses";
import { getTrendCountryOptions, parseTrendCountry } from "@/constants/trendCountries";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { EXPLORE_LENS_GROUP_HEADING_CLASS, EXPLORE_QUICKNAV_SECTION_CLASS } from "@/components/shared/ExploreCard.styles";
import { ExploreLensHeading } from "@/components/shared/ExploreHubIntro";
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

  return (
    <div className="space-y-8 md:space-y-10">
      <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
        <FiguresFilterResult params={filters} trendCountryOptions={trendCountryOptions} />
      </Lane>
      {/* 구분선 위는 짧게(부모 space-y), 아래는 넉넉히 띄운다(code-rules.md 「구분선」). 제목 모양은 작품 모드와 같다.
          모드 탭 아래 「관점별 보기 ↓」가 이 자리로 내려온다(링크와 구획 제목이 같은 문구 quickNav) */}
      <nav id={EXPLORE_LENS_SECTION_ID} aria-label={t("quickNav")} className={EXPLORE_QUICKNAV_SECTION_CLASS}>
        <ExploreLensHeading title={t("quickNav")} back={{ href: `#${EXPLORE_LIST_TOP_ID}`, label: t("listJump") }} />
        {/* 쓰임새별 묶음. 크기는 큰 카드(휴대폰 두 열 타일) | 낮은 줄 카드 두 단계뿐이다 */}
        <div className="space-y-8 md:space-y-10">
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
        </div>
      </nav>
    </div>
  );
}
