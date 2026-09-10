import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";

import type { UserContentPublic, GetUserContentsResponse } from "@/actions/contents/getUserContents";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getAlternates } from "@/lib/seo";
import { buildCelebPageJsonLd } from "@/app/[locale]/(main)/celeb/[slug]/celebPageJsonLd";

import RecordsPageBody, { type RecordsLabels } from "./RecordsPageBody";
import { loadRecords, recordsPath } from "./recordsPageData";

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

test("full records load fetches and renders every record without pagination", async () => {
  const items = [item(1), item(2), item(3)];
  const calls: Array<{ page: number; limit: number }> = [];
  const data = await loadRecords("example", "en", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params, locale) => {
      assert.equal(params.userId, profile.id);
      assert.equal(params.sortBy, "recent");
      assert.equal(locale, "en");
      calls.push({ page: params.page, limit: params.limit });
      return params.limit === 1 ? response([items[0]], items.length) : response(items);
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
    { page: 1, limit: 1 },
    { page: 1, limit: 3 },
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

test("large records are combined into one list after internal fetch batches", async () => {
  const items = Array.from({ length: 103 }, (_, index) => item(index + 1));
  const calls: Array<{ page: number; limit: number }> = [];
  const data = await loadRecords("example", "ko", {
    getProfile: async () => ({ success: true, data: profile }),
    getContents: async (params) => {
      calls.push({ page: params.page, limit: params.limit });
      if (params.limit === 1) return response([items[0]], items.length);
      const start = (params.page - 1) * 100;
      return response(items.slice(start, start + params.limit), items.length);
    },
    getBrief: async (contentId) => ({
      contentId,
      category: "book",
      description: null,
      releaseDate: null,
      metadata: null,
    }),
  });

  assert.ok(data);
  assert.deepEqual(calls, [
    { page: 1, limit: 1 },
    { page: 1, limit: 100 },
    { page: 2, limit: 100 },
  ]);
  assert.equal(data.contents.items.length, items.length);
  assert.equal(data.contents.total, items.length);
  assert.deepEqual(
    data.contents.items.map(({ content_id }) => content_id),
    items.map(({ content_id }) => content_id),
  );
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
