import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

import type { KinRank, PersonNode, RelationFocus, RelationMode, RelationModel, SocialBand } from "./types";

const KIN_RANK: Record<string, KinRank> = {
  father: "parents", mother: "parents", parent: "parents",
  sibling: "siblings", relative: "siblings",
  spouse: "spouses", partner: "spouses", child: "children",
};

const SOCIAL_BAND: Record<string, SocialBand> = {
  teacher: "up", influence: "up",
  student: "down", influenced: "down",
  cofounder: "left", colleague: "left", friend: "left",
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
    const name = locale === "en" && row.nickname_en ? row.nickname_en : row.nickname;
    const note = locale === "en" && row.note_en ? row.note_en : row.note;
    const current = merged.get(row.id);
    if (current) {
      if (!current.types.includes(row.relType)) current.types.push(row.relType);
      if (!current.groups.includes(row.relGroup)) current.groups.push(row.relGroup);
      if (note && !current.note?.includes(note)) current.note = current.note ? `${current.note} / ${note}` : note;
      continue;
    }
    merged.set(row.id, {
      id: row.id, slug: row.slug, listed: row.listed, name,
      avatarUrl: row.avatar_url, types: [row.relType], groups: [row.relGroup], note,
      profession: row.profession, nationality: row.nationality,
      birthDate: row.birth_date, deathDate: row.death_date, qid: row.qid,
    });
  }

  const people = [...merged.values()];
  const family: RelationModel["family"] = { parents: [], siblings: [], spouses: [], children: [] };
  const social: RelationModel["social"] = { up: [], left: [], right: [], down: [] };
  // 가족 갈래에도 사회 갈래에도 안 걸리는 관계를 담는 자리. 지금은 counterpart(대응 신격)가
  // 여기 온다 — 제우스와 유피테르처럼 「같은 신을 문화권마다 다르게 부른 것」은 협력도 대립도
  // 아니라서, 사회 갈래에 끼워 넣으면 둘이 무슨 사이인 것처럼 읽힌다. 앞으로 어느 갈래에도
  // 안 맞는 관계 종류가 생기면 따로 손대지 않아도 같은 자리로 모인다.
  const other: PersonNode[] = [];
  for (const person of people) {
    const kinRanks = new Set(person.types.map((type) => KIN_RANK[type]).filter(Boolean));
    for (const rank of kinRanks) family[rank].push(person);
    const socialTypes = person.types.filter((type) => SOCIAL_BAND[type]);
    const band = socialTypes.includes("rival")
      ? "right"
      : socialTypes.map((type) => SOCIAL_BAND[type]).find(Boolean) ?? null;
    if (band) social[band].push(person);
    if (!kinRanks.size && !band) other.push(person);
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
