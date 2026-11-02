import assert from "node:assert/strict";
import test from "node:test";
import { parseFilterParams } from "@/app/[locale]/(main)/explore/figures/filterParams";
import { normalizeListingParams } from "@/constants/celebListingPolicy";
import { CELEB_FILTER_SELECTION_LIMITS, toggleFilterSelection } from "@/constants/celebFilterSelection";
import {
  EXPLORE_PREFERENCES_KEY, canRestoreExploreFilters, createExplorePreferences,
  readExplorePreferences, restoreExplorePreferenceUrl, writeExplorePreferences,
  EXPLORE_FILTER_HISTORY_KEY, EXPLORE_FILTER_HISTORY_LIMITS, exploreFilterHistoryEntries,
  readExploreFilterHistory, rememberExploreFilters, writeExploreFilterHistory,
  EXPLORE_FILTER_HISTORY_ENABLED_KEY, readExploreFilterHistoryEnabled, writeExploreFilterHistoryEnabled,
  EXPLORE_FILTER_HISTORY_LIMIT_KEY, normalizeExploreFilterHistoryLimit, readExploreFilterHistoryLimit, writeExploreFilterHistoryLimit,
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

test("explore sends its visible default reality filter and preserves an explicit all selection", () => {
  assert.deepEqual(parseFilterParams({}).realities, ["REAL", "BOTH"]);
  assert.deepEqual(parseFilterParams({ search: "제우스", reality: "all" }).realities, ["REAL", "BOTH", "FICTION"]);
  const preferences = createExplorePreferences(parseFilterParams({ reality: "all" }), "avatar");
  const restored = readExplorePreferences(storage(JSON.stringify(preferences)));
  assert.ok(restored);
  assert.deepEqual(parseFilterParams(Object.fromEntries(new URLSearchParams(restored.filters))).realities, ["REAL", "BOTH", "FICTION"]);
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

test("multiple professions and countries survive URL and preference restoration, including more than 80 characters", () => {
  const professions = "scientist,author,entrepreneur,politician,director,musician,artist,actor,athlete,journalist";
  const parsed = parseFilterParams({ profession: professions, nationality: "US,KR,US", page: "2" });
  const preferences = createExplorePreferences(parsed, "portrait");
  const restored = readExplorePreferences(storage(JSON.stringify(preferences)));
  assert.deepEqual(restored, preferences);
  const request = normalizeListingParams(parseFilterParams(Object.fromEntries(new URLSearchParams(restored!.filters))));
  assert.equal(request.nationality, "KR,US");
  assert.equal(request.profession!.split(",").length, 10);
  assert.equal(request.page, 1);
});

test("deselecting one country retains the other, deselecting the last or choosing all removes the server constraint", () => {
  assert.equal(toggleFilterSelection("KR,US", "US"), "KR");
  assert.equal(toggleFilterSelection("KR", "KR"), "all");
  assert.equal(toggleFilterSelection("KR,US", "all"), "all");
  const request = normalizeListingParams({ profession: "all", nationality: toggleFilterSelection("KR", "KR") });
  assert.equal(request.nationality, undefined);
  assert.equal(request.profession, undefined);
});

test("multiple filters remain bounded and canonical before cache keys or database queries", () => {
  assert.equal(normalizeListingParams({ profession: "scientist,author,scientist" }).profession, "author,scientist");
  assert.throws(() => normalizeListingParams({ nationality: Array.from({ length: CELEB_FILTER_SELECTION_LIMITS.items + 1 }, (_, i) => `C${i}`).join(",") }));
  assert.throws(() => normalizeListingParams({ profession: "a".repeat(CELEB_FILTER_SELECTION_LIMITS.valueLength + 1) }));
});

test("recent filters split multiple selections and store only changed individual values", () => {
  assert.deepEqual(exploreFilterHistoryEntries("profession=author,actor&nationality=US,KR"), ["profession=actor", "profession=author", "nationality=KR", "nationality=US"]);
  assert.deepEqual(exploreFilterHistoryEntries("search=private&page=3&pageSize=48&sortBy=name_asc&trendCountry=US"), []);
  assert.deepEqual(exploreFilterHistoryEntries("profession=all&nationality=all&contentType=all&contentPresence=all&gender=all&reality=all"), []);
  assert.deepEqual(exploreFilterHistoryEntries("reality=FICTION,REAL,BOTH"), []);
  assert.deepEqual(rememberExploreFilters(["contentType=BOOK"], "contentType=all", "contentType=BOOK"), ["contentType=BOOK"]);
  const previous = "contentType=BOOK&nationality=KR&reality=REAL,BOTH";
  assert.deepEqual(rememberExploreFilters([], "contentType=MUSIC&nationality=KR,US&reality=BOTH,REAL", previous), ["nationality=US", "contentType=MUSIC"]);
  let history: string[] = [];
  for (let i = 0; i < EXPLORE_FILTER_HISTORY_LIMITS.default + 2; i++) history = rememberExploreFilters(history, `byMin=${i}`);
  assert.equal(history.length, EXPLORE_FILTER_HISTORY_LIMITS.default);
  const entry = history[2];
  history = rememberExploreFilters(history, entry);
  assert.equal(history[0], entry);
  assert.equal(new Set(history).size, history.length);
});

test("individual recent filters persist, and older combinations are split on read", () => {
  const saved = storage();
  const entries = exploreFilterHistoryEntries("contentType=BOOK&contentPresence=with&reality=REAL,BOTH&search=private&tagId=private");
  writeExploreFilterHistory(saved, entries);
  assert.deepEqual(readExploreFilterHistory(saved), entries);
  saved.setItem(EXPLORE_FILTER_HISTORY_KEY, JSON.stringify([null, 9, "gender=invalid", "sortBy=name_asc", "trendCountry=US", "contentType=all", "contentPresence=all", "reality=all", "reality=REAL,BOTH,FICTION", "profession=actor&nationality=KR,US", "nationality=KR"]));
  assert.deepEqual(readExploreFilterHistory(saved), ["profession=actor", "nationality=KR", "nationality=US"]);
  saved.setItem(EXPLORE_FILTER_HISTORY_KEY, "{broken");
  assert.deepEqual(readExploreFilterHistory(saved), []);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(readExploreFilterHistory(blocked), []);
  assert.doesNotThrow(() => writeExploreFilterHistory(blocked, entries));
});

test("recent filter use can be disabled persistently without affecting stored filters", () => {
  const saved = storage();
  writeExploreFilterHistory(saved, ["nationality=KR"]);
  assert.equal(readExploreFilterHistoryEnabled(saved), true);
  writeExploreFilterHistoryEnabled(saved, false);
  assert.equal(readExploreFilterHistoryEnabled(saved), false);
  assert.deepEqual(readExploreFilterHistory(saved), ["nationality=KR"]);
  writeExploreFilterHistoryEnabled(saved, true);
  assert.equal(readExploreFilterHistoryEnabled(saved), true);
  saved.setItem(EXPLORE_FILTER_HISTORY_ENABLED_KEY, "invalid");
  assert.equal(readExploreFilterHistoryEnabled(saved), true);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readExploreFilterHistoryEnabled(blocked), true);
  assert.doesNotThrow(() => writeExploreFilterHistoryEnabled(blocked, false));
});

test("history capacity defaults to three and uses the saved limit for reads and future records", () => {
  const saved = storage();
  assert.equal(readExploreFilterHistoryLimit(saved), 3);
  const entries = ["nationality=KR", "profession=actor", "contentType=MUSIC", "gender=female", "byMin=1986"];
  writeExploreFilterHistory(saved, entries);
  assert.deepEqual(readExploreFilterHistory(saved), entries.slice(0, 3));
  writeExploreFilterHistoryLimit(saved, 5);
  writeExploreFilterHistory(saved, entries);
  assert.deepEqual(readExploreFilterHistory(saved), entries);
  writeExploreFilterHistoryLimit(saved, 2);
  assert.deepEqual(readExploreFilterHistory(saved), entries.slice(0, 2));
  assert.deepEqual(rememberExploreFilters(entries, "nationality=US", "", 2), ["nationality=US", "nationality=KR"]);
  for (const value of ["", "invalid", "Infinity"]) {
    saved.setItem(EXPLORE_FILTER_HISTORY_LIMIT_KEY, value);
    assert.equal(readExploreFilterHistoryLimit(saved), EXPLORE_FILTER_HISTORY_LIMITS.default);
  }
  assert.equal(normalizeExploreFilterHistoryLimit(0), EXPLORE_FILTER_HISTORY_LIMITS.min);
  assert.equal(normalizeExploreFilterHistoryLimit(1000), EXPLORE_FILTER_HISTORY_LIMITS.max);
  assert.equal(normalizeExploreFilterHistoryLimit(3.8), 3);
});
