"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";
import { getFictionSourceAssignmentsByCelebs } from "@/actions/fiction/fictionSourceAssignments";
import {
  mapFictionSourcePurchaseOptions,
  type FictionSourcePurchaseOptionRow,
} from "@/actions/fiction/fictionSourceLocale";
import type { ContentType } from "@/types/database";
import type { MythAtlasData, MythPerson, MythRegion, MythWork } from "./mythAtlasTypes";

interface TagRow {
  id: string; parent_id: string | null; slug: string | null; name: string; name_en: string | null;
  description: string | null; description_en: string | null;
}
interface MemberRow {
  tag_id: string; celeb_id: string; short_desc: string | null; short_desc_en: string | null; sort_order: number | null;
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

const PUBLISHED_TRADITION_NAMES = new Set([
  "그리스 로마 신화",
  "일리아스",
  "오디세이아",
]);
const PUBLISH_ALL_TRADITIONS = process.env.NODE_ENV === "development";

const MYTH_REGIONS = [
  { id: "korea", ko: "한국", en: "Korea", prefixes: ["myth-korea"] },
  { id: "japan", ko: "일본", en: "Japan", prefixes: ["myth-japan"] },
  { id: "china", ko: "중국", en: "China", prefixes: ["myth-china"] },
  { id: "india", ko: "인도", en: "India", prefixes: ["myth-hindu"] },
  { id: "greek-roman", ko: "그리스·로마", en: "Greece & Rome", prefixes: ["myth-greek", "myth-argonaut", "myth-atreus", "myth-heracles", "myth-iliad", "myth-odyssey", "myth-aeneid"] },
  { id: "egypt", ko: "이집트", en: "Egypt", prefixes: ["myth-egypt"] },
  { id: "mesopotamia", ko: "메소포타미아", en: "Mesopotamia", prefixes: ["myth-mesopotamia"] },
  { id: "northern-europe", ko: "북유럽", en: "Northern Europe", prefixes: ["myth-norse"] },
  { id: "britain", ko: "브리튼", en: "Britain", prefixes: ["myth-arthur"] },
] as const;

const NAME_REGION_IDS: Array<{ id: (typeof MYTH_REGIONS)[number]["id"]; names: string[] }> = [
  { id: "greek-roman", names: ["아르고 원정대", "아트레우스 가문", "아이네이스", "헤라클레스의 열두 과제", "일리아스", "오디세이아", "그리스 로마 신화"] },
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
  "그리스 로마 신화": "myth-greek-roman.png",
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
    .select("id,parent_id,slug,name,name_en,description,description_en")
    .eq("parent_id", parent.id).order("sort_order");
  if (tagError) throw new Error(`신화 목록 조회 실패: ${tagError.message}`);
  const rootTags = (rootTagData ?? []) as TagRow[];
  const { data: nestedTagData, error: nestedTagError } = rootTags.length > 0
    ? await db.from("celeb_tags")
      .select("id,parent_id,slug,name,name_en,description,description_en")
      .in("parent_id", rootTags.map((tag) => tag.id)).order("sort_order")
    : { data: [], error: null };
  if (nestedTagError) throw new Error(`Failed to load nested mythology tags: ${nestedTagError.message}`);
  const nestedTags = (nestedTagData ?? []) as TagRow[];
  const tagRows = [...rootTags, ...nestedTags];
  const tagIds = tagRows.map((tag) => tag.id);
  if (tagIds.length === 0) return { regions: [], traditions: [], people: [], works: [], openingPersonId: null };

  const { data: memberData, error: memberError } = await db
    .from("faction_atlas_members")
    .select("tag_id,celeb_id,short_desc,short_desc_en,sort_order")
    .in("tag_id", tagIds).eq("hidden", false).order("sort_order");
  if (memberError) throw new Error(`신화 인물 조회 실패: ${memberError.message}`);
  const members = (memberData ?? []) as MemberRow[];
  const personIds = unique(members.map((member) => member.celeb_id));
  if (personIds.length === 0) return { regions: [], traditions: [], people: [], works: [], openingPersonId: null };

  const [profiles, allAssignments, explanationRows] = await Promise.all([
    selectInChunks<PersonRow>(personIds, (ids) => db.from("celebs")
      .select("id,slug,nickname,nickname_en,title,title_en,headline,headline_en,bio,bio_en,avatar_url,portrait_url")
      .in("id", ids).overrideTypes<PersonRow[], { merge: false }>()),
    getFictionSourceAssignmentsByCelebs(personIds),
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
      : selectInChunks<FictionSourcePurchaseOptionRow>(contentIds, (ids) => db
          .from("figure_book_purchase_options")
          .select("edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url")
          .in("content_id", ids)
          .eq("locale", "ko")
          .eq("platform", "coupang")
          .overrideTypes<FictionSourcePurchaseOptionRow[], { merge: false }>()),
  ]);
  const optionsByContent = new Map<string, FictionSourcePurchaseOptionRow[]>();
  for (const option of purchaseOptions) {
    const current = optionsByContent.get(option.content_id) ?? [];
    current.push(option);
    optionsByContent.set(option.content_id, current);
  }

  const explanationByPerson = new Map(explanationRows.map((row) => [row.profile_id, row]));

  const works = contents.map((content): MythWork => {
    const flat = flattenLocales(content.content_locales, locale);
    const edition = mapFictionSourcePurchaseOptions(optionsByContent.get(content.id) ?? [], "ko")[0];
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
    const imageUrl = profile.portrait_url ?? profile.avatar_url;
    const images = imageUrl ? [{ url: imageUrl }] : [];
    const explanation = explanationByPerson.get(profile.id);
    const guide = (isEn ? explanation?.plain_text_en || explanation?.plain_text : explanation?.plain_text)?.trim() || null;
    const appearances = placements.map((placement) => ({
      traditionId: placement.tag_id,
      summary: (isEn ? placement.short_desc_en || placement.short_desc : placement.short_desc)?.trim() || null,
    }));
    return [{ id: profile.id, slug: profile.slug,
      name: isEn ? profile.nickname_en || profile.nickname : profile.nickname,
      title: isEn ? profile.title_en || profile.title : profile.title,
      headline: isEn ? profile.headline_en || profile.headline : profile.headline,
      bio: isEn ? profile.bio_en || profile.bio : profile.bio,
      reading: guide ? { guide } : null,
      summary: (isEn ? lead?.short_desc_en || lead?.short_desc : lead?.short_desc) ?? null,
      appearances,
      avatarUrl: profile.avatar_url, imageUrl, images,
      traditionIds: unique(placements.map((row) => row.tag_id)), sourceIds }];
  }).sort((a, b) => b.sourceIds.length - a.sourceIds.length);

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
      isPublished: PUBLISH_ALL_TRADITIONS || PUBLISHED_TRADITION_NAMES.has(tag.name),
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

const getCachedMythAtlas = unstable_cache(fetchMythAtlas, ["myth-atlas-v12-source-products"], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FICTION_SOURCES],
});

export async function getMythAtlas(locale: string = "ko") {
  return getCachedMythAtlas(locale === "en" ? "en" : "ko");
}
