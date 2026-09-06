import assert from "node:assert/strict";
import test from "node:test";
import type { FigureBookContent, FigureBookEdition } from "@/actions/figure-books/getFigureBooks";
import { mergeCreativeWorks } from "./mergeCreativeWorks";
import type { LiveWorkItem } from "./types";

function book(overrides: Partial<FigureBookContent> = {}): FigureBookContent {
  return {
    id: "content-iliad", title: "일리아스", creator: "호메로스", thumbnailUrl: null,
    type: "BOOK", category: "book", relationType: "related", appearanceDescription: null,
    editions: [], ...overrides,
  };
}

function work(overrides: Partial<LiveWorkItem> = {}): LiveWorkItem {
  return {
    id: "Q1", title_en: "Iliad", title_ko: "일리아스", work_type: "BOOK", role: "author",
    release_year: null, props: [], image: null, genre: null, genre_ko: null, imdb_id: null,
    poster: null, duration: null, publisher: null, pages: null, isbn: null, record_label: null,
    music_duration: null, collection: null, collection_ko: null, material: null,
    material_ko: null, location: null, location_ko: null, ...overrides,
  };
}

test("confirmed books lead the combined list and retain their content IDs and edition data", () => {
  const first = book();
  const second = book({ id: "content-odyssey", title: "오디세이아" });
  const third = work({ id: "Q3", title_en: "Homeric Hymns", title_ko: "호메로스 찬가" });
  const merged = mergeCreativeWorks([first, second], [work(), third]);
  assert.deepEqual(merged.map((item) => [item.source, item.id]), [
    ["authored", "content-iliad"], ["authored", "content-odyssey"], ["wikidata", "Q3"],
  ]);
  assert.equal(merged[0].source === "authored" && merged[0].book, first);
});

test("a known Wikidata ID removes the duplicate even when its titles differ", () => {
  assert.equal(mergeCreativeWorks(
    [book({ wikidataQid: "Q1" })],
    [work({ title_en: "A different translation", title_ko: "다른 번역 제목" })],
  ).length, 1);
});

test("the same ISBN matches while preserving the actual purchase edition", () => {
  const edition: FigureBookEdition = {
    id: 1, title: "일리아스", creator: "호메로스", description: null,
    isbn: "978-0-14-027536-0", publisher: "Penguin", thumbnailUrl: "https://example.com/cover.jpg",
    releaseDate: null, editionKind: null, textScope: null, sortOrder: 0,
    platform: "amazon", purchaseUrl: "https://example.com/buy",
  };
  const merged = mergeCreativeWorks([book({ editions: [edition] })], [
    work({ title_en: "Alternate Iliad Title", title_ko: "", isbn: "9780140275360" }),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source === "authored" && merged[0].book.editions[0], edition);
});

test("the exact title in either locale matches, allowing only casing and whitespace normalization", () => {
  assert.equal(mergeCreativeWorks(
    [book({ titleEn: "The Iliad" })],
    [work({ title_en: "  THE   ILIAD ", title_ko: "" })],
  ).length, 1);
  assert.equal(mergeCreativeWorks(
    [book({ title: "오디세이아", workTitle: "Odyssey" })],
    [work({ title_en: "Odyssey", title_ko: "" })],
  ).length, 1);
});

test("a film or music with the same title remains a separate creative work", () => {
  const merged = mergeCreativeWorks([book()], [
    work(),
    work({ id: "Q2", work_type: "VIDEO", role: "director" }),
    work({ id: "Q3", work_type: "MUSIC", role: "composer" }),
  ]);
  assert.deepEqual(merged.map((item) => item.work_type), ["BOOK", "VIDEO", "MUSIC"]);
});

test("Korean title spacing differences match without losing volume numbers", () => {
  const merged = mergeCreativeWorks(
    [book({ id: "content-pale-blue-dot", title: "창백한 푸른점" })],
    [work({ id: "Q5231098", title_en: "Pale Blue Dot", title_ko: "창백한 푸른 점" })],
  );
  assert.deepEqual(merged.map((item) => item.id), ["content-pale-blue-dot"]);
  assert.deepEqual(mergeCreativeWorks([book({ title: "일리아스 1" })], [
    work({ id: "Q1", title_ko: "일리아스1" }),
    work({ id: "Q2", title_ko: "일리아스2" }),
  ]).map((item) => item.id), ["content-iliad", "Q2"]);
});

test("English-only titles keep word boundaries", () => {
  assert.equal(mergeCreativeWorks(
    [book({ title: "TheIliad" })],
    [work({ title_en: "The Iliad", title_ko: "" })],
  ).length, 2);
});

test("volume numbers, collections, subtitles, and punctuation are not erased to force a match", () => {
  const titles = ["일리아스 1", "일리아스 전집", "일리아스: 해설", "일리아스 (완역판)"];
  const live = titles.map((title, index) => work({ id: `Q${index}`, title_en: "", title_ko: title }));
  assert.equal(mergeCreativeWorks([book()], live).length, 5);
  assert.equal(mergeCreativeWorks([book({ title: "일리아스 1" })], [work()]).length, 2);
});

test("confirmed books survive an empty, unavailable, or not-yet-loaded Wikidata result", () => {
  const merged = mergeCreativeWorks([book()], []);
  assert.deepEqual(merged.map((item) => item.id), ["content-iliad"]);
  assert.deepEqual(mergeCreativeWorks([], [work()]).map((item) => item.id), ["Q1"]);
  assert.deepEqual(mergeCreativeWorks([], []), []);
});

test("missing identifiers do not merge unrelated works", () => {
  assert.equal(mergeCreativeWorks([book({ title: "" })], [work({ title_en: "", title_ko: "" })]).length, 2);
});
