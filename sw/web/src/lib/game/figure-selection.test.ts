import assert from "node:assert/strict";
import test from "node:test";
import { GAME_FIGURE_RULES, isHistoricalGameFigure, selectGameFigures } from "./figure-selection";

test("역사 인물 연대 경계와 몰년 불명·현대인 차단", () => {
  for (const date of ["-399", "-43-12-07", "220", "1519-05-02", "1920", "1920-12-31"]) {
    assert.equal(isHistoricalGameFigure(date), true, date);
  }
  for (const date of [null, "", " ", "0", "불명", "1921", "1955-04-18", "2026", "19200", "1920abc", "-unknown"]) {
    assert.equal(isHistoricalGameFigure(date), false, String(date));
  }
});

test("상한을 넓혀도 살아 있는 인물·현대인·조인 결손이 후보에 섞이지 않는다", () => {
  const rows = [
    { id: "living", profile: { death_date: null } },
    { id: "modern", profile: { death_date: "1955" } },
    { id: "missing", profile: null },
    ...Array.from({ length: GAME_FIGURE_RULES.memoryPoolSize + 50 }, (_, i) => ({
      id: `historical-${i}`, profile: { death_date: "1800" },
    })),
  ];
  const pool = selectGameFigures(rows, (row) => row.profile).slice(0, GAME_FIGURE_RULES.memoryPoolSize);
  assert.equal(pool.length, 600);
  assert.ok(pool.every((row) => row.id.startsWith("historical-")));
  assert.equal(rows.length, 653);
});

 test("실험실 대체 표본도 같은 연대 기준을 통과한다", async () => {
  const { FIXTURE_CELEBS: proximity } = await import("@/components/features/game/proximity/fixture");
  const { FIXTURE_CELEBS: moreless } = await import("@/components/features/game/moreless/fixture");
  const { getFixtureRound } = await import("@/components/features/game/redact/fixture");
  for (const pool of [proximity, moreless]) {
    assert.ok(pool.length >= 10);
    assert.ok(pool.every((p) => isHistoricalGameFigure(p.death_date)));
  }
  for (let i = 0; i < 100; i++) {
    assert.ok(isHistoricalGameFigure(getFixtureRound().birthDeath.split("–").at(-1)?.trim() ?? null));
  }
});
