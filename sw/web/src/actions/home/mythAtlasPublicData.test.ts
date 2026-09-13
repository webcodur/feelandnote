import assert from "node:assert/strict";
import test from "node:test";
import { getMythAtlasClientData } from "./mythAtlasPublicData";
import type { MythAtlasData, MythPerson, MythTradition, MythWork } from "./mythAtlasTypes";

function fixture(): MythAtlasData {
  const tradition = (id: string, isPublished: boolean, personIds: string[]): MythTradition => ({
    id, slug: id, name: id, isPublished, regionId: "region", personIds,
    description: `${id} overview`, images: [{ url: `${id}.jpg`, label: null }],
    groups: [{ id: "group", name: "group", description: "group story", personIds }],
  });
  const person = (id: string, traditionIds: string[], sourceIds: string[]): MythPerson => ({
    id, slug: id, name: id, title: null, headline: null, bio: "biography",
    reading: { guide: "complete reading guide" }, summary: null,
    appearances: traditionIds.map((traditionId) => ({ traditionId, summary: "story", imageUrl: null })),
    avatarUrl: null, imageUrl: null, portraitUrl: null, images: [], traditionIds, sourceIds,
  });
  const work = (id: string, personIds: string[]): MythWork => ({
    id, title: id, personIds, creator: null, thumbnailUrl: null, category: "book", coupangUrl: null,
  });
  return {
    regions: [{ id: "region", name: "region", traditionIds: ["public", "private"] }],
    traditions: [tradition("public", true, ["public-person", "shared-person"]), tradition("private", false, ["private-person", "shared-person"])],
    people: [person("private-person", ["private"], ["private-work", "shared-work"]), person("public-person", ["public"], ["public-work"]), person("shared-person", ["private", "public"], ["shared-work"])],
    works: [work("private-work", ["private-person"]), work("public-work", ["public-person"]), work("shared-work", ["private-person", "shared-person"])],
    openingPersonId: "private-person",
  };
}

test("public view retains complete public stories and shared works without private details", () => {
  const data = fixture();
  const original = structuredClone(data);
  const result = getMythAtlasClientData(data, false);
  assert.deepEqual(result.people.map((person) => person.id), ["public-person", "shared-person"]);
  assert.deepEqual(result.people[0], data.people[1]);
  assert.equal(result.people[1].reading?.guide, "complete reading guide");
  assert.deepEqual(result.people[1].traditionIds, ["public"]);
  assert.deepEqual(result.people[1].appearances.map((appearance) => appearance.traditionId), ["public"]);
  assert.deepEqual(result.works.map((work) => work.id), ["public-work", "shared-work"]);
  assert.deepEqual(result.works[1].personIds, ["shared-person"]);
  assert.deepEqual(result.regions, data.regions);
  assert.deepEqual(result.traditions[0], data.traditions[0]);
  assert.deepEqual(result.traditions[1], { ...data.traditions[1], description: null, images: [], personIds: [], groups: [] });
  assert.equal(result.openingPersonId, null);
  assert.deepEqual(data, original, "the shared cached data must stay unchanged");
  // The overview shelf selects works by work.personIds, independently of a person's detail shelf.
  data.people[1].sourceIds = [];
  assert.ok(getMythAtlasClientData(data, false).works.some((work) => work.id === "public-work"));
});

test("public opening person remains selected and an entirely closed atlas retains only menus", () => {
  const data = fixture();
  data.openingPersonId = "shared-person";
  assert.equal(getMythAtlasClientData(data, false).openingPersonId, "shared-person");
  data.traditions.forEach((tradition) => { tradition.isPublished = false; });
  const result = getMythAtlasClientData(data, false);
  assert.equal(result.people.length, 0);
  assert.equal(result.works.length, 0);
  assert.equal(result.traditions.length, 2);
  assert.equal(result.regions.length, 1);
  assert.equal(result.openingPersonId, null);
});

test("developer preview keeps every story, work and opening selection available", () => {
  const data = fixture();
  const result = getMythAtlasClientData(data, true);
  assert.deepEqual(result.people, data.people);
  assert.deepEqual(result.works, data.works);
  assert.equal(result.openingPersonId, data.openingPersonId);
  assert.deepEqual(result.traditions, data.traditions.map((tradition) => ({ ...tradition, isPublished: true })));
  assert.equal(data.traditions[1].isPublished, false);
});
