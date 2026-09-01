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
  for (const person of people) {
    for (const rank of new Set(person.types.map((type) => KIN_RANK[type]).filter(Boolean))) family[rank].push(person);
    const socialTypes = person.types.filter((type) => SOCIAL_BAND[type]);
    const band = socialTypes.includes("rival")
      ? "right"
      : socialTypes.map((type) => SOCIAL_BAND[type]).find(Boolean)
        ?? (person.groups.some((group) => group !== "family") ? "left" : null);
    if (band) social[band].push(person);
  }

  return {
    people, family, social,
    familyPeople: uniquePeople(Object.values(family)),
    socialPeople: uniquePeople(Object.values(social)),
  };
}

export function peopleForMode(model: RelationModel, mode: RelationMode) {
  return mode === "family" ? model.familyPeople : model.socialPeople;
}

export function relationFocusesForMode(model: RelationModel, mode: RelationMode): RelationFocus[] {
  const entries = mode === "family"
    ? Object.entries(model.family)
    : Object.entries(model.social);
  return entries.filter(([, people]) => people.length).map(([focus]) => focus as RelationFocus);
}

export function peopleForFocuses(model: RelationModel, mode: RelationMode, focuses: RelationFocus[]) {
  const selectedIds = new Set((mode === "family"
    ? focuses.flatMap((focus) => model.family[focus as KinRank] ?? [])
    : focuses.flatMap((focus) => model.social[focus as SocialBand] ?? []))
    .map(({ id }) => id));
  return peopleForMode(model, mode).filter(({ id }) => selectedIds.has(id));
}

export function typesForMode(person: PersonNode, mode: RelationMode) {
  const types = person.types.filter((type) => mode === "family" ? Boolean(KIN_RANK[type]) : Boolean(SOCIAL_BAND[type]));
  return types.length ? types : person.types;
}
