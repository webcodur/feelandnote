import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { WORKS_FEATURED_LINKS } from "@/constants/navigation";
import ExploreHubIntro from "@/components/shared/ExploreHubIntro";
import ExploreFeatureCard from "@/components/shared/ExploreFeatureCard";
import { PendingBlock } from "@/components/ui/pending";
import Lane from "@/components/ui/pending/Lane";
import { CuratedSection } from "./sections";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("library.meta");
  const title = t("title");
  const description = t("description");
  return {
    title,
    description,
    alternates: await getLocalizedAlternates("/explore/works"),
    openGraph: { title, description },
  };
}

const featureImages: Record<string, string> = {
  bestseller: "/images/explore/quicknav/bestsellers-v2-square.webp",
  classics: "/images/explore/quicknav/classics-v2-square.webp",
  museum: "/images/explore/quicknav/museum-v2-square.webp",
  academy: "/images/explore/quicknav/academy-v2-square.webp",
};

export default async function WorksPage() {
  const t = await getTranslations("library.hub");
  const pending = await getTranslations("pending");

  return (
    <div className="space-y-8 md:space-y-10">
      <section aria-labelledby="explore-works-heading">
        <ExploreHubIntro id="explore-works-heading" title={t("headline")} description={t("description")} />
        <Lane fallback={<PendingBlock variant="grid" count={6} label={pending("loading")} />}>
          <CuratedSection />
        </Lane>
      </section>
      <nav aria-label={t("quickNav")} className="border-t border-white/10 pt-6 md:pt-8">
        <h2 className="mb-4 text-center font-serif text-base font-bold tracking-tight text-text-primary md:mb-5 md:text-lg">{t("quickNav")}</h2>
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
          {WORKS_FEATURED_LINKS.map(page => (
            <ExploreFeatureCard key={page.key} href={page.href} title={t(`${page.key}Label`)} description={t(page.key!)} imageSrc={featureImages[page.key!]} badge={page.key === "museum" || page.key === "academy" ? t("reorganizing") : undefined} />
          ))}
        </div>
      </nav>
    </div>
  );
}
