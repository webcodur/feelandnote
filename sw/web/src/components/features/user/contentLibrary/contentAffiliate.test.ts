import assert from "node:assert/strict";
import test from "node:test";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import { getCoupangAffiliateUrl } from "./contentAffiliate";
import { filterAndSortContents } from "./contentLibraryTypes";

function item(
  id: string,
  createdAt: string,
  affiliateUrl: unknown = null,
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

test("affiliate-first sorting is stable inside the requested content sort", () => {
  const olderLinked = item("older-linked", "2025-01-01", [
    { platform: "coupang", url: "https://link.coupang.com/a/older" },
  ]);
  const newerPlain = item("newer-plain", "2026-01-01");
  const newerLinked = item("newer-linked", "2026-02-01", [
    { platform: "coupang", url: "https://link.coupang.com/a/newer" },
  ]);

  assert.deepEqual(
    filterAndSortContents([newerPlain, olderLinked, newerLinked], "recent", true)
      .map((content) => content.id),
    ["newer-linked", "older-linked", "newer-plain"],
  );
});
