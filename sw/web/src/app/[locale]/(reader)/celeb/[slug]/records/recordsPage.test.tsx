import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import type { UserContentPublic, GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getAlternates } from "@/lib/seo";
import { buildCelebPageJsonLd } from "@/app/[locale]/(main)/celeb/[slug]/celebPageJsonLd";
import RecordsPageBody, { type RecordsLabels } from "./RecordsPageBody";
import { loadRecordsPage, parseRecordsPage, RECORDS_PAGE_SIZE, recordsPath } from "./recordsPageData";

const profile = { id: "figure-id", nickname: "Example", celeb_tier: "full", celeb_reality: "REAL" } as CelebBySlugProfile;
const item = (id: number): UserContentPublic => ({
  id: `record-${id}`, content_id: `work-${id}`, status: "FINISHED", is_recommended: false,
  visibility: "public", created_at: `2026-09-${String(id).padStart(2, "0")}T00:00:00Z`, source_url: `https://example.com/interview/${id}`,
  content: {
    id: `work-${id}`, type: "BOOK", title: `Book ${id}`, creator: "Author", thumbnail_url: null,
    metadata: null, user_count: null, title_ko: null, title_en: null, creator_en: null,
    isbn_en: null, thumbnail_en: null, has_en_edition: null,
  },
  public_record: { rating: null, content_preview: `감상 전문 ${id}`, content_preview_en: `Full review ${id}`, review_presets: null },
});
const response = (page: number, total = 45): GetUserContentsResponse => ({
  items: [item(page === 1 ? 1 : 21)], page, total, totalPages: Math.ceil(total / RECORDS_PAGE_SIZE), hasMore: page * RECORDS_PAGE_SIZE < total,
});
const labels: RecordsLabels = { title: "Records", back: "Back", previous: "Previous", next: "Next", page: "2 / 3", source: "Source", emptyReview: "Empty", spoiler: "Spoiler", originalLanguage: "Original", introduction: "About the work", myReview: "My review" };
const noBrief = async () => null;

test("later record pages expose full reviews, sources, and navigable pagination in server HTML", async () => {
  const calls: number[] = [];
  const data = await loadRecordsPage("example", "en", "2", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params, locale) => {
      assert.equal(params.userId, profile.id);
      assert.equal(params.limit, RECORDS_PAGE_SIZE);
      assert.equal(locale, "en");
      calls.push(params.page);
      return response(params.page);
    },
    getBrief: async (contentId) => ({
      contentId, category: "book", description: `Synopsis for ${contentId}`, releaseDate: null, metadata: null,
    }),
  });
  assert.ok(data);
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(data.descriptions, { "work-21": "Synopsis for work-21" });
  const $ = load(renderToStaticMarkup(<RecordsPageBody slug="example" locale="en" contents={data.contents} descriptions={data.descriptions} labels={labels} />));
  assert.match($("article").text(), /Full review 21/);
  assert.match($("article").text(), /Synopsis for work-21/);
  assert.equal($("article a").last().attr("href"), "https://example.com/interview/21");
  assert.equal($("a[rel=prev]").attr("href"), "/en/celeb/example/records/1");
  assert.equal($("a[rel=next]").attr("href"), "/en/celeb/example/records/3");
  assert.equal(getAlternates(recordsPath("example", 2), "en").canonical, "https://feelandnote.com/en/celeb/example/records/2");
});

test("invalid and unavailable pages resolve to not-found without arbitrary offset queries", async () => {
  for (const value of ["0", "-1", "01", "1.5", "abc", "9007199254740992"]) assert.equal(parseRecordsPage(value), null);
  const calls: number[] = [];
  const dependencies = {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async ({ page }: { page: number }) => { calls.push(page); return response(page); },
    getBrief: noBrief,
  };
  assert.equal(await loadRecordsPage("example", "ko", "01", dependencies), null);
  assert.deepEqual(calls, []);
  assert.equal(await loadRecordsPage("example", "ko", "99999", dependencies), null);
  assert.deepEqual(calls, [1]);
  assert.equal(await loadRecordsPage("example", "ko", "1", {
    ...dependencies, getProfile: async () => ({ success: true, data: { ...profile, celeb_tier: "light" as const } }),
  }), null);
  assert.deepEqual(calls, [1]);
});

test("last page has no next link and spoiler content stays concealed", () => {
  const contents = response(3);
  contents.items[0].public_record!.is_spoiler = true;
  const $ = load(renderToStaticMarkup(<RecordsPageBody slug="example" locale="ko" contents={contents} descriptions={{}} labels={labels} />));
  assert.equal($("a[rel=next]").length, 0);
  assert.equal($("a[rel=prev]").attr("href"), "/celeb/example/records/2");
  assert.match($("article").text(), /Spoiler/);
  assert.doesNotMatch($("article").text(), /감상 전문|Full review/);
});

test("detail JSON-LD lists exactly the four visible seed works in display order", () => {
  const contents = [item(4), item(3), item(2), item(1)];
  for (const locale of ["ko", "en"]) {
    const json = buildCelebPageJsonLd({ profile, slug: "example", locale, pageTitle: "Example", contents, figureBooks: [], externalLinks: [] });
    const graph = JSON.parse(JSON.stringify(json))["@graph"] as { "@type": string; itemListElement?: { item: { name: string; url: string } }[] }[];
    const entries = graph.find(node => node["@type"] === "ItemList")!.itemListElement!;
    const $ = load(renderToStaticMarkup(<RecordsPageBody slug="example" locale={locale} contents={{ ...response(1), items: contents }} descriptions={{}} labels={labels} />));
    assert.deepEqual(entries.map(entry => entry.item.name), $("article h2").map((_, node) => $(node).text()).get());
    assert.equal(entries.length, 4);
    assert.deepEqual(entries.map(entry => new URL(entry.item.url).pathname), $("article h2 a").map((_, node) => $(node).attr("href")).get());
  }
});
