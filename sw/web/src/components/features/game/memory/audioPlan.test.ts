import assert from "node:assert/strict";
import test from "node:test";
import {
  getMemoryFlipAudioPlan,
  MEMORY_RESULT_TIMING,
  MEMORY_SFX,
  showsMemorySuccessEffect,
} from "./audioPlan";

test("모든 카드 뒤집기는 같은 reveal SFX로 시작한다", () => {
  const firstCard = getMemoryFlipAudioPlan(null);
  const matchedSecondCard = getMemoryFlipAudioPlan("match");
  const mismatchedSecondCard = getMemoryFlipAudioPlan("mismatch");

  assert.deepEqual(firstCard.immediateSfxFiles, [MEMORY_SFX.reveal]);
  assert.deepEqual(matchedSecondCard.immediateSfxFiles, [MEMORY_SFX.reveal]);
  assert.deepEqual(mismatchedSecondCard.immediateSfxFiles, [MEMORY_SFX.reveal]);
});

test("판정 SFX는 즉시 뒤집기음과 분리된 지연 단계에 배치한다", () => {
  assert.deepEqual(getMemoryFlipAudioPlan("match"), {
    immediateSfxFiles: [MEMORY_SFX.reveal],
    delayedSfxFiles: [MEMORY_SFX.match],
    playDelayedMismatchTone: false,
  });
  assert.deepEqual(getMemoryFlipAudioPlan("mismatch"), {
    immediateSfxFiles: [MEMORY_SFX.reveal],
    delayedSfxFiles: [],
    playDelayedMismatchTone: true,
  });
});

test("지연 연출이 끝난 뒤에 카드 판정을 마무리한다", () => {
  const effectEndMs = MEMORY_RESULT_TIMING.effectDelayMs
    + MEMORY_RESULT_TIMING.effectTransitionMs;

  assert.ok(MEMORY_RESULT_TIMING.effectDelayMs > 0);
  assert.ok(effectEndMs < MEMORY_RESULT_TIMING.matchFinishMs);
  assert.ok(MEMORY_RESULT_TIMING.effectDelayMs < MEMORY_RESULT_TIMING.mismatchFinishMs);
});

test("어두워짐과 아래 이동은 활성화된 정답 카드에만 적용한다", () => {
  assert.equal(showsMemorySuccessEffect("match", true), true);
  assert.equal(showsMemorySuccessEffect("match", false), false);
  assert.equal(showsMemorySuccessEffect("mismatch", true), false);
  assert.equal(showsMemorySuccessEffect(null, true), false);
});

test("정답 확정 뒤 임시 판정이 지워져도 성공 연출을 유지한다", () => {
  assert.equal(showsMemorySuccessEffect(null, false, true), true);
});
