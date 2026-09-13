import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

import type { UserContentPublic, GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getAlternates } from "@/lib/seo";
import { buildCelebPageJsonLd } from "@/app/[locale]/(main)/celeb/[slug]/celebPageJsonLd";

import RecordsPageBody, { type RecordsLabels } from "./RecordsPageBody";
import { loadRecords, parseRecordsPage, RECORDS_PAGE_SIZE, recordsPath } from "./recordsPageData";

const profile = {
  id: "figure-id",
  nickname: "Example",
  celeb_tier: "full",
  celeb_reality: "REAL",
} as CelebBySlugProfile;

const item = (id: number): UserContentPublic => ({
  id: `record-${id}`,
  content_id: `work-${id}`,
  status: "FINISHED",
  is_recommended: false,
  visibility: "public",
  created_at: `2026-09-${String(id).padStart(2, "0")}T00:00:00Z`,
  source_url: `https://example.com/interview/${id}`,
  content: {
    id: `work-${id}`,
    type: "BOOK",
    title: `Book ${id}`,
    creator: "Author",
    thumbnail_url: null,
    metadata: null,
    user_count: null,
    title_ko: null,
    title_en: null,
    creator_en: null,
    isbn_en: null,
    thumbnail_en: null,
    has_en_edition: null,
  },
  public_record: {
    rating: null,
    content_preview: `감상 전문 ${id}`,
    content_preview_en: `Full review ${id}`,
    review_presets: null,
  },
});

const labels: RecordsLabels = {
  title: "Records",
  back: "Back",
  previous: "Previous",
  next: "Next",
  page: "Page 1 of 1",
  source: "Source",
  emptyReview: "Empty",
  spoiler: "Spoiler",
  originalLanguage: "Original",
  introduction: "About the work",
  myReview: "My review",
};

const response = (
  items: UserContentPublic[],
  total = items.length,
): GetUserContentsResponse => ({
  items,
  page: 1,
  total,
  totalPages: total > 0 ? 1 : 0,
  hasMore: false,
});

test("a small archive renders all records with no pagination", async () => {
  const items = [item(1), item(2), item(3)];
  const calls: Array<{ page: number; limit: number }> = [];
  const data = await loadRecords("example", "en", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params, locale) => {
      assert.equal(params.userId, profile.id);
      assert.equal(params.sortBy, "recent");
      assert.equal(locale, "en");
      calls.push({ page: params.page, limit: params.limit });
      return response(items);
    },
    getBrief: async (contentId) => ({
      contentId,
      category: "book",
      description: `Synopsis for ${contentId}`,
      releaseDate: null,
      metadata: null,
    }),
  });

  assert.ok(data);
  assert.deepEqual(calls, [
    { page: 1, limit: RECORDS_PAGE_SIZE },
  ]);
  assert.deepEqual(Object.keys(data.descriptions), ["work-1", "work-2", "work-3"]);

  const $ = load(renderToStaticMarkup(
    <RecordsPageBody
      slug="example"
      locale="en"
      contents={data.contents}
      descriptions={data.descriptions}
      labels={labels}
    />,
  ));
  assert.equal($("article").length, 3);
  assert.match($("article").text(), /Full review 1/);
  assert.match($("article").text(), /Full review 3/);
  assert.equal($("a[rel=prev]").length, 0);
  assert.equal($("a[rel=next]").length, 0);
  assert.equal(getAlternates(recordsPath("example"), "en").canonical, "https://feelandnote.com/en/celeb/example/records");
});

test("large archives validate bounds with the first page and load only displayed descriptions", async () => {
  const items = Array.from({ length: 103 }, (_, index) => item(index + 1));
  const calls: Array<{ page: number; limit: number }> = [];
  const briefCalls: string[] = [];
  const data = await loadRecords("example", "ko", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params) => {
      calls.push({ page: params.page, limit: params.limit });
      const start = (params.page - 1) * params.limit;
      return {
        ...response(items.slice(start, start + params.limit), items.length),
        page: params.page,
        totalPages: Math.ceil(items.length / params.limit),
        hasMore: start + params.limit < items.length,
      };
    },
    getBrief: async (contentId) => {
      briefCalls.push(contentId);
      return null;
    },
  }, 2);

  assert.ok(data);
  assert.deepEqual(calls, [
    { page: 1, limit: RECORDS_PAGE_SIZE },
    { page: 2, limit: RECORDS_PAGE_SIZE },
  ]);
  assert.equal(data.contents.items.length, RECORDS_PAGE_SIZE);
  assert.equal(data.contents.total, items.length);
  assert.deepEqual(
    data.contents.items.map(({ content_id }) => content_id),
    items.slice(RECORDS_PAGE_SIZE, RECORDS_PAGE_SIZE * 2).map(({ content_id }) => content_id),
  );
  assert.deepEqual(briefCalls, data.contents.items.map(({ content_id }) => content_id));
  for (const locale of ["ko", "en"] as const) {
    const prefix = locale === "en" ? "/en" : "";
    const $ = load(renderToStaticMarkup(
      <RecordsPageBody slug="example" locale={locale} contents={data.contents} descriptions={{}} labels={labels} />,
    ));
    assert.equal($("article").length, RECORDS_PAGE_SIZE);
    assert.equal($("article").first().attr("data-record-index"), String(RECORDS_PAGE_SIZE));
    assert.equal($("a[rel=prev]").first().attr("href"), `${prefix}/celeb/example/records`);
    assert.equal($("a[rel=next]").first().attr("href"), `${prefix}/celeb/example/records/3`);
    assert.equal($("a[title=Back]").attr("href"), `${prefix}/celeb/example?instant=1#library`);
    const alternates = getAlternates(recordsPath("example", 2), locale);
    assert.equal(alternates.canonical, `https://feelandnote.com${prefix}/celeb/example/records/2`);
    assert.equal(alternates.languages.en, "https://feelandnote.com/en/celeb/example/records/2");
    assert.equal(alternates.languages.ko, "https://feelandnote.com/celeb/example/records/2");
  }
});

test("focus links resolve the containing page without serializing the whole archive", async () => {
  const items = Array.from({ length: 268 }, (_, index) => item(index + 1));
  const calls: Array<{ page: number; limit: number }> = [];
  const dependencies = {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params: { page: number; limit: number }) => {
      calls.push({ page: params.page, limit: params.limit });
      const start = (params.page - 1) * params.limit;
      return {
        ...response(items.slice(start, start + params.limit), items.length),
        page: params.page,
        totalPages: Math.ceil(items.length / params.limit),
        hasMore: start + params.limit < items.length,
      };
    },
    getBrief: async () => null,
  };
  const data = await loadRecords("example", "ko", dependencies, 1, "work-268");
  assert.ok(data);
  assert.equal(data.contents.page, 14);
  assert.equal(data.contents.items.length, 8);
  assert.equal(data.contents.items.at(-1)?.content_id, "work-268");
  assert.equal(Object.keys(data.descriptions).length, 8);
  assert.deepEqual(calls, [
    { page: 1, limit: RECORDS_PAGE_SIZE },
    { page: 1, limit: 100 },
    { page: 2, limit: 100 },
    { page: 3, limit: 100 },
    { page: 14, limit: RECORDS_PAGE_SIZE },
  ]);
  const $ = load(renderToStaticMarkup(
    <RecordsPageBody slug="example" locale="ko" contents={data.contents} descriptions={{}} labels={labels} />,
  ));
  assert.equal($("a[rel=next]").length, 0);
  assert.equal($("a[rel=prev]").first().attr("href"), "/celeb/example/records/13");
  assert.equal(await loadRecords("example", "ko", dependencies, 15), null);
  const missingFocus = await loadRecords("example", "ko", dependencies, 1, "missing-work");
  assert.equal(missingFocus?.contents.page, 1);
});

test("invalid pagination paths are rejected rather than returning duplicate first pages", () => {
  assert.equal(parseRecordsPage(), 1);
  assert.equal(parseRecordsPage("1"), 1);
  assert.equal(parseRecordsPage("14"), 14);
  for (const value of ["0", "-1", "01", "1.2", "2abc", "9007199254740992"]) {
    assert.equal(parseRecordsPage(value), null);
  }
});

test("out-of-range paths never reach a database range request that would throw", async () => {
  const items = Array.from({ length: 268 }, (_, index) => item(index + 1));
  const calls: number[] = [];
  const briefCalls: string[] = [];
  const dependencies = {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async ({ page, limit }: { page: number; limit: number }) => {
      calls.push(page);
      const start = (page - 1) * limit;
      if (start >= items.length) throw new Error("Requested range not satisfiable");
      return {
        ...response(items.slice(start, start + limit), items.length),
        page,
        totalPages: Math.ceil(items.length / limit),
      };
    },
    getBrief: async (id: string) => { briefCalls.push(id); return null; },
  };

  assert.equal(await loadRecords("example", "ko", dependencies, 15), null);
  assert.equal(await loadRecords("example", "ko", dependencies, 999999), null);
  assert.deepEqual(calls, [1, 1]);
  assert.deepEqual(briefCalls, []);

  const focused = await loadRecords("example", "ko", dependencies, 999999, "work-268");
  assert.equal(focused?.contents.page, 14);
  assert.equal(focused?.contents.items.at(-1)?.content_id, "work-268");
  assert.equal(await loadRecords("example", "ko", dependencies, 999999, "missing-work"), null);
  assert.ok(calls.every((page) => page <= 14));
});

test("database failures on existing pages propagate instead of becoming not found", async () => {
  const databaseError = new Error("Database connection unavailable");
  await assert.rejects(loadRecords("example", "ko", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async ({ page }) => {
      if (page === 2) throw databaseError;
      return { ...response([item(1)], 268), totalPages: 14 };
    },
    getBrief: async () => null,
  }, 2), (error) => error === databaseError);
});

test("empty and light figures do not produce a records page", async () => {
  const calls: number[] = [];
  const dependencies = {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async ({ page }: { page: number }) => {
      calls.push(page);
      return response([], 0);
    },
    getBrief: async () => null,
  };

  assert.equal(await loadRecords("example", "ko", dependencies), null);
  assert.deepEqual(calls, [1]);
  assert.equal(await loadRecords("example", "ko", {
    ...dependencies,
    getProfile: async () => ({
      success: true,
      data: { ...profile, celeb_tier: "light" as const },
    }),
  }), null);
});

test("record list keeps all visible works in JSON-LD display order", () => {
  const contents = [item(4), item(3), item(2), item(1)];
  for (const locale of ["ko", "en"]) {
    const json = buildCelebPageJsonLd({
      profile,
      slug: "example",
      locale,
      pageTitle: "Example",
      contents,
      figureBooks: [],
      externalLinks: [],
    });
    const graph = JSON.parse(JSON.stringify(json))[
      "@graph"
    ] as { "@type": string; itemListElement?: { item: { name: string; url: string } }[] }[];
    const entries = graph.find((node) => node["@type"] === "ItemList")!.itemListElement!;
    const $ = load(renderToStaticMarkup(
      <RecordsPageBody
        slug="example"
        locale={locale}
        contents={response(contents)}
        descriptions={{}}
        labels={labels}
      />,
    ));
    assert.deepEqual(
      entries.map((entry) => entry.item.name),
      $("article h2").map((_, node) => $(node).text()).get(),
    );
    assert.equal(entries.length, 4);
    assert.deepEqual(
      entries.map((entry) => new URL(entry.item.url).pathname),
      $("article h2 a").map((_, node) => $(node).attr("href")).get(),
    );
  }
});
