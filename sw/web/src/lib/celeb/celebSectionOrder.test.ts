import assert from "node:assert/strict";
import test from "node:test";

import { getCelebSectionOrder } from "../../app/[locale]/(main)/celeb/[slug]/celebSectionChapters";

test("FICTION reality uses story-first section order without analysis", () => {
  assert.deepEqual(getCelebSectionOrder("FICTION"), [
    "introduction",
    "personGuide",
    "virtualMonologue",
    "connections",
    "affiliateBooks",
    "relatedFigures",
    "guestbook",
  ]);
});

test("REAL and BOTH reality keep reviews before the unified books section", () => {
  const expected = [
    "introduction",
    "personGuide",
    "virtualMonologue",
    "library",
    "affiliateBooks",
    "analysis",
    "connections",
    "relatedFigures",
    "guestbook",
  ];

  assert.deepEqual(getCelebSectionOrder("REAL"), expected);
  assert.deepEqual(getCelebSectionOrder("BOTH"), expected);
});
