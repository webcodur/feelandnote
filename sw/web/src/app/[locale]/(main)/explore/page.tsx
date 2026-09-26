import { ArrowUpRight, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { EXPLORE_FEATURED_LINKS, NAV_ITEMS } from "@/constants/navigation";
import { getTrendCountryOptions, parseTrendCountry } from "@/constants/trendCountries";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { FiguresFilterResult } from "./figures/sections";
import { parseFilterParams } from "./figures/filterParams";

export const maxDuration = 30;

const secondaryIcons: Record<string, string> = {
  timeline: "/images/explore/quicknav/timeline-flag.svg",
  directory: "/images/explore/quicknav/directory-scroll.svg",
};

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
  const pages = NAV_ITEMS.find((item) => item.key === "explore")!.subLinks!;
  const monologuePage = pages.find((page) => page.key === "monologue");
  const secondaryPages = pages.filter((page) => page.key !== "monologue" && !EXPLORE_FEATURED_LINKS.some((featured) => featured.key === page.key));

  return (
    <div className="space-y-8 md:space-y-10">
      <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
        <FiguresFilterResult params={filters} trendCountryOptions={trendCountryOptions} />
      </Lane>
      <nav aria-label={t("quickNav")} className="border-t border-white/10 pt-6 md:pt-8">
        <h2 className="mb-4 text-center font-serif text-base font-bold tracking-tight text-text-primary md:mb-5 md:text-lg">{t("quickNav")}</h2>
        {monologuePage && (
          <div className="mb-3 md:mb-4">
            <ExploreFeatureCard href={monologuePage.href} title={nav(monologuePage.key!)} description={t("pageDescriptions.monologue")} imageSrc="/images/explore/quicknav/monologue-right-square.webp" wide />
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          {EXPLORE_FEATURED_LINKS.map(page => (
            <ExploreFeatureCard key={page.key} href={page.href} title={nav(page.key!)} description={t(`pageDescriptions.${page.key}`)} imageSrc={`/images/explore/quicknav/${page.key}${page.key === "spectrum" ? "" : "-square"}.webp`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-4 md:gap-4">
          {secondaryPages.map((page) => {
            const iconSrc = secondaryIcons[page.key!];
            return (
              <Link
                key={page.key}
                href={page.href}
                prefetch={false}
                className="group relative grid min-h-24 grid-cols-[minmax(0,1fr)_88px] items-center overflow-hidden rounded-xl border border-accent/15 bg-[#0a0a0a] hover:border-accent/60 active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-28"
              >
                <div className="relative order-2 flex h-full items-center justify-center bg-bg-secondary">
                  <span className="flex size-14 items-center justify-center rounded-full border border-accent/25 bg-accent/5 shadow-[inset_0_0_24px_rgba(212,175,55,0.06)]">
                    {iconSrc ? (
                      <Image src={iconSrc} alt="" width={32} height={32} aria-hidden className="size-8 transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:transform-none" />
                    ) : (
                      <Search size={24} strokeWidth={1.5} className="text-accent" aria-hidden />
                    )}
                  </span>
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-white/[0.07]" />
                <div className="relative z-10 flex min-w-0 flex-col justify-center px-4 py-3 md:px-5 md:py-4 lg:items-center lg:self-stretch lg:text-center">
                  <h3 className="text-base font-semibold leading-snug text-text-primary group-hover:text-accent md:text-lg">
                    <span className="relative inline-block">
                      {nav(page.key!)}
                      <ArrowUpRight size={16} className="absolute left-full top-1/2 ml-1.5 -translate-y-1/2 text-accent group-hover:text-accent-hover" aria-hidden />
                    </span>
                  </h3>
                  <p className="mt-2 max-w-md break-keep text-sm leading-relaxed text-text-secondary lg:mx-auto">{t(`pageDescriptions.${page.key}`)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
