import assert from "node:assert/strict";
import test from "node:test";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";
import { filterCurators, getCuratorCountries, parseCuratorFilters } from "./curatorExplore";

const list = (title: string, contentType: string, topics: string[], itemCount: number): CuratedListSummary => ({
  title, contentType, topics, itemCount, slug: title, curatorSlug: "test", description: null,
  publishedYear: null, edition: null, seriesKey: null, isRanked: false, isAnnual: false, coverImageUrl: null, covers: [],
});
const curator = (name: string, kind: string, lists: CuratedListSummary[], country: string | null = null): CuratedHub["curators"][number] => ({
  name, kind, lists, slug: name, country, foundedYear: null, description: null,
  logoUrl: null, homepageUrl: null, listCount: lists.length,
});
const scope = [
  curator("Alpha University", "university", [list("World literature", "BOOK", ["literature"], 20), list("Poetry", "BOOK", ["literature"], 10), list("Screen classics", "VIDEO", ["cinema"], 40)], "US"),
  curator("Beta Review", "media", [list("World cinema", "VIDEO", ["cinema"], 60)], "GB"),
  curator("Gamma University", "university", [list("Science reading", "BOOK", ["science"], 100)], "KR"),
];
const available = { medias: ["BOOK", "VIDEO"], kinds: ["university", "media"], topics: ["literature", "cinema", "science"], countries: ["US", "GB", "KR"] };
const filters = (query = "") => parseCuratorFilters(new URLSearchParams(query), available);

test("institution search keeps its lists; list search keeps only matching lists", () => {
  assert.equal(filterCurators(scope, filters("search=alpha"), "en")[0].lists.length, 2);
  const result = filterCurators(scope, filters("search=world"), "en");
  assert.deepEqual(result.map(c => [c.name, c.lists.length]), [["Alpha University", 1]]);
  assert.equal(filterCurators(scope, filters("search=world&media=VIDEO"), "en")[0].name, "Beta Review");
  assert.equal(scope[0].lists.length, 3);
});

test("media, institution kind and topic intersect before counts and sorting", () => {
  const result = filterCurators(scope, filters("media=VIDEO&kind=university&topic=cinema"), "en");
  assert.deepEqual(result.map(c => [c.name, c.listCount, c.lists[0].contentType]), [["Alpha University", 1, "VIDEO"]]);
  assert.deepEqual(filterCurators(scope, filters("media=BOOK&topic=cinema"), "en"), []);
  assert.equal(filterCurators(scope, filters("sort=works&media=BOOK"), "en")[0].name, "Gamma University");
});

test("query parsing rejects unknown facets and invalid pages; Unicode search normalizes", () => {
  assert.deepEqual(filters("page=Infinity&sort=bad&kind=bad&media=bad&topic=bad&country=bad"), filters());
  assert.equal(filters("page=-1").page, 1);
  assert.equal(filterCurators(scope, { ...filters(), search: "ＡＬＰＨＡ" }, "en")[0].name, "Alpha University");
});

test("a media mode is always selected, including legacy all queries", () => {
  for (const query of ["", "media=all", "media=bad"]) {
    assert.equal(filters(query).media, "BOOK");
    assert.ok(filterCurators(scope, filters(query), "en").every(c => c.lists.every(l => l.contentType === "BOOK")));
  }
  assert.equal(parseCuratorFilters(new URLSearchParams(), { ...available, medias: ["VIDEO"] }).media, "VIDEO");
  assert.equal(parseCuratorFilters(new URLSearchParams("media=VIDEO&topic=literature&kind=university"), {
    medias: ["BOOK", "VIDEO"], kinds: ["media"], topics: ["cinema"], countries: ["GB"],
  }).topic, "all");
});

test("country intersects with media, kind and topic without inventing a country for missing data", () => {
  const result = filterCurators(scope, filters("media=VIDEO&kind=media&topic=cinema&country=GB"), "en");
  assert.deepEqual(result.map(c => c.name), ["Beta Review"]);
  assert.deepEqual(filterCurators(scope, filters("media=VIDEO&country=KR"), "en"), []);
  assert.deepEqual(getCuratorCountries([...scope, scope[0], curator("No country", "organization", [])]), ["GB", "KR", "US"]);
  assert.equal(parseCuratorFilters(new URLSearchParams("media=VIDEO&country=KR"), { ...available, countries: ["GB", "US"] }).country, "all");
});
