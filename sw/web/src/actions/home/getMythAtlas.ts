"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";
import { getFigureBookAssignmentsByCelebs } from "@/actions/figure-books/figureBookAssignments";
import {
  mapFigureBookPurchaseOptions,
  type FigureBookPurchaseOptionRow,
} from "@/actions/figure-books/figureBookLocale";
import type { ContentType } from "@/types/database";
import { toFactionQuoteMedia } from "@feelandnote/shared/lib/faction-quote-media";
import type { MythAtlasData, MythPerson, MythRegion, MythWork } from "./mythAtlasTypes";

interface TagRow {
  id: string; parent_id: string | null; slug: string | null; name: string; name_en: string | null;
  description: string | null; description_en: string | null;
  /* 공개 여부는 DB가 쥔다. 전에는 코드에 이름 목록을 적어 두어 전승 하나를 잠그는 데도 배포가 필요했다 */
  atlas_published: boolean | null;
}
interface MemberRow {
  tag_id: string; celeb_id: string; short_desc: string | null; short_desc_en: string | null; sort_order: number | null;
  quote: string | null; quote_en: string | null; faction_quote_media: unknown;
}
interface PersonRow {
  id: string; slug: string | null; nickname: string; nickname_en: string | null;
  title: string | null; title_en: string | null; headline: string | null; headline_en: string | null;
  bio: string | null; bio_en: string | null; avatar_url: string | null; portrait_url: string | null;
}
interface ExplanationRow {
  profile_id: string; plain_text: string; plain_text_en: string | null;
}
interface ContentRow {
  id: string; type: ContentType; content_locales: ContentLocaleRow[] | null;
}
const CATEGORY: Record<ContentType, MythWork["category"]> = {
  BOOK: "book", VIDEO: "video", GAME: "game", MUSIC: "music",
};

const unique = <T,>(items: T[]) => [...new Set(items)];

// 전승 slug가 지역의 앞머리를 따르면(myth-china-fengshen → 중국) 자리가 저절로 잡힌다.
// 어디에도 걸리지 않는 전승은 「기타 전승」으로 간다. 전승이 하나도 없는 지역은 아래에서 걸러져
// 화면에 뜨지 않으므로, 아직 인물이 없는 문화권을 미리 적어 두어도 빈 칸이 생기지 않는다.
// 순서가 곧 화면에 서는 차례다 — 동아시아에서 서쪽으로, 마지막이 신대륙과 오세아니아다.
const MYTH_REGIONS = [
  { id: "korea", ko: "한국", en: "Korea", prefixes: ["myth-korea"] },
  { id: "japan", ko: "일본", en: "Japan", prefixes: ["myth-japan"] },
  { id: "china", ko: "중국", en: "China", prefixes: ["myth-china"] },
  { id: "steppe", ko: "초원", en: "Eurasian Steppe", prefixes: ["myth-steppe", "myth-turkic", "myth-mongol", "myth-tibet", "myth-manchu"] },
  { id: "southeast-asia", ko: "동남아", en: "Southeast Asia", prefixes: ["myth-southeast-asia", "myth-vietnam", "myth-malay"] },
  { id: "india", ko: "인도", en: "India", prefixes: ["myth-hindu"] },
  { id: "persia", ko: "페르시아", en: "Persia", prefixes: ["myth-persia", "myth-shahnameh"] },
  { id: "mesopotamia", ko: "메소포타미아", en: "Mesopotamia", prefixes: ["myth-mesopotamia"] },
  { id: "egypt", ko: "이집트", en: "Egypt", prefixes: ["myth-egypt"] },
  { id: "africa", ko: "아프리카", en: "Africa", prefixes: ["myth-africa", "myth-mali", "myth-yoruba", "myth-ethiopia"] },
  { id: "greek-roman", ko: "그리스·로마", en: "Greece & Rome", prefixes: ["myth-greek", "myth-roman", "myth-argonaut", "myth-atreus", "myth-heracles", "myth-iliad", "myth-odyssey", "myth-aeneid"] },
  { id: "celtic", ko: "켈트", en: "Celtic Lands", prefixes: ["myth-celtic", "myth-irish"] },
  { id: "britain", ko: "브리튼", en: "Britain", prefixes: ["myth-arthur"] },
  { id: "northern-europe", ko: "북유럽", en: "Northern Europe", prefixes: ["myth-norse", "myth-germanic"] },
  { id: "slavic", ko: "슬라브", en: "Slavic Lands", prefixes: ["myth-slavic", "myth-rus"] },
  { id: "americas", ko: "아메리카", en: "The Americas", prefixes: ["myth-americas", "myth-inca", "myth-aztec", "myth-maya"] },
  { id: "oceania", ko: "오세아니아", en: "Oceania", prefixes: ["myth-oceania", "myth-polynesia"] },
] as const;

const NAME_REGION_IDS: Array<{ id: (typeof MYTH_REGIONS)[number]["id"]; names: string[] }> = [
  { id: "greek-roman", names: ["아르고 원정대", "아트레우스 가문", "아이네이스", "헤라클레스의 열두 과제", "일리아스", "오디세이아", "그리스 신화"] },
  { id: "britain", names: ["아서왕과 원탁의 기사들"] },
];

const TITLE_ART_BY_SLUG: Record<string, string> = {
  "myth-china-fengshen": "myth-china-fengshen.png",
  "myth-china-xiyou": "myth-china-xiyou.png",
  "myth-egypt": "myth-egypt.png",
  "myth-hindu-mahabharata": "myth-hindu-mahabharata.png",
  "myth-hindu-ramayana": "myth-hindu-ramayana.png",
  "myth-japan": "myth-japan.png",
  "myth-korea": "myth-korea.png",
  "myth-mesopotamia": "myth-mesopotamia.png",
  "myth-norse": "myth-norse.png",
};

const TITLE_ART_BY_NAME: Record<string, string> = {
  "아르고 원정대": "argonauts.png",
  "아트레우스 가문": "house-of-atreus.png",
  "아서왕과 원탁의 기사들": "arthur-round-table.png",
  "그리스 신화": "myth-greek-roman.png",
  "일리아스": "homer-iliad.png",
  "오디세이아": "homer-odyssey.png",
  "아이네이스": "virgil-aeneid.png",
  "헤라클레스의 열두 과제": "heracles.png",
};

function titleArtForTradition(slug: string, name: string) {
  const fileName = TITLE_ART_BY_SLUG[slug] ?? TITLE_ART_BY_NAME[name];
  return fileName ? `/images/myth-atlas/title-art/${fileName}` : null;
}

function regionForTradition(slug: string, name: string, isEn: boolean) {
  const namedRegionId = NAME_REGION_IDS.find((candidate) => candidate.names.includes(name))?.id;
  const region = MYTH_REGIONS.find((candidate) => candidate.id === namedRegionId || candidate.prefixes.some((prefix) => slug === prefix || slug.startsWith(`${prefix}-`)));
  if (region) return { id: region.id, name: isEn ? region.en : region.ko };
  return { id: "other", name: isEn ? "Other traditions" : "기타 전승" };
}

async function fetchMythAtlas(locale: string): Promise<MythAtlasData> {
  const db = createStaticClient();
  const isEn = locale === "en";
  const { data: parent, error: parentError } = await db
    .from("celeb_tags").select("id").eq("slug", "myth-and-fiction").maybeSingle();
  if (parentError) throw new Error(`신화 묶음 조회 실패: ${parentError.message}`);
  if (!parent) return { regions: [], traditions: [], people: [], works: [], openingPersonId: null };

  const { data: rootTagData, error: tagError } = await db
    .from("celeb_tags")
    .select("id,parent_id,slug,name,name_en,description,description_en,atlas_published")
    .eq("parent_id", parent.id).order("sort_order");
  if (tagError) throw new Error(`신화 목록 조회 실패: ${tagError.message}`);
  const rootTags = (rootTagData ?? []) as TagRow[];
  const { data: nestedTagData, error: nestedTagError } = rootTags.length > 0
    ? await db.from("celeb_tags")
      .select("id,parent_id,slug,name,name_en,description,description_en,atlas_published")
      .in("parent_id", rootTags.map((tag) => tag.id)).order("sort_order")
    : { data: [], error: null };
  if (nestedTagError) throw new Error(`Failed to load nested mythology tags: ${nestedTagError.message}`);
  const nestedTags = (nestedTagData ?? []) as TagRow[];
  const tagRows = [...rootTags, ...nestedTags];
  const tagIds = tagRows.map((tag) => tag.id);
  if (tagIds.length === 0) return { regions: [], traditions: [], people: [], works: [], openingPersonId: null };

  const { data: memberData, error: memberError } = await db
    .from("faction_atlas_members")
    .select("tag_id,celeb_id,short_desc,short_desc_en,sort_order,quote,quote_en,faction_quote_media")
    .in("tag_id", tagIds).eq("hidden", false).order("sort_order");
  if (memberError) throw new Error(`신화 인물 조회 실패: ${memberError.message}`);
  const members = (memberData ?? []) as MemberRow[];
  const personIds = unique(members.map((member) => member.celeb_id));
  if (personIds.length === 0) return { regions: [], traditions: [], people: [], works: [], openingPersonId: null };

  const [profiles, allAssignments, explanationRows] = await Promise.all([
    selectInChunks<PersonRow>(personIds, (ids) => db.from("celebs")
      .select("id,slug,nickname,nickname_en,title,title_en,headline,headline_en,bio,bio_en,avatar_url,portrait_url")
      .in("id", ids).overrideTypes<PersonRow[], { merge: false }>()),
    getFigureBookAssignmentsByCelebs(personIds),
    selectInChunks<ExplanationRow>(personIds, (ids) => db.from("celeb_explanations")
      .select("profile_id,plain_text,plain_text_en").in("profile_id", ids)
      .not("published_at", "is", null).overrideTypes<ExplanationRow[], { merge: false }>()),
  ]);
  const validIds = new Set(profiles.filter((profile) => profile.slug).map((profile) => profile.id));
  const assignments = allAssignments.filter((row) => validIds.has(row.celeb_id));
  const contentIds = unique(assignments.map((row) => row.content_id));
  const [contents, purchaseOptions] = await Promise.all([
    selectInChunks<ContentRow>(contentIds, (ids) => db.from("contents")
      .select(`id,type,content_locales(${CL_SELECT_LIST})`).in("id", ids)
      .overrideTypes<ContentRow[], { merge: false }>()),
    isEn
      ? Promise.resolve([])
      : selectInChunks<FigureBookPurchaseOptionRow>(contentIds, (ids) => db
          .from("figure_book_purchase_options")
          .select("edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url")
          .in("content_id", ids)
          .eq("locale", "ko")
          .eq("platform", "coupang")
          .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>()),
  ]);
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>();
  for (const option of purchaseOptions) {
    const current = optionsByContent.get(option.content_id) ?? [];
    current.push(option);
    optionsByContent.set(option.content_id, current);
  }

  const explanationByPerson = new Map(explanationRows.map((row) => [row.profile_id, row]));

  const works = contents.map((content): MythWork => {
    const flat = flattenLocales(content.content_locales, locale);
    const edition = mapFigureBookPurchaseOptions(optionsByContent.get(content.id) ?? [], "ko")[0];
    return { id: content.id, title: edition?.title ?? flat.title, creator: edition?.creator ?? flat.creator,
      thumbnailUrl: edition?.thumbnailUrl ?? flat.thumbnail_url,
      category: CATEGORY[content.type], coupangUrl: isEn ? null : edition?.purchaseUrl ?? null,
      personIds: unique(assignments.filter((row) => row.content_id === content.id).map((row) => row.celeb_id)) };
  }).filter((work) => work.title).sort((a, b) => b.personIds.length - a.personIds.length || a.title.localeCompare(b.title, locale));

  const people = profiles.flatMap((profile): MythPerson[] => {
    if (!profile.slug) return [];
    const placements = members.filter((member) => member.celeb_id === profile.id);
    const sourceIds = unique(assignments.filter((row) => row.celeb_id === profile.id).map((row) => row.content_id));
    const lead = placements[0];
    /* 대표 사진은 portrait_url만 쓴다. avatar_url은 작은 얼굴 썸네일이라
       대형 화보 자리 fallback으로 늘려 쓰지 않는다 */
    const portraitUrl = profile.portrait_url ?? null;
    const imageUrl = portraitUrl;
    const images = portraitUrl ? [{ url: portraitUrl }] : [];
    const explanation = explanationByPerson.get(profile.id);
    const guide = (isEn ? explanation?.plain_text_en || explanation?.plain_text : explanation?.plain_text)?.trim() || null;
    /* 대사는 전승마다 다르다 — 영상 대본이 그 편의 인물에게 준 말이라 같은 신도 편마다 다르게 말한다 */
    const appearances = placements.map((placement) => ({
      traditionId: placement.tag_id,
      summary: (isEn ? placement.short_desc_en || placement.short_desc : placement.short_desc)?.trim() || null,
      quote: (isEn ? placement.quote_en || placement.quote : placement.quote)?.trim() || null,
      quoteMedia: toFactionQuoteMedia(placement.faction_quote_media),
    }));
    return [{ id: profile.id, slug: profile.slug,
      name: isEn ? profile.nickname_en || profile.nickname : profile.nickname,
      title: isEn ? profile.title_en || profile.title : profile.title,
      headline: isEn ? profile.headline_en || profile.headline : profile.headline,
      bio: isEn ? profile.bio_en || profile.bio : profile.bio,
      reading: guide ? { guide } : null,
      summary: (isEn ? lead?.short_desc_en || lead?.short_desc : lead?.short_desc) ?? null,
      appearances,
      avatarUrl: profile.avatar_url, imageUrl, portraitUrl, images,
      traditionIds: unique(placements.map((row) => row.tag_id)), sourceIds }];
  });
  /* 차례는 전승이 쥔다(tradition.personIds). 여기서 연결 작품 수로 다시 줄을 세우면
     전승마다 잡아 둔 계보·이야기 순서가 화면에서 통째로 뒤집힌다 */

  const parentIdsWithPopulatedChildren = new Set(
    nestedTags
      .filter((tag) => members.some((member) => member.tag_id === tag.id && validIds.has(member.celeb_id)))
      .map((tag) => tag.parent_id),
  );
  const traditions = tagRows.filter((tag) => !parentIdsWithPopulatedChildren.has(tag.id)).flatMap((tag) => {
    if (!tag.slug) return [];
    const ids = unique(members.filter((member) => member.tag_id === tag.id && validIds.has(member.celeb_id)).map((member) => member.celeb_id));
    if (ids.length === 0) return [];
    const region = regionForTradition(tag.slug, tag.name, isEn);
    const titleArt = titleArtForTradition(tag.slug, tag.name);
    const images = titleArt ? [{ url: titleArt, label: null }] : [];
    return [{ id: tag.id, slug: tag.slug, name: isEn ? tag.name_en || tag.name : tag.name,
      description: isEn ? tag.description_en || tag.description : tag.description,
      isPublished: tag.atlas_published === true,
      regionId: region.id, images, personIds: ids }];
  });
  const regions = MYTH_REGIONS.map((region): MythRegion => ({
    id: region.id,
    name: isEn ? region.en : region.ko,
    traditionIds: traditions.filter((tradition) => tradition.regionId === region.id).map((tradition) => tradition.id),
  })).filter((region) => region.traditionIds.length > 0);
  const otherTraditionIds = traditions.filter((tradition) => tradition.regionId === "other").map((tradition) => tradition.id);
  if (otherTraditionIds.length > 0) regions.push({ id: "other", name: isEn ? "Other traditions" : "기타 전승", traditionIds: otherTraditionIds });

  return { regions, traditions, people, works, openingPersonId: people[0]?.id ?? null };
}

const getCachedMythAtlas = unstable_cache(fetchMythAtlas, ["myth-atlas-v13-portrait-only"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS],
});

export async function getMythAtlas(locale: string = "ko") {
  return getCachedMythAtlas(locale === "en" ? "en" : "ko");
}
