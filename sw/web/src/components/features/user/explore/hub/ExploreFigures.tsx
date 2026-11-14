import hubStyles from "@/components/shared/HubSection.module.css";
import { getTranslations } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { NAV_ITEMS } from "@/constants/navigation";
import { EXPLORE_HUB_GROUP, EXPLORE_LENS_IMAGES, FIGURE_LENS_GROUPS, FIGURE_AUXILIARY_LINKS } from "@/constants/exploreLenses";
import type { ExploreSearchParams } from "@/constants/exploreModes";
import { resolveTrendCountry, TREND_COUNTRY_COOKIE } from "@/constants/trendCountries";
import { Link } from "@/i18n/navigation";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { EXPLORE_LENS_GROUP_HEADING_CLASS } from "@/components/shared/ExploreCard.styles";
import HubSection from "@/components/shared/HubSection";
import { hubAtlasNavItems, hubSectionId } from "@/components/shared/hubSectionUtils";
import AtlasNavSections from "@/components/shared/atlasNav/AtlasNavSections";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { FiguresFilterResult } from "@/app/[locale]/(main)/explore/figures/sections";
import { parseFilterParams } from "@/app/[locale]/(main)/explore/figures/filterParams";

export default async function ExploreFigures({ params }: { params: ExploreSearchParams }) {
  const filters = parseFilterParams(params);
  const [requestCookies, requestHeaders, t, nav, pending] = await Promise.all([
    cookies(), headers(), getTranslations("explore.hub"), getTranslations("nav.sub"), getTranslations("pending"),
  ]);
  filters.trendCountry = resolveTrendCountry(filters.trendCountry, requestCookies.get(TREND_COUNTRY_COOKIE)?.value, requestHeaders.get("CF-IPCountry"));
  const hrefByKey = new Map(NAV_ITEMS.find(item => item.key === "explore")!.subLinks!.map(page => [page.key!, page.href]));
  const hubGroup = EXPLORE_HUB_GROUP.figures;
  const titles = [t("navCelebs"), t("quickNav")];

  return (
    <div className={hubStyles.page} data-explore-results="figures">
      <AsyncIntlProvider><AtlasNavSections items={hubAtlasNavItems(titles, hubGroup)} /></AsyncIntlProvider>
      <HubSection title={titles[0]} id={hubSectionId(0, hubGroup)} index={0} total={titles.length} hideDivider>
        <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
          <FiguresFilterResult params={filters} />
        </Lane>
      </HubSection>
      <HubSection title={titles[1]} id={hubSectionId(1, hubGroup)} index={1} total={titles.length}>
        <nav aria-label={titles[1]} className="space-y-8 md:space-y-10">
          {FIGURE_LENS_GROUPS.map(group => (
            <section key={group.key} aria-labelledby={`explore-lens-${group.key}`}>
              <h3 id={`explore-lens-${group.key}`} className={EXPLORE_LENS_GROUP_HEADING_CLASS}>{t(`lensGroups.${group.key}`)}</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {group.items.map(key => {
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
            {FIGURE_AUXILIARY_LINKS.map(key => {
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
  );
}
