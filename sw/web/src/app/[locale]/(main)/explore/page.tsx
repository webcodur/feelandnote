import { ArrowUpRight, Trophy, Orbit, Landmark, Network, History, Play, Search, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/constants/navigation";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { FiguresFilterResult } from "./figures/sections";
import { parseFilterParams } from "./figures/filterParams";

export const maxDuration = 30;

const featuredIcons: Record<string, LucideIcon> = {
  ranking: Trophy,
  spectrum: Orbit,
  myth: Landmark,
  faction: Network,
};
const secondaryIcons: Record<string, LucideIcon> = { timeline: History, youtube: Play, directory: Search };

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
  const t = await getTranslations("explore.hub");
  const nav = await getTranslations("nav.sub");
  const pending = await getTranslations("pending");
  const pages = NAV_ITEMS.find((item) => item.key === "explore")!.subLinks!;
  const featuredPages = pages.filter((page) => page.key && featuredIcons[page.key]);
  const secondaryPages = pages.filter((page) => page.key && !featuredIcons[page.key]);

  return (
    <div className="space-y-10 md:space-y-14">
      <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
        <FiguresFilterResult params={filters} />
      </Lane>
      <nav aria-label={t("quickNav")} className="border-t border-white/10 pt-6 md:pt-8">
        <h2 className="mb-4 text-sm font-semibold text-text-secondary md:mb-5">{t("quickNav")}</h2>
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:gap-4">
          {featuredPages.map((page) => {
            const Icon = featuredIcons[page.key!];
            return (
              <Link
                key={page.key}
                href={page.href}
                prefetch={false}
                className="group relative flex min-h-44 flex-col overflow-hidden rounded-xl border border-accent/20 bg-bg-secondary p-4 hover:border-accent/60 hover:bg-accent/10 active:bg-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-48 md:p-6"
              >
                <div className="mb-5 flex items-center justify-between md:mb-6">
                  <Icon size={24} strokeWidth={1.5} className="text-accent md:size-7" aria-hidden />
                  <ArrowUpRight size={18} className="text-accent/50 group-hover:text-accent" aria-hidden />
                </div>
                <h3 className="text-base font-semibold leading-snug text-text-primary md:text-xl">{nav(page.key!)}</h3>
                <p className="mt-2 max-w-md break-keep text-xs leading-relaxed text-text-secondary md:text-sm">
                  {t(`pageDescriptions.${page.key}`)}
                </p>
              </Link>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mt-4 md:gap-4">
          {secondaryPages.map((page) => {
            const Icon = secondaryIcons[page.key!] ?? Search;
            return (
              <Link
                key={page.key}
                href={page.href}
                prefetch={false}
                className="group flex items-start gap-3 rounded-xl border border-white/10 px-4 py-4 hover:border-accent/40 hover:bg-white/5 active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:px-5 md:py-5"
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
