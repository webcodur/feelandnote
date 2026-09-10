import assert from "node:assert/strict";
import test from "node:test";
import { activeReadingSegment, isReadingTiming, type ReadingTiming } from "./reading-timing";

const fixture: ReadingTiming = {
  version: 1, sourceHash: "a".repeat(64), audioHash: "b".repeat(64), audioEtag: '"etag"', duration: 10,
  segments: [{ start: 0.2, end: 3, textStart: 0, textEnd: 10 }, { start: 3.5, end: 9.9, textStart: 11, textEnd: 23 }],
};

test("rejects malformed, overlapping or out-of-bounds timing data", () => {
  assert.equal(isReadingTiming(fixture), true);
  for (const bad of [null, {}, { ...fixture, version: 2 }, { ...fixture, sourceHash: "old" },
    { ...fixture, duration: Infinity }, { ...fixture, segments: [] },
    { ...fixture, segments: [{ start: 0, end: 11, textStart: 0, textEnd: 10 }] },
    { ...fixture, segments: [fixture.segments[1], fixture.segments[0]] },
    { ...fixture, segments: [{ ...fixture.segments[0], textStart: -1 }] }]) {
    assert.equal(isReadingTiming(bad), false);
  }
});

test("tracks media position across seeking and pause, clears in gaps and on stop", () => {
  assert.equal(activeReadingSegment(fixture, 1, "playing"), fixture.segments[0]);
  assert.equal(activeReadingSegment(fixture, 7, "paused"), fixture.segments[1]);
  assert.equal(activeReadingSegment(fixture, 1, "loading"), fixture.segments[0]);
  assert.equal(activeReadingSegment(fixture, 3.2, "playing"), null);
  assert.equal(activeReadingSegment(fixture, 0, "idle"), null);
  assert.equal(activeReadingSegment(fixture, 10, "playing"), null);
  assert.equal(activeReadingSegment(null, 1, "playing"), null);
});
