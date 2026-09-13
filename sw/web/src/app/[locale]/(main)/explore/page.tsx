import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/constants/navigation";
import { getLocalizedAlternates } from "@/lib/seo";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
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
  const t = await getTranslations("explore.hub");
  const nav = await getTranslations("nav.sub");
  const pending = await getTranslations("pending");
  const pages = NAV_ITEMS.find((item) => item.key === "explore")!.subLinks!;

  return (
    <div className="space-y-10 md:space-y-14">
      <Lane fallback={<PendingBlock variant="grid" count={24} label={pending("loading")} />}>
        <FiguresFilterResult params={filters} />
      </Lane>
      <nav aria-label={t("quickNav")} className="border-t border-white/10 pt-6">
        <h2 className="mb-4 text-sm font-semibold text-text-secondary">{t("quickNav")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {pages.map((page) => (
            <Link
              key={page.key}
              href={page.href}
              prefetch={false}
              className="flex min-h-16 items-center justify-between gap-2 rounded-lg border border-white/10 bg-bg-secondary px-4 py-3 text-sm text-text-primary hover:border-accent/50 hover:bg-accent/10 active:bg-accent/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>{nav(page.key!)}</span>
              <ArrowUpRight size={16} className="shrink-0 text-accent" aria-hidden />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
