import type { MythData } from "@/actions/home/mythTypes";
import { toCoverImage, toSceneImages } from "@feelandnote/shared/lib/faction-team-image";
import { hasCompletedFactionScenes } from "./faction-scene-completion";
import { factionSectionKey, localizedFactionHeadline, localizedFactionName, type FactionSection } from "./faction-sections";
import { mythHref } from "@/components/features/user/explore/myth/mythHref";
import type { Locale } from "@/types/locale";

export interface AtlasCatalogEntry {
  id: string;
  name: string;
  headline: string | null;
  href: string;
  cover: string | null;
  members: number;
  scenesComplete: boolean;
}
export interface AtlasCatalogGroup { id: string; name: string; entries: AtlasCatalogEntry[] }

/** 목록도 상세·선택기와 같은 공개 범위와 장면 완성 판정을 쓴다. */
export function mythCatalogGroups(data: MythData): AtlasCatalogGroup[] {
  const byId = new Map(data.myths.filter(entry => entry.isPublished && entry.slug).map(entry => [entry.id, entry]));
  return data.regions.map(region => ({
    id: region.slug || region.id, name: region.name,
    entries: region.mythIds.flatMap(id => {
      const entry = byId.get(id);
      return entry ? [{
        id: entry.id, name: entry.name, headline: entry.headline, href: mythHref(entry.slug),
        cover: entry.images.find(image => image.kind !== "scene")?.url ?? null,
        members: entry.personIds.length,
        scenesComplete: hasCompletedFactionScenes(entry.scenesComplete, entry.images.filter(image => image.kind === "scene").length),
      }] : [];
    }),
  })).filter(group => group.entries.length > 0);
}

export function factionCatalogGroups(sections: FactionSection[], locale: Locale): AtlasCatalogGroup[] {
  return sections.map(section => ({
    id: factionSectionKey(section), name: localizedFactionName(section.faction, locale),
    entries: section.entries.map(entry => ({
      id: entry.id, name: localizedFactionName(entry, locale), headline: localizedFactionHeadline(entry, locale),
      href: `/explore/faction/${entry.slug}`, cover: toCoverImage(entry.team_images)?.url ?? entry.team_images.find(image => image.kind !== "scene")?.url ?? null,
      members: entry.celebs.length,
      scenesComplete: hasCompletedFactionScenes(entry.scenes_complete, toSceneImages(entry.team_images, locale).length),
    })),
  }));
}

export function filterAtlasCatalog(groups: AtlasCatalogGroup[], theme: string | null, query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return groups.filter(group => !theme || group.id === theme).map(group => ({
    ...group, entries: group.entries.filter(entry => {
      const search = `${group.name} ${entry.name} ${entry.headline ?? ""}`.toLocaleLowerCase();
      return words.every(word => search.includes(word));
    }),
  })).filter(group => group.entries.length > 0);
}
