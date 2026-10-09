import type { FeaturedFaction } from "@/actions/home/getFeaturedFactions";
import { toCoverImage, toSceneImages } from "@feelandnote/shared/lib/faction-team-image";
import type { FactionFigureBook } from "@/actions/home/getFactionFigureBooks";
import { MYTH_OTHER_GROUP_ID, type MythData } from "@/actions/home/mythTypes";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";
import { buildFactionClusters, localizedFactionDescription, localizedFactionHeadline, localizedFactionName } from "./faction-sections";

export function getFactionThemeImage(teamImages: unknown): string | undefined {
  return toCoverImage(teamImages)?.url;
}

/* 「이 세력·신화의 책」주제책 명단은 faction_lv2.theme_book_ids가 쥔다 — 서버 원장이다.
   예전 코드 상수(FACTION_OWN_WORK_IDS·MYTH_OWN_WORK_IDS)는 그 컬럼으로 이관됐다. */

export interface FactionThemeGroup {
  name: string;
  description: string | null;
  description_en: string | null;
}

/** 현재 테마 한 개만 공용 탐색판에 전달한다. 다른 테마는 기존의 정식 주소로 이동한다. */
export function toFactionThemeData(entry: FeaturedFaction, celebs: CelebProfile[], groupRows: FactionThemeGroup[], books: FactionFigureBook[], locale: Locale): MythData {
  const isEn = locale === "en";
  const byId = new Map(celebs.map((person) => [person.id, person]));
  const members = entry.celebs.filter((member) => byId.has(member.id));
  const personIds = members.map((member) => member.id);
  const descriptions = new Map(groupRows.map((group) => [group.name, (isEn ? group.description_en : group.description)?.trim() || null]));
  const clusters = buildFactionClusters(members, locale);
  const slug = entry.slug ?? entry.id;
  const image = getFactionThemeImage(entry.team_images);
  const theme = {
    id: entry.id, slug, name: localizedFactionName(entry, locale),
    headline: localizedFactionHeadline(entry, locale),
    description: localizedFactionDescription(entry, locale),
    isPublished: true, regionId: "faction", music: entry.music,
    scenesComplete: entry.scenes_complete === true,
    images: [...(image ? [{ url: image, label: null }] : []), ...toSceneImages(entry.team_images, locale)],
    personIds, leadPersonIds: [],
    groups: clusters.length > 1 ? clusters.map((cluster) => ({
      id: cluster.name ?? MYTH_OTHER_GROUP_ID, name: cluster.label,
      description: cluster.name ? descriptions.get(cluster.name) ?? null : null,
      personIds: cluster.celebIds,
    })) : [],
  };
  return {
    regions: [{ id: "faction", slug: "faction", name: theme.name, mythIds: [entry.id] }],
    myths: [theme],
    people: members.map((member) => {
      const person = byId.get(member.id)!;
      const summary = null;
      return {
        id: person.id, slug: person.slug ?? person.id,
        name: isEn ? person.nickname_en || person.nickname : person.nickname,
        reality: person.celeb_reality,
        title: isEn ? person.title_en || person.title : person.title,
        headline: null, bio: isEn ? person.bio_en : person.bio, reading: null, summary,
        voiceV: person.voice_v ?? 0,
        appearances: [{ mythId: entry.id, summary, imageUrl: member.faction_image_url }],
        avatarUrl: person.avatar_url, imageUrl: null, portraitUrl: member.portrait_url ?? null, images: [],
        mythIds: [entry.id], sourceIds: books.filter((book) => book.memberIds.includes(person.id)).map((book) => book.contentId),
      };
    }),
    works: books.map((book) => ({
      id: book.contentId, editionId: book.editionId,
      title: book.title, titleBadge: book.titleBadge ?? null,
      creator: book.creator ?? null, thumbnailUrl: book.thumbnail ?? null,
      category: "book", coupangUrl: isEn ? null : book.url || null,
      personIds: book.memberIds, appearedIds: book.appearedIds, authorIds: book.authoredIds,
    })),
  };
}
