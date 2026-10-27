import assert from "node:assert/strict";
import test from "node:test";

import { getCelebSectionOrder } from "../../app/[locale]/(main)/celeb/[slug]/celebSectionChapters";

test("FICTION reality uses story-first section order without analysis", () => {
  assert.deepEqual(getCelebSectionOrder("FICTION"), [
    "introduction",
    "personGuide",
    "virtualMonologue",
    "connections",
    "library",
    "relatedFigures",
    "relatedFactions",
    "guestbook",
  ]);
});

test("REAL and BOTH reality use one shelf for reviews and reference books", () => {
  const expected = [
    "introduction",
    "personGuide",
    "readingWay",
    "virtualMonologue",
    "library",
    "filmography",
    "analysis",
    "connections",
    "relatedFigures",
    "relatedFactions",
    "guestbook",
  ];

  assert.deepEqual(getCelebSectionOrder("REAL"), expected);
  assert.deepEqual(getCelebSectionOrder("BOTH"), expected);
});
