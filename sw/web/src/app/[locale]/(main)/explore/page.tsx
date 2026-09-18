import { ArrowUpRight, History, Search, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { EXPLORE_FEATURED_LINKS, NAV_ITEMS } from "@/constants/navigation";
import { getTrendCountryOptions, parseTrendCountry } from "@/constants/trendCountries";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { FiguresFilterResult } from "./figures/sections";
import { parseFilterParams } from "./figures/filterParams";
import Image from "next/image";

export const maxDuration = 30;

const secondaryIcons: Record<string, LucideIcon> = { timeline: History, directory: Search };

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
  const secondaryPages = pages.filter((page) => !EXPLORE_FEATURED_LINKS.some((featured) => featured.key === page.key));

  return (
    <div className="space-y-8 md:space-y-10">
      <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
        <FiguresFilterResult params={filters} trendCountryOptions={trendCountryOptions} />
      </Lane>
      <nav aria-label={t("quickNav")} className="border-t border-white/10 pt-6 md:pt-8">
        <h2 className="mb-4 text-center font-serif text-base font-bold tracking-tight text-text-primary md:mb-5 md:text-lg">{t("quickNav")}</h2>
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:gap-4">
          {EXPLORE_FEATURED_LINKS.map((page) => (
              <Link
                key={page.key}
                href={page.href}
                prefetch={false}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-accent/15 bg-[#101112] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.9)] hover:border-accent/60 hover:bg-[#171714] active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {/* 그림 띠 — 생성 이미지(1536×512, 3:1)를 가운데 기준으로 잘라 채운다. 즉각 축은 테두리·제목, 그림 확대는 곁들이는 연출.
                    SVG 판(ExploreCardArtwork)은 비교용으로 남겨 두었다 */}
                <div className="relative aspect-[4/3] overflow-hidden border-b border-white/[0.06] bg-black/25 sm:aspect-[3/1]">
                  <Image
                    src={`/images/explore/quicknav/${page.key}.webp`}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 680px"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-[#101112] to-transparent" aria-hidden />
                </div>
                <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-white/[0.07]" />
                <div className="flex flex-1 flex-col p-3 md:px-6 md:pb-6 md:pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-snug text-text-primary group-hover:text-accent md:text-xl">{nav(page.key!)}</h3>
                    <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-accent/50 group-hover:text-accent" aria-hidden />
                  </div>
                  <p className="mt-2 max-w-md break-keep text-xs leading-relaxed text-text-secondary md:text-sm">
                    {t(`pageDescriptions.${page.key}`)}
                  </p>
                </div>
              </Link>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-4 md:gap-4">
          {secondaryPages.map((page) => {
            const Icon = secondaryIcons[page.key!] ?? Search;
            return (
              <Link
                key={page.key}
                href={page.href}
                prefetch={false}
                className="group flex items-start gap-3 rounded-xl border border-accent/10 px-3 py-3.5 hover:border-accent/50 hover:bg-white/5 active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:px-5 md:py-5"
              >
                <Icon size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-secondary group-hover:text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">{nav(page.key!)}</h3>
                  <p className="mt-1.5 break-keep text-xs leading-relaxed text-text-secondary">{t(`pageDescriptions.${page.key}`)}</p>
                </div>
                <ArrowUpRight size={14} className="mt-0.5 shrink-0 text-text-tertiary group-hover:text-accent" aria-hidden />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
