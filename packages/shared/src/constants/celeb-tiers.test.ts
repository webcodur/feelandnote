import assert from "node:assert/strict";
import test from "node:test";

import {
  CELEB_TIERS,
  INDEXABLE_TIERS,
  LISTING_DEFAULT_TIERS,
} from "./celeb-tiers";

test("all published figure tiers are indexable", () => {
  assert.deepEqual(INDEXABLE_TIERS, CELEB_TIERS);
});

test("fiction remains opt-in for ordinary directory listings", () => {
  assert.deepEqual(LISTING_DEFAULT_TIERS, ["full", "light"]);
});
