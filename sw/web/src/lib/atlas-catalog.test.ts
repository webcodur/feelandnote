import assert from "node:assert/strict";
import test from "node:test";
import { factionCatalogGroups, filterAtlasCatalog, mythCatalogGroups, type AtlasCatalogGroup } from "./atlas-catalog";
import type { Myth, MythData } from "@/actions/home/mythTypes";
import type { FactionSection } from "./faction-sections";

const myth = (id: string, published: boolean): Myth => ({
  id, slug: id, name: id, headline: "A journey home", description: null, isPublished: published,
  regionId: "greece", images: [{ url: "/cover.png", label: null }, { url: "/scene.png", label: "scene", kind: "scene" }],
  scenesComplete: true, music: null, personIds: ["a", "b"], leadPersonIds: [], groups: [],
});

test("catalog exposes only published myths and keeps the region order, real links, covers and scene approval", () => {
  const data: MythData = { regions: [
    { id: "empty", slug: "empty", name: "Empty", mythIds: ["locked"] },
    { id: "greece", slug: "greek", name: "Greece", mythIds: ["odyssey", "locked"] },
  ], myths: [myth("locked", false), myth("odyssey", true)], people: [], works: [] };
  const groups = mythCatalogGroups(data);
  assert.deepEqual(groups.map(group => group.id), ["greek"]);
  assert.deepEqual(groups[0].entries.map(entry => entry.href), ["/explore/myth/odyssey"]);
  assert.equal(groups[0].entries[0].members, 2);
  assert.equal(groups[0].entries[0].cover, "/cover.png");
  assert.equal(groups[0].entries[0].scenesComplete, true);
  data.myths[1].images = [];
  assert.equal(mythCatalogGroups(data)[0].entries[0].scenesComplete, false);
});

test("faction catalog uses localized names and headlines and marks completion only for scenes in that language", () => {
  const sections = [{ faction: { id: "ai", slug: "ai", name: "인공지능", name_en: "AI" }, entries: [{
    id: "lab", slug: "lab", name: "연구소", name_en: "Lab", headline: "소개", headline_en: "Research lab", celebs: [{ id: "a" }],
    scenes_complete: true, team_images: [{ kind: "cover", url: "/cover.webp" }, { kind: "scene", url: "/scene.webp", label: "장면", caption: "설명" }],
  }] }] as FactionSection[];
  const ko = factionCatalogGroups(sections, "ko")[0];
  const en = factionCatalogGroups(sections, "en")[0];
  assert.equal(ko.entries[0].scenesComplete, true);
  assert.equal(en.entries[0].scenesComplete, false);
  assert.equal(en.name, "AI");
  assert.equal(en.entries[0].headline, "Research lab");
  assert.equal(en.entries[0].href, "/explore/faction/lab");
  assert.equal(en.entries[0].cover, "/cover.webp");
});

test("search combines words across theme, name and headline without changing the source catalog", () => {
  const entry = { id: "a", name: "Odyssey", headline: "A journey home", href: "/a", cover: null, members: 2, scenesComplete: false };
  const groups: AtlasCatalogGroup[] = [{ id: "greek", name: "Greek", entries: [entry] }, { id: "other", name: "Other", entries: [{ ...entry, id: "b", name: "Other" }] }];
  assert.deepEqual(filterAtlasCatalog(groups, null, "  GREEK   home ").map(group => group.id), ["greek"]);
  assert.equal(filterAtlasCatalog(groups, "other", "Odyssey").length, 0);
  assert.equal(filterAtlasCatalog(groups, null, "missing").length, 0);
  assert.equal(filterAtlasCatalog(groups, null, "").length, 2);
  assert.equal(groups[0].entries.length, 1);
});
