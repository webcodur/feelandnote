import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import { celebRelationAxis, celebRelationAxisGroup } from '@feelandnote/shared/constants/celeb-relations';

import type { KinRank, PersonNode, RelationFocus, RelationMode, RelationModel, SocialBand } from "./types";

const KIN_RANK: Record<string, KinRank> = {
  father: "parents", mother: "parents", parent: "parents",
  sibling: "siblings", relative: "siblings",
  spouse: "spouses", partner: "spouses", child: "children",
};

const SOCIAL_BAND: Record<string, SocialBand> = {
  influence: "up",
  influenced: "down",
  colleague: "left",
  rival: "right",
};

const uniquePeople = (groups: PersonNode[][]) => {
  const seen = new Set<string>();
  return groups.flat().filter((person) => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });
};

export function buildRelationModel(relations: CelebRelationItem[], locale: string): RelationModel {
  const merged = new Map<string, PersonNode>();
  for (const row of relations) {
    const axis = celebRelationAxis(row.relType);
    if (!axis) continue;
    const group = celebRelationAxisGroup(axis);
    const name = locale === "en" && row.nickname_en ? row.nickname_en : row.nickname;
    const note = locale === "en" && row.note_en ? row.note_en : row.note;
    const current = merged.get(row.id);
    if (current) {
      if (!current.types.includes(axis)) current.types.push(axis);
      if (!current.groups.includes(group)) current.groups.push(group);
      if (note && !current.note?.includes(note)) current.note = current.note ? `${current.note} / ${note}` : note;
      continue;
    }
    merged.set(row.id, {
      id: row.id, slug: row.slug, listed: row.listed, name,
      avatarUrl: row.avatar_url, types: [axis], groups: [group], note,
      profession: row.profession, nationality: row.nationality,
      birthDate: row.birth_date, deathDate: row.death_date, qid: row.qid,
    });
  }

  const people = [...merged.values()];
  const family: RelationModel["family"] = { parents: [], siblings: [], spouses: [], children: [] };
  const social: RelationModel["social"] = { up: [], left: [], right: [], down: [] };
  const other: PersonNode[] = [];
  for (const person of people) {
    const socialTypes = person.types.filter((type) => SOCIAL_BAND[type]);
    // 네 축은 독립적이다. 대립한다고 협력이나 양방향 영향이 사라지지 않는다.
    const bands = new Set(socialTypes.map(type => SOCIAL_BAND[type]));
    for (const band of bands) social[band].push(person);
  }

  return {
    people, family, social, other,
    familyPeople: uniquePeople(Object.values(family)),
    socialPeople: uniquePeople(Object.values(social)),
  };
}

export function peopleForMode(model: RelationModel, mode: RelationMode) {
  if (mode === "family") return model.familyPeople;
  return mode === "other" ? model.other : model.socialPeople;
}

// 기타는 갈래가 하나뿐이라 왼쪽 자리 하나만 쓴다 — 나침반 그림과 좁은 화면 목록이
// 갈래 키를 요구하므로 빈 목록 대신 자리 하나를 준다.
export const OTHER_FOCUS = "left" as const;

export function relationFocusesForMode(model: RelationModel, mode: RelationMode): RelationFocus[] {
  if (mode === "other") return model.other.length ? [OTHER_FOCUS] : [];
  const entries = mode === "family"
    ? Object.entries(model.family)
    : Object.entries(model.social);
  return entries.filter(([, people]) => people.length).map(([focus]) => focus as RelationFocus);
}

export function peopleForFocuses(model: RelationModel, mode: RelationMode, focuses: RelationFocus[]) {
  if (mode === "other") return focuses.includes(OTHER_FOCUS) ? model.other : [];
  const selectedIds = new Set((mode === "family"
    ? focuses.flatMap((focus) => model.family[focus as KinRank] ?? [])
    : focuses.flatMap((focus) => model.social[focus as SocialBand] ?? []))
    .map(({ id }) => id));
  return peopleForMode(model, mode).filter(({ id }) => selectedIds.has(id));
}

export function typesForMode(person: PersonNode, mode: RelationMode) {
  if (mode === "other") return person.types;
  const types = person.types.filter((type) => mode === "family" ? Boolean(KIN_RANK[type]) : Boolean(SOCIAL_BAND[type]));
  return types.length ? types : person.types;
}
