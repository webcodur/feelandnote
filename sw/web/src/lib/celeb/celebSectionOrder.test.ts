import assert from "node:assert/strict";
import test from "node:test";

import { getCelebSectionOrder } from "../../app/[locale]/(main)/celeb/[slug]/celebSectionChapters";

test("fiction uses story-first section order without analysis", () => {
  assert.deepEqual(getCelebSectionOrder("fiction"), [
    "introduction",
    "reading",
    "timeline",
    "connections",
    "sourceWorks",
    "media",
    "guestbook",
  ]);
});

test("non-fiction keeps records and adds person books as a separate section", () => {
  const expected = [
    "introduction",
    "reading",
    "timeline",
    "library",
    "sourceWorks",
    "analysis",
    "connections",
    "media",
    "guestbook",
  ];

  assert.deepEqual(getCelebSectionOrder("full"), expected);
  assert.deepEqual(getCelebSectionOrder("light"), expected);
});
