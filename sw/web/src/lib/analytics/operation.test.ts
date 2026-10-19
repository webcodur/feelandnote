import assert from "node:assert/strict";
import { test } from "node:test";
import { audioFailureReason, beginOperation } from "./operation";

function recorder() {
  const events: { name: string; params: Record<string, string | number> }[] = [];
  return { events, emit: (name: string, params: Record<string, string | number>) => { events.push({ name, params }); } };
}

test("a successful playback records actual start and completion once", () => {
  const { events, emit } = recorder();
  const finish = beginOperation("dialogue_audio", "greeting", emit);
  finish("started"); finish("started"); finish("success"); finish("cancelled");
  assert.deepEqual(events.map(e => e.name), ["dialogue_audio_attempt", "dialogue_audio_started", "dialogue_audio_success"]);
});

test("a media failure after playback starts is still visible, without duplicate failures", () => {
  const { events, emit } = recorder();
  const finish = beginOperation("dialogue_audio", "quotes", emit);
  finish("started"); finish("failure", "network"); finish("failure", "playback");
  assert.deepEqual(events.map(e => e.name), ["dialogue_audio_attempt", "dialogue_audio_started", "dialogue_audio_failure"]);
  assert.equal(events.at(-1)?.params.failure_reason, "network");
  assert.equal(typeof events.at(-1)?.params.duration_ms, "number");
});

test("autoplay policy and cancellation are not service failures", () => {
  for (const result of ["blocked", "cancelled"] as const) {
    const { events, emit } = recorder();
    const finish = beginOperation("dialogue_audio", "greeting", emit);
    finish(result); finish("failure", "playback");
    assert.deepEqual(events.map(e => e.name), ["dialogue_audio_attempt", `dialogue_audio_${result}`]);
  }
});

test("missing content and failed requests remain distinct, with no raw content in telemetry", () => {
  for (const result of ["empty", "failure", "success"] as const) {
    const { events, emit } = recorder();
    const finish = beginOperation("content_brief", "selected", emit);
    finish(result, result === "failure" ? "request" : undefined);
    assert.equal(events.at(-1)?.name, `content_brief_${result}`);
    assert.deepEqual(Object.keys(events[0].params), ["kind"]);
    assert.ok(events.every(e => Object.keys(e.params).every(key => ["kind", "duration_ms", "failure_reason"].includes(key))));
  }
});

test("media error codes use fixed reason categories", () => {
  assert.deepEqual([undefined, 1, 2, 3, 4].map(audioFailureReason), ["playback", "playback", "network", "decode", "unsupported"]);
});
