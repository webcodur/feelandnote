import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { getFeaturedFactions } from "@/actions/home/getFeaturedFactions";
import { getMythIndex } from "@/actions/home/getMythIndex";
import { factionCatalogGroups, mythCatalogGroups } from "@/lib/atlas-catalog";
import { buildFactionSections, FACTION_LAST_COOKIE } from "@/lib/faction-sections";
import { getVisitorCountry } from "@/lib/visitorCountryServer";
import { orderMythRegions } from "@/lib/visitorCountry";
import { exploreModeHref, type ExploreSearchParams } from "@/constants/exploreModes";
import { redirect } from "@/i18n/navigation";
import { RetryBlock } from "@/components/ui/pending";
import type { Locale } from "@/types/locale";
import { MYTH_LAST_COOKIE } from "../myth/mythHref";
import type { AtlasWorld } from "../myth/atlasNavigationData";
import AtlasCatalog from "./AtlasCatalog";

async function loadGroups(mode: AtlasWorld, locale: Locale, params: ExploreSearchParams) {
  if (mode === "myth") {
    const [data, country] = await Promise.all([getMythIndex(locale), getVisitorCountry()]);
    return mythCatalogGroups({ ...data, regions: orderMythRegions(data.regions, country) });
  }
  const factions = await getFeaturedFactions();
  const legacyId = typeof params.faction === "string" ? params.faction : params.tag;
  const legacy = typeof legacyId === "string" ? factions.find(faction => faction.id === legacyId) : undefined;
  if (legacy?.slug) {
    redirect({ href: legacy.isGroup ? exploreModeHref("faction", { section: legacy.slug }) : `/explore/faction/${legacy.slug}`, locale });
  }
  return factionCatalogGroups(buildFactionSections(factions), locale);
}

export default async function ExploreCatalogSection({ mode, params }: { mode: AtlasWorld; params: ExploreSearchParams }) {
  const locale = await getLocale() as Locale;
  const [result, cookieStore] = await Promise.all([
    Promise.allSettled([loadGroups(mode, locale, params)]), cookies(),
  ]);
  const groups = result[0];
  if (groups.status === "rejected") {
    // 리다이렉트는 Next.js가 응답하도록 넘긴다.
    unstable_rethrow(groups.reason);
    console.error(`[ExploreCatalogSection] ${mode} 조회 실패:`, groups.reason);
    return <RetryBlock />;
  }
  const savedSlug = cookieStore.get(mode === "myth" ? MYTH_LAST_COOKIE : FACTION_LAST_COOKIE)?.value;
  const recent = savedSlug ? groups.value.flatMap(group => group.entries).find(entry => entry.href.endsWith(`/${savedSlug}`)) : undefined;
  const section = typeof params.section === "string" ? params.section : "";
  const query = typeof params.q === "string" ? params.q : "";
  return <AtlasCatalog key={`${mode}:${section}:${query}`} mode={mode} groups={groups.value} recent={recent} />;
}
