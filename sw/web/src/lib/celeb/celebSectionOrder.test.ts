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

test("non-fiction keeps the existing section order", () => {
  const expected = [
    "introduction",
    "reading",
    "timeline",
    "library",
    "analysis",
    "connections",
    "media",
    "guestbook",
  ];

  assert.deepEqual(getCelebSectionOrder("full"), expected);
  assert.deepEqual(getCelebSectionOrder("light"), expected);
});
