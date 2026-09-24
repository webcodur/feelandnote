import type { MythData } from "./mythTypes";

/** Keep the coming-soon menu, but serialize detail data only for myths visitors can open. */
export function getMythClientData(data: MythData): MythData {
  const publishedIds = new Set(data.myths.filter((myth) => myth.isPublished).map((myth) => myth.id));
  const regions = data.regions.filter((region) => region.mythIds.some((id) => publishedIds.has(id)));
  const visibleMythIds = new Set(regions.flatMap((region) => region.mythIds));
  const myths = data.myths.filter((myth) => visibleMythIds.has(myth.id));
  const published = myths.filter((myth) => myth.isPublished);
  const mythIds = new Set(published.map((myth) => myth.id));
  const personIds = new Set(published.flatMap((myth) => myth.personIds));
  const people = data.people.filter((person) => personIds.has(person.id)).map((person) => ({
    ...person,
    mythIds: person.mythIds.filter((id) => mythIds.has(id)),
    appearances: person.appearances.filter((appearance) => mythIds.has(appearance.mythId)),
  }));

  return {
    ...data,
    regions,
    myths: myths.map((myth) => myth.isPublished ? myth : {
      ...myth,
      description: null,
      images: [],
      personIds: [],
      leadPersonIds: [],
      groups: [],
    }),
    people,
    works: data.works.filter((work) => work.personIds.some((id) => personIds.has(id))).map((work) => ({
      ...work,
      personIds: work.personIds.filter((id) => personIds.has(id)),
    })),
    // A missing opening person already makes the client choose the first published myth.
    openingPersonId: data.openingPersonId && personIds.has(data.openingPersonId) ? data.openingPersonId : null,
  };
}
