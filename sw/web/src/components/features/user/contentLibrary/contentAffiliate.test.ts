import assert from "node:assert/strict";
import test from "node:test";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import { getCoupangAffiliateUrl } from "./contentAffiliate";
import { filterAndSortContents } from "./contentLibraryTypes";

function item(
  id: string,
  createdAt: string,
  affiliateUrl: unknown = null,
  isbnKo: string | null = null,
): UserContentWithContent {
  return {
    id,
    content_id: id,
    created_at: createdAt,
    content: {
      id,
      type: "BOOK",
      title: id,
      creator: null,
      isbn_ko: isbnKo,
      affiliate_url: affiliateUrl,
    },
  } as UserContentWithContent;
}

test("accepts only a valid web URL from a book's Coupang affiliate entry", () => {
  const content = item("linked", "2026-01-01", [
    { platform: "coupang", url: "https://link.coupang.com/a/example" },
  ]).content;

  assert.equal(getCoupangAffiliateUrl(content), "https://link.coupang.com/a/example");
  assert.equal(getCoupangAffiliateUrl({ ...content, type: "VIDEO" }), null);
  assert.equal(getCoupangAffiliateUrl({
    ...content,
    affiliate_url: [{ platform: "coupang", url: "javascript:alert(1)" }],
  }), null);
});

test("edited accounts lead the default shelf while explicit recent and title orders remain intact", () => {
  const edited = { ...item("z-edited", "2020-01-01"), review_approved_at: "2026-10-07T00:00:00Z" };
  const recent = item("a-new", "2026-01-01", null, "978-89-6626-095-9");
  assert.deepEqual(filterAndSortContents([recent, edited], "reviewed", true).map(x => x.id), ["z-edited", "a-new"]);
  assert.deepEqual(filterAndSortContents([recent, edited], "recent").map(x => x.id), ["a-new", "z-edited"]);
  assert.deepEqual(filterAndSortContents([recent, edited], "title").map(x => x.id), ["a-new", "z-edited"]);
});

test("purchasable-first sorting puts YES24 books (Korean ISBN or Coupang backup) ahead, stable inside the requested sort", () => {
  const olderLinked = item("older-linked", "2025-01-01", [
    { platform: "coupang", url: "https://link.coupang.com/a/older" },
  ]);
  const newerPlain = item("newer-plain", "2026-01-01");
  const newestIsbn = item("newest-isbn", "2026-03-01", null, "978-89-6626-095-9");
  const newerLinked = item("newer-linked", "2026-02-01", [
    { platform: "coupang", url: "https://link.coupang.com/a/newer" },
  ]);
  const badIsbn = item("bad-isbn", "2026-04-01", null, "9788966260950");

  assert.deepEqual(
    filterAndSortContents([newerPlain, olderLinked, badIsbn, newerLinked, newestIsbn], "recent", true)
      .map((content) => content.id),
    ["newest-isbn", "newer-linked", "older-linked", "bad-isbn", "newer-plain"],
  );
});
