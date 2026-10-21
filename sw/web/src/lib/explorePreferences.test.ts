import assert from "node:assert/strict";
import test from "node:test";
import { parseFilterParams } from "@/app/[locale]/(main)/explore/figures/filterParams";
import {
  EXPLORE_PREFERENCES_KEY, canRestoreExploreFilters, createExplorePreferences,
  readExplorePreferences, restoreExplorePreferenceUrl, writeExplorePreferences,
} from "./explorePreferences";

function storage(raw: string | null = null) {
  const data = new Map<string, string>();
  if (raw !== null) data.set(EXPLORE_PREFERENCES_KEY, raw);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

test("first visit defaults to people with books; explicit all and other media survive SSR", () => {
  assert.equal(parseFilterParams({}).contentType, "BOOK");
  assert.equal(parseFilterParams({}).contentPresence, "with");
  assert.equal(parseFilterParams({ contentType: "all" }).contentType, undefined);
  assert.equal(parseFilterParams({ contentType: "MUSIC" }).contentType, "MUSIC");
  assert.equal(parseFilterParams({ contentType: "invalid" }).contentType, "BOOK");
});

test("all filters and portrait viewing round trip while search, page, and faction stay temporary", () => {
  const filters = parseFilterParams({
    profession: "actor", nationality: "KR", contentType: "all", contentPresence: "without",
    gender: "female", sortBy: "name_asc", trendCountry: "US", pageSize: "48",
    reality: "FICTION,BOTH", byMin: "-400", byMax: "2000", search: "temporary", page: "3", tagId: "temporary",
  });
  const preferences = createExplorePreferences(filters, "portrait");
  const saved = storage();
  writeExplorePreferences(saved, preferences);
  assert.deepEqual(readExplorePreferences(saved), preferences);
  const restored = parseFilterParams(Object.fromEntries(new URLSearchParams(preferences.filters)));
  assert.deepEqual(restored, { ...filters, search: undefined, factionId: undefined, page: 1 });
  assert.equal(new URLSearchParams(preferences.filters).get("contentType"), "all");
});

test("explicit filter, search, page, and legacy links take priority; unrelated tracking does not", () => {
  for (const query of ["contentType=MUSIC", "contentPresence=all", "search=name", "page=2", "tier=light", "tagId=tag", "profession=all"]) {
    assert.equal(canRestoreExploreFilters(query), false, query);
  }
  assert.equal(canRestoreExploreFilters(""), true);
  assert.equal(canRestoreExploreFilters("utm_source=bookmark"), true);
  assert.equal(restoreExplorePreferenceUrl("utm_source=bookmark", "contentType=all&sortBy=name_asc"), "utm_source=bookmark&contentType=all&sortBy=name_asc");
});

test("missing, malformed, disallowed, or inaccessible storage falls back without throwing", () => {
  for (const raw of [null, "{", "[]", "null", '{"filters":2,"cardImage":"portrait"}', '{"filters":"gender=invalid","cardImage":"portrait"}', '{"filters":"byMin=3000&byMax=1000","cardImage":"portrait"}']) {
    assert.equal(readExplorePreferences(storage(raw)), null);
  }
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } };
  assert.equal(readExplorePreferences(blocked), null);
  assert.doesNotThrow(() => writeExplorePreferences(blocked, createExplorePreferences(parseFilterParams({}), "avatar")));
});

test("stored unknown parameters cannot restore search, page, or internal flags", () => {
  const saved = readExplorePreferences(storage(JSON.stringify({ filters: "contentType=VIDEO&search=secret&page=7&includeInactive=true&tagId=bad", cardImage: "avatar" })));
  assert.ok(saved);
  const params = new URLSearchParams(saved.filters);
  assert.equal(params.get("contentType"), "VIDEO");
  for (const key of ["search", "page", "tagId", "includeInactive"]) assert.equal(params.has(key), false);
});
