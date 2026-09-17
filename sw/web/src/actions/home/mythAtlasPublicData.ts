import type { MythAtlasData } from "./mythAtlasTypes";

/** Keep the coming-soon menu, but serialize detail data only for myths visitors can open. */
export function getMythAtlasClientData(data: MythAtlasData, developerMode: boolean): MythAtlasData {
  if (developerMode) {
    return { ...data, myths: data.myths.map((myth) => ({ ...myth, isPublished: true })) };
  }

  const published = data.myths.filter((myth) => myth.isPublished);
  const mythIds = new Set(published.map((myth) => myth.id));
  const personIds = new Set(published.flatMap((myth) => myth.personIds));
  const people = data.people.filter((person) => personIds.has(person.id)).map((person) => ({
    ...person,
    mythIds: person.mythIds.filter((id) => mythIds.has(id)),
    appearances: person.appearances.filter((appearance) => mythIds.has(appearance.mythId)),
  }));

  return {
    ...data,
    myths: data.myths.map((myth) => myth.isPublished ? myth : {
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
