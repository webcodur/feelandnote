import assert from "node:assert/strict";
import test from "node:test";

import {
  CELEB_TIERS,
  CELEB_REALITIES,
  INDEXABLE_TIERS,
  LISTING_DEFAULT_REALITIES,
  parseCelebRealities,
  parseCelebTiers,
} from "./celeb-tiers";

test("all published figure tiers are indexable", () => {
  assert.deepEqual(INDEXABLE_TIERS, CELEB_TIERS);
});

test("celeb_tier는 파이프라인 분기만 담는다 — fiction은 폐기됐다", () => {
  assert.deepEqual(CELEB_TIERS, ["full", "light"]);
  assert.equal(parseCelebTiers("fiction"), undefined);
});

test("기본 목록은 FICTION만 뺀다 — BOTH는 실존 쪽에 걸쳐 있어 계속 노출된다", () => {
  assert.deepEqual(LISTING_DEFAULT_REALITIES, ["REAL", "BOTH"]);
  assert.ok(!LISTING_DEFAULT_REALITIES.includes("FICTION" as never));
});

test("검색은 실존 축 전체를 대상으로 한다", () => {
  assert.deepEqual(parseCelebRealities("all"), [...CELEB_REALITIES]);
  assert.deepEqual(parseCelebRealities("REAL,BOTH,FICTION"), ["REAL", "BOTH", "FICTION"]);
});
