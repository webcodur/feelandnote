import assert from "node:assert/strict";
import test from "node:test";
import { getMythClientData } from "./mythPublicData";
import type { Myth, MythData, MythPerson, MythWork } from "./mythTypes";

function fixture(): MythData {
  const myth = (id: string, isPublished: boolean, personIds: string[]): Myth => ({
    id, slug: id, name: id, isPublished, regionId: "region", personIds, leadPersonIds: personIds.slice(0, 3),
    description: `${id} overview`, images: [{ url: `${id}.jpg`, label: null }],
    music: null,
    groups: [{ id: "group", name: "group", description: "group story", personIds }],
  });
  const person = (id: string, mythIds: string[], sourceIds: string[]): MythPerson => ({
    id, slug: id, name: id, title: null, headline: null, bio: "biography",
    reading: { guide: "complete reading guide" }, summary: null,
    appearances: mythIds.map((mythId) => ({ mythId, summary: "story", imageUrl: null })),
    avatarUrl: null, imageUrl: null, portraitUrl: null, images: [], mythIds, sourceIds,
  });
  const work = (id: string, personIds: string[]): MythWork => ({
    id, title: id, titleBadge: null, personIds, creator: null, thumbnailUrl: null, category: "book", coupangUrl: null,
  });
  return {
    regions: [{ id: "region", slug: "greek-roman", name: "region", mythIds: ["public", "private"] }],
    myths: [myth("public", true, ["public-person", "shared-person"]), myth("private", false, ["private-person", "shared-person"])],
    people: [person("private-person", ["private"], ["private-work", "shared-work"]), person("public-person", ["public"], ["public-work"]), person("shared-person", ["private", "public"], ["shared-work"])],
    works: [work("private-work", ["private-person"]), work("public-work", ["public-person"]), work("shared-work", ["private-person", "shared-person"])],
    openingPersonId: "private-person",
  };
}

test("public view retains complete public stories and shared works without private details", () => {
  const data = fixture();
  const original = structuredClone(data);
  const result = getMythClientData(data);
  assert.deepEqual(result.people.map((person) => person.id), ["public-person", "shared-person"]);
  assert.deepEqual(result.people[0], data.people[1]);
  assert.equal(result.people[1].reading?.guide, "complete reading guide");
  assert.deepEqual(result.people[1].mythIds, ["public"]);
  assert.deepEqual(result.people[1].appearances.map((appearance) => appearance.mythId), ["public"]);
  assert.deepEqual(result.works.map((work) => work.id), ["public-work", "shared-work"]);
  assert.deepEqual(result.works[1].personIds, ["shared-person"]);
  assert.deepEqual(result.regions, data.regions);
  assert.deepEqual(result.myths[0], data.myths[0]);
  assert.deepEqual(result.myths[1], { ...data.myths[1], description: null, images: [], personIds: [], leadPersonIds: [], groups: [] });
  assert.equal(result.openingPersonId, null);
  assert.deepEqual(data, original, "the shared cached data must stay unchanged");
  // The overview shelf selects works by work.personIds, independently of a person's detail shelf.
  data.people[1].sourceIds = [];
  assert.ok(getMythClientData(data).works.some((work) => work.id === "public-work"));
});

test("public opening person remains selected and an entirely closed atlas exports no regions", () => {
  const data = fixture();
  data.openingPersonId = "shared-person";
  assert.equal(getMythClientData(data).openingPersonId, "shared-person");
  data.myths.forEach((myth) => { myth.isPublished = false; });
  const result = getMythClientData(data);
  assert.equal(result.people.length, 0);
  assert.equal(result.works.length, 0);
  assert.equal(result.myths.length, 0);
  assert.equal(result.regions.length, 0);
  assert.equal(result.openingPersonId, null);
});

test("local data keeps closed stories locked and out of the client payload", () => {
  const data = fixture();
  const result = getMythClientData(data);
  assert.deepEqual(result.people.map((person) => person.id), ["public-person", "shared-person"]);
  assert.deepEqual(result.works.map((work) => work.id), ["public-work", "shared-work"]);
  assert.equal(result.openingPersonId, null);
  assert.equal(result.myths[1].isPublished, false);
  assert.equal(result.myths[1].description, null);
  assert.equal(data.myths[1].isPublished, false);
});

test("published myths expose their region while unpublished siblings stay locked", () => {
  const data = fixture();
  data.regions.push({ id: "other", slug: "korea", name: "other", mythIds: ["other-public"] });
  data.myths.push({ ...data.myths[0], id: "other-public", slug: "other-public", regionId: "other" });
  const result = getMythClientData(data);
  assert.deepEqual(result.regions.map((region) => region.slug), ["greek-roman", "korea"]);
  assert.deepEqual(result.myths.map((myth) => myth.id), ["public", "private", "other-public"]);
  assert.equal(result.myths[1].isPublished, false);
  assert.equal(result.myths[1].description, null);
  assert.equal(data.myths[2].isPublished, true);
});
