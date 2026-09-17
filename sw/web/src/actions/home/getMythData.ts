"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { STATIC_REVALIDATE } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { selectVisibleFactionMembers } from "@/lib/faction-members";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";
import { getFigureBookAssignmentsByCelebs } from "@/actions/figure-books/figureBookAssignments";
import { loadFigureBookEditions } from "@/actions/figure-books/figureBookEditions";
import { pickPurchaseEdition, type FigureBookEdition } from "@/actions/figure-books/figureBookLocale";
import type { ContentType } from "@/types/database";
import { toFactionMusic } from "@/lib/faction-music";
import { MYTH_OTHER_GROUP_ID, type Myth, type MythData, type MythGroup, type MythPerson, type MythRegion, type MythWork } from "./mythTypes";

interface Lv1Row {
  id: string; name: string; name_en: string | null; sort_order: number;
}
interface Lv2Row {
  id: string; lv1_id: string; slug: string | null; name: string; name_en: string | null;
  description: string | null; description_en: string | null;
  theme_music: unknown;
  lead_person_ids: string[] | null;
  /* 공개 여부는 DB가 쥔다. 전에는 코드에 이름 목록을 적어 두어 신화 하나를 잠그는 데도 배포가 필요했다 */
  published: boolean;
}
interface MemberRow {
  lv2_id: string; celeb_id: string; short_desc: string | null; short_desc_en: string | null; sort_order: number | null;
  image_url: string | null;
  group_name: string | null; group_name_en: string | null; group_position: number | null;
}
interface PersonRow {
  id: string; slug: string | null; nickname: string; nickname_en: string | null;
  title: string | null; title_en: string | null; headline: string | null; headline_en: string | null;
  bio: string | null; bio_en: string | null; avatar_url: string | null; portrait_url: string | null;
}
interface GroupRow {
  lv2_id: string; name: string; description: string | null; description_en: string | null;
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

const TITLE_ART_BY_SLUG: Record<string, string> = {
  "myth-china-fengshen": "myth-china-fengshen.png",
  "myth-china-xiyou": "myth-china-xiyou.png",
  "myth-egypt": "myth-egypt.png",
  "myth-hindu-mahabharata": "myth-hindu-mahabharata.png",
  "myth-hindu-ramayana": "myth-hindu-ramayana.png",
  "myth-japan": "myth-japan.png",
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

function titleArtForMyth(slug: string, name: string) {
  const fileName = TITLE_ART_BY_SLUG[slug] ?? TITLE_ART_BY_NAME[name];
  return fileName ? `/images/myth-atlas/title-art/${fileName}` : null;
}

/* 신화 안의 인물을 배정의 그룹(group_name)으로 나눈다. 순서는 그룹의 최소
   group_position, 그룹 안은 신화 차례 그대로다. 그룹이 없는 인물은 맨 끝 「그 외」로
   모은다. 그룹이 둘 미만이면 빈 배열 — 화면이 그룹 줄을 숨긴다(세력도감 쇼케이스와 같은 규칙).
   쇼케이스는 단체 사진 묶음(faction_lv2.team_images)을 세력보다 먼저 쓰지만 여기서는 쓰지 않는다.
   신화의 그룹은 세력과 이름·구성원이 같거나(일리아스·그리스 신화) 장면 제목 단위로 1~3명씩
   잘게 쪼개져(오디세이아 15개) 탭으로 고를 수 없다(26.09.11 대조) */
function groupsForMyth(
  rows: MemberRow[],
  personIds: string[],
  isEn: boolean,
  describe: (label: string) => string | null,
): MythGroup[] {
  const rowByPerson = new Map<string, MemberRow>();
  for (const row of rows) {
    const current = rowByPerson.get(row.celeb_id);
    if (!current || (!current.group_name && row.group_name)) rowByPerson.set(row.celeb_id, row);
  }
  const labeled = new Map<string, { name: string | null; position: number; personIds: string[] }>();
  const others: string[] = [];
  for (const id of personIds) {
    const row = rowByPerson.get(id);
    const label = row?.group_name?.trim();
    if (!row || !label) {
      others.push(id);
      continue;
    }
    /* 영문 이름이 비면 한국어를 보내지 않고 null — 화면이 대체 문구를 붙인다 */
    const group = labeled.get(label) ?? { name: isEn ? row.group_name_en?.trim() || null : label, position: Number.MAX_SAFE_INTEGER, personIds: [] };
    group.position = Math.min(group.position, row.group_position ?? Number.MAX_SAFE_INTEGER);
    group.personIds.push(id);
    labeled.set(label, group);
  }
  if (labeled.size < 2) return [];
  const ordered: MythGroup[] = [...labeled.entries()]
    .sort((a, b) => a[1].position - b[1].position)
    .map(([label, group]) => ({ id: label, name: group.name, description: describe(label), personIds: group.personIds }));
  return others.length > 0 ? [...ordered, { id: MYTH_OTHER_GROUP_ID, name: null, description: null, personIds: others }] : ordered;
}

async function fetchMythData(locale: string): Promise<MythData> {
  const db = createStaticClient();
  const isEn = locale === "en";

  /* 지역(lv1)·신화(lv2) — is_myth가 신화의 세계 가지를 가른다.
     전에는 지역을 코드 상수 + slug 앞머리로 추측했다 — 이제 lv1 행이 지역 자체다 */
  const [lv1Result, lv2Result] = await Promise.all([
    db.from("faction_lv1")
      .select("id,name,name_en,sort_order")
      .eq("is_myth", true).order("sort_order"),
    db.from("faction_lv2")
      .select("id,lv1_id,slug,name,name_en,description,description_en,published,theme_music,lead_person_ids")
      .eq("is_myth", true).order("sort_order"),
  ]);
  if (lv1Result.error) throw new Error(`신화 지역 조회 실패: ${lv1Result.error.message}`);
  if (lv2Result.error) throw new Error(`신화 목록 조회 실패: ${lv2Result.error.message}`);
  const regionRows = (lv1Result.data ?? []) as Lv1Row[];
  const mythRows = (lv2Result.data ?? []) as Lv2Row[];
  const lv2Ids = mythRows.map((faction) => faction.id);
  if (lv2Ids.length === 0) return { regions: [], myths: [], people: [], works: [], openingPersonId: null };

  /* 1,000행 상한에 잘리지 않게 공통 읽기로 끝까지 받는다. 신화 인원이 그 턱밑(26.09.14 약 1천 행)이다.
     차례는 sort_order가 쥔다 */
  const members = await selectVisibleFactionMembers<MemberRow>(db,
    "lv2_id,celeb_id,short_desc,short_desc_en,sort_order,image_url,group_name,group_name_en,group_position", lv2Ids);
  const personIds = unique(members.map((member) => member.celeb_id));
  if (personIds.length === 0) return { regions: [], myths: [], people: [], works: [], openingPersonId: null };

  /* 그룹 설명 — 그룹 개요의 본문이다. 뷰에는 없어 그룹 표를 직접 읽는다.
     영문 설명이 비면 한국어를 보내지 않고 null — 화면이 대체 문구를 붙인다 */
  const { data: groupData, error: groupError } = await db
    .from("faction_lv3").select("lv2_id,name,description,description_en").in("lv2_id", lv2Ids);
  if (groupError) throw new Error(`신화 그룹 설명 조회 실패: ${groupError.message}`);
  const groupDescriptions = new Map(((groupData ?? []) as GroupRow[]).map((row) => [
    `${row.lv2_id}/${row.name}`,
    (isEn ? row.description_en : row.description)?.trim() || null,
  ]));

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
  // 한국어 화면은 판본 표가 원천이다 — YES24가 찾을 ISBN 판본을 세우고, 쿠팡 상품은 같은 판본에 보조로 붙는다
  const [contents, editionsByContent] = await Promise.all([
    selectInChunks<ContentRow>(contentIds, (ids) => db.from("contents")
      .select(`id,type,content_locales(${CL_SELECT_LIST})`).in("id", ids)
      .overrideTypes<ContentRow[], { merge: false }>()),
    isEn ? Promise.resolve(new Map<string, FigureBookEdition[]>()) : loadFigureBookEditions(db, contentIds, "ko"),
  ]);

  const explanationByPerson = new Map(explanationRows.map((row) => [row.profile_id, row]));

  const works = contents.map((content): MythWork => {
    const flat = flattenLocales(content.content_locales, locale);
    const edition = pickPurchaseEdition(editionsByContent.get(content.id) ?? [], "ko");
    return { id: content.id, title: edition?.title ?? flat.title, creator: edition?.creator ?? flat.creator,
      thumbnailUrl: edition?.thumbnailUrl ?? flat.thumbnail_url,
      category: CATEGORY[content.type], coupangUrl: isEn || edition?.platform !== "coupang" ? null : edition.purchaseUrl,
      editionId: isEn ? undefined : edition?.id,
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
    const appearances = placements.map((placement) => ({
      mythId: placement.lv2_id,
      summary: (isEn ? placement.short_desc_en || placement.short_desc : placement.short_desc)?.trim() || null,
      /* 편마다 모습이 다른 인물의 신화 전용 사진 — 고르는 규칙은 화면의 mythLeadImage가 쥔다 */
      imageUrl: placement.image_url ?? null,
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
      mythIds: unique(placements.map((row) => row.lv2_id)), sourceIds }];
  });
  /* 차례는 신화가 쥔다(myth.personIds). 여기서 연결 작품 수로 다시 줄을 세우면
     신화마다 잡아 둔 계보·이야기 순서가 화면에서 통째로 뒤집힌다 */

  const regionIds = new Set(regionRows.map((region) => region.id));
  const myths = mythRows.flatMap((faction): Myth[] => {
    if (!faction.slug) return [];
    const ids = unique(members.filter((member) => member.lv2_id === faction.id && validIds.has(member.celeb_id)).map((member) => member.celeb_id));
    if (ids.length === 0) return [];
    const titleArt = titleArtForMyth(faction.slug, faction.name);
    const images = titleArt ? [{ url: titleArt, label: null }] : [];
    /* 대표 3인은 DB가 쥔다(faction_lv2.lead_person_ids). 빠진 자리(숨김·미지정)는 명단 앞쪽으로 채운다 */
    const leadPersonIds = (faction.lead_person_ids ?? []).filter((id) => ids.includes(id));
    for (const id of ids) {
      if (leadPersonIds.length >= 3) break;
      if (!leadPersonIds.includes(id)) leadPersonIds.push(id);
    }
    return [{ id: faction.id, slug: faction.slug, name: isEn ? faction.name_en || faction.name : faction.name, leadPersonIds,
      description: isEn ? faction.description_en || faction.description : faction.description,
      isPublished: faction.published === true,
      regionId: regionIds.has(faction.lv1_id) ? faction.lv1_id : "other",
      images, personIds: ids, music: toFactionMusic(faction.theme_music),
      groups: groupsForMyth(members.filter((member) => member.lv2_id === faction.id), ids, isEn,
        (label) => groupDescriptions.get(`${faction.id}/${label}`) ?? null) }];
  });
  const regions = regionRows.map((region): MythRegion => ({
    id: region.id,
    name: isEn ? region.name_en || region.name : region.name,
    mythIds: myths.filter((myth) => myth.regionId === region.id).map((myth) => myth.id),
  })).filter((region) => region.mythIds.length > 0);
  const otherMythIds = myths.filter((myth) => myth.regionId === "other").map((myth) => myth.id);
  if (otherMythIds.length > 0) regions.push({ id: "other", name: isEn ? "Other myths" : "기타 신화", mythIds: otherMythIds });

  return { regions, myths, people, works, openingPersonId: people[0]?.id ?? null };
}

const getCachedMythData = unstable_cache(fetchMythData, ['myth-data-v21'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS],
});

export async function getMythData(locale: string = "ko") {
  return getCachedMythData(locale === "en" ? "en" : "ko");
}
