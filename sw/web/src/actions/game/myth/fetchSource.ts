/*
  파일명: actions/game/myth/fetchSource.ts
  기능: 신화 게임 원천 조회
  책임: 공개된 신화(faction_lv2 is_myth·published)의 숨기지 않은 인물과 그 사이 관계를 두 언어로 읽는다.
        캐시는 부르는 쪽(getMythWorld)이 건다. 목록 조회에 긴 본문(bio·상세 소개)은 싣지 않는다.
*/ // ------------------------------
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { createStaticClient } from "@/lib/db/static";
import { selectVisibleFactionMembers } from "@/lib/faction-members";
import { toFactionMusic } from "@/lib/faction-music";
import type { Bilingual, MythSourceCatalog, MythSourceRelation } from "@/components/features/game/myth/shared/types";

interface RegionRow { id: string; name: string; name_en: string | null }
interface MythRow {
  id: string; lv1_id: string; slug: string | null; name: string; name_en: string | null;
  theme_music: unknown; lead_person_ids: string[] | null;
}
interface MemberRow {
  lv2_id: string; celeb_id: string; short_desc: string | null; short_desc_en: string | null;
  sort_order: number | null; image_url: string | null;
  group_name: string | null; group_name_en: string | null; group_position: number | null;
}
interface GroupRow { lv2_id: string; name: string; description: string | null; description_en: string | null }
interface PersonRow {
  id: string; slug: string | null; nickname: string; nickname_en: string | null;
  title: string | null; title_en: string | null; headline: string | null; headline_en: string | null;
  gender: boolean | null; avatar_url: string | null; portrait_url: string | null;
}
interface RelationRow {
  from_id: string; to_id: string; rel_type: string; rel_group: string; note: string | null; note_en: string | null;
}

const pair = (ko: string | null | undefined, en: string | null | undefined): Bilingual =>
  ({ ko: ko?.trim() || null, en: en?.trim() || null });
const GENDER = { true: "male", false: "female" } as const;

export async function fetchMythSourceCatalog(): Promise<MythSourceCatalog> {
  const db = createStaticClient();
  const [regionResult, mythResult] = await Promise.all([
    db.from("faction_lv1").select("id,name,name_en").eq("is_myth", true),
    db.from("faction_lv2").select("id,lv1_id,slug,name,name_en,theme_music,lead_person_ids")
      .eq("is_myth", true).eq("published", true).order("sort_order"),
  ]);
  if (regionResult.error) throw new Error(`신화 지역 조회 실패: ${regionResult.error.message}`);
  if (mythResult.error) throw new Error(`신화 목록 조회 실패: ${mythResult.error.message}`);
  const regions = (regionResult.data ?? []) as RegionRow[];
  const myths = ((mythResult.data ?? []) as MythRow[]).filter((row) => row.slug);
  const mythIds = myths.map((row) => row.id);
  if (mythIds.length === 0) return { myths: [], figures: [] };

  const members = await selectVisibleFactionMembers<MemberRow>(db,
    "lv2_id,celeb_id,short_desc,short_desc_en,sort_order,image_url,group_name,group_name_en,group_position", mythIds);
  const { data: groupData, error: groupError } = await db.from("faction_lv3")
    .select("lv2_id,name,description,description_en").in("lv2_id", mythIds);
  if (groupError) throw new Error(`신화 그룹 조회 실패: ${groupError.message}`);
  const people = await selectInChunks<PersonRow>([...new Set(members.map((row) => row.celeb_id))], (ids) => db.from("celebs")
    .select("id,slug,nickname,nickname_en,title,title_en,headline,headline_en,gender,avatar_url,portrait_url")
    .in("id", ids).eq("publication_status", "active").overrideTypes<PersonRow[], { merge: false }>());
  const groups = (groupData ?? []) as GroupRow[];

  return {
    myths: myths.map((myth) => {
      const region = regions.find((row) => row.id === myth.lv1_id);
      const rows = members.filter((row) => row.lv2_id === myth.id);
      const labels = [...new Set(rows.map((row) => row.group_name?.trim()).filter((label): label is string => Boolean(label)))];
      return {
        id: myth.id, slug: myth.slug ?? "", name: pair(myth.name, myth.name_en), region: pair(region?.name, region?.name_en),
        musicUrl: toFactionMusic(myth.theme_music)?.url ?? null,
        leadIds: myth.lead_person_ids ?? [],
        groups: labels.map((label) => {
          const labeled = rows.filter((row) => row.group_name?.trim() === label);
          const info = groups.find((row) => row.lv2_id === myth.id && row.name === label);
          return {
            key: label, name: pair(label, labeled[0]?.group_name_en), description: pair(info?.description, info?.description_en),
            position: Math.min(...labeled.map((row) => row.group_position ?? Number.MAX_SAFE_INTEGER)),
          };
        }),
      };
    }),
    figures: people.filter((person) => person.slug).map((person) => ({
      id: person.id, slug: person.slug ?? "", name: pair(person.nickname, person.nickname_en),
      title: pair(person.title, person.title_en), headline: pair(person.headline, person.headline_en),
      gender: person.gender === null ? null : GENDER[`${person.gender}`],
      avatarUrl: person.avatar_url, portraitUrl: person.portrait_url,
      roles: members.filter((row) => row.celeb_id === person.id).map((row) => ({
        mythId: row.lv2_id, group: row.group_name?.trim() || null, summary: pair(row.short_desc, row.short_desc_en),
        imageUrl: row.image_url, order: row.sort_order ?? 0,
      })),
    })),
  };
}

export async function fetchMythSourceRelations(figureIds: string[]): Promise<MythSourceRelation[]> {
  const db = createStaticClient();
  const wanted = new Set(figureIds);
  const rows = await selectInChunks<RelationRow>(figureIds, (ids) => db.from("celeb_relations")
    .select("from_id,to_id,rel_type,rel_group,note,note_en").in("from_id", ids)
    .overrideTypes<RelationRow[], { merge: false }>());
  return rows.filter((row) => wanted.has(row.to_id)).map((row) => ({
    from: row.from_id, to: row.to_id, type: row.rel_type, group: row.rel_group, note: pair(row.note, row.note_en),
  }));
}
