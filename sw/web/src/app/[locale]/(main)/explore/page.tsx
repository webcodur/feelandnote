import { getLocale, getTranslations } from "next-intl/server";
import { getFeaturedFactions } from "@/actions/home/getFeaturedFactions";
import { getMythIndex } from "@/actions/home/getMythIndex";
import { getMythClientData } from "@/actions/home/mythPublicData";
import { exploreModeHref, parseExploreMode, type ExploreSearchParams } from "@/constants/exploreModes";
import { buildFactionSections, localizedFactionName } from "@/lib/faction-sections";
import { getLocalizedAlternates } from "@/lib/seo";
import type { Locale } from "@/types/locale";
import Lane from "@/components/ui/pending/Lane";
import ExploreModeNav from "@/components/features/user/explore/hub/ExploreModeNav";
import ExploreFigures from "@/components/features/user/explore/hub/ExploreFigures";
import ExploreCatalogSection from "@/components/features/user/explore/atlas/ExploreCatalogSection";
import AtlasRoutePending from "@/components/features/user/explore/atlas/AtlasRoutePending";

export const maxDuration = 30;
type Props = { searchParams: Promise<ExploreSearchParams> };
const META_NAMES = 4;
const META_NAMESPACES = { figures: "explore.meta", faction: "explore.faction", myth: "explore.hub.myth" } as const;

export async function generateMetadata({ searchParams }: Props) {
  const mode = parseExploreMode((await searchParams).mode);
  const [t, locale] = await Promise.all([getTranslations(META_NAMESPACES[mode]), getLocale() as Promise<Locale>]);
  let description: string | undefined;
  if (mode === "figures") description = t("description");
  if (mode === "faction") {
    const sections = buildFactionSections(await getFeaturedFactions());
    const names = sections.slice(0, META_NAMES).map(section => localizedFactionName(section.faction, locale));
    description = sections.length ? t("metaDescription", {
      sections: locale === "en" ? new Intl.ListFormat("en", { type: "conjunction" }).format(names) : names.join(", "),
    }) : undefined;
  }
  if (mode === "myth") {
    description = t("description");
    try {
      const data = getMythClientData(await getMythIndex(locale));
      const regions = data.regions.filter(region => region.id !== "other");
      if (regions.length && data.myths.some(myth => myth.isPublished)) {
        description = t("metaDescription", { regions: regions.slice(0, META_NAMES).map(region => region.name).join(", ") });
      }
    } catch (error) {
      console.error("[explore] 신화 검색 설명 조회 실패:", error);
    }
  }
  return {
    title: t(mode === "figures" ? "title" : "hubMetaTitle"),
    description,
    alternates: await getLocalizedAlternates(exploreModeHref(mode)),
  };
}

export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;
  const mode = parseExploreMode(params.mode);
  return (
    <div data-explore-page={mode}>
      <ExploreModeNav mode={mode} />
      {mode === "figures" && <ExploreFigures params={params} />}
      {mode !== "figures" && (
        <Lane key={mode} fallback={<AtlasRoutePending mode={mode} />}>
          <ExploreCatalogSection mode={mode} params={params} />
        </Lane>
      )}
    </div>
  );
}
