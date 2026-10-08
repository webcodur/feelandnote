import type { MythData } from "@/actions/home/mythTypes";
import { MYTH_OTHER_GROUP_ID } from "@/actions/home/mythTypes";
import { toCoverImage, toSceneImages } from "@feelandnote/shared/lib/faction-team-image";
import type { AtlasTheme } from "@/components/features/user/explore/myth/atlasNavigationData";
import { mythGroupName } from "@/components/features/user/explore/myth/mythGroupName";
import { mythHref } from "@/components/features/user/explore/myth/mythHref";
import { buildFactionClusters, factionSectionKey, localizedFactionName, type FactionSection } from "./faction-sections";
import type { Locale } from "@/types/locale";

// 본문과 선택 창이 같은 항목·그룹·주소를 사용한다.
export function buildMythNavigation(data: MythData, labels: { other: string; unnamed: string }): AtlasTheme[] {
  return data.regions.map((region) => ({
    id: region.id, name: region.name,
    entries: data.myths.filter((myth) => region.mythIds.includes(myth.id)).map((myth) => ({
      id: myth.id, name: myth.name, count: myth.personIds.length, disabled: !myth.isPublished,
      href: mythHref(myth.slug), imageUrl: myth.images.find((image) => image.kind !== "scene")?.url,
      scenes: myth.images.filter((image) => image.kind === "scene").length,
      groups: myth.groups.map((group) => ({ id: group.id, name: mythGroupName(group, labels), count: group.personIds.length })),
    })),
  }));
}

export function buildFactionNavigation(sections: FactionSection[], locale: Locale, otherLabel: string): AtlasTheme[] {
  return sections.map((section) => ({
    id: factionSectionKey(section), name: localizedFactionName(section.faction, locale),
    entries: section.entries.map((entry) => {
      const groups = buildFactionClusters(entry.celebs, locale);
      return {
        id: entry.id, name: localizedFactionName(entry, locale), count: entry.celebs.length,
        href: `/explore/faction/${entry.slug}`, imageUrl: toCoverImage(entry.team_images)?.url,
        scenes: toSceneImages(entry.team_images, locale).length,
        groups: groups.length > 1 ? groups.map((group) => ({
          id: group.name ?? MYTH_OTHER_GROUP_ID, name: group.label ?? otherLabel, count: group.celebIds.length,
        })) : [],
      };
    }),
  }));
}
