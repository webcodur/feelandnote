import assert from "node:assert/strict";
import test from "node:test";

import { getCelebSectionOrder } from "../../app/[locale]/(main)/celeb/[slug]/celebSectionChapters";

test("FICTION reality uses story-first section order without analysis", () => {
  assert.deepEqual(getCelebSectionOrder("FICTION"), [
    "introduction",
    "reading",
    "timeline",
    "connections",
    "sourceWorks",
    "media",
    "guestbook",
  ]);
});

test("REAL and BOTH reality keep records and add person books as a separate section", () => {
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

  assert.deepEqual(getCelebSectionOrder("REAL"), expected);
  assert.deepEqual(getCelebSectionOrder("BOTH"), expected);
});
