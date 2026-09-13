import type { MythAtlasData } from "./mythAtlasTypes";

/** Keep the coming-soon menu, but serialize detail data only for traditions visitors can open. */
export function getMythAtlasClientData(data: MythAtlasData, developerMode: boolean): MythAtlasData {
  if (developerMode) {
    return { ...data, traditions: data.traditions.map((tradition) => ({ ...tradition, isPublished: true })) };
  }

  const published = data.traditions.filter((tradition) => tradition.isPublished);
  const traditionIds = new Set(published.map((tradition) => tradition.id));
  const personIds = new Set(published.flatMap((tradition) => tradition.personIds));
  const people = data.people.filter((person) => personIds.has(person.id)).map((person) => ({
    ...person,
    traditionIds: person.traditionIds.filter((id) => traditionIds.has(id)),
    appearances: person.appearances.filter((appearance) => traditionIds.has(appearance.traditionId)),
  }));

  return {
    ...data,
    traditions: data.traditions.map((tradition) => tradition.isPublished ? tradition : {
      ...tradition,
      description: null,
      images: [],
      personIds: [],
      groups: [],
    }),
    people,
    works: data.works.filter((work) => work.personIds.some((id) => personIds.has(id))).map((work) => ({
      ...work,
      personIds: work.personIds.filter((id) => personIds.has(id)),
    })),
    // A missing opening person already makes the client choose the first published tradition.
    openingPersonId: data.openingPersonId && personIds.has(data.openingPersonId) ? data.openingPersonId : null,
  };
}
