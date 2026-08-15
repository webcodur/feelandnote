import assert from "node:assert/strict";
import test from "node:test";
import {
  FACTION_SCENE_DEFAULT_SEC,
  FACTION_SCENE_POST_CAPTION_HOLD_SEC,
  FACTION_SCENE_EXIT_FADE_SEC,
  FACTION_SCENE_PARAGRAPH_HOLD_SEC,
  FACTION_SCENE_PARAGRAPH_TRANSITION_SEC,
  factionSceneCaptionCharCount,
  factionSceneCaptionPages,
  factionSceneCaptionPageTimings,
  factionSceneTiming,
} from "./faction-scene-timing.ts";

test("수동 개행은 보존하되 점등 글자 수에는 포함하지 않는다", () => {
  assert.equal(factionSceneCaptionCharCount("첫 줄\n둘째 줄"), 7);
  assert.equal(factionSceneCaptionCharCount("첫 줄\r\n둘째 줄"), 7);
});

test("빈 줄만 다음 화면으로 나누고 단일 개행은 같은 문단에 보존한다", () => {
  assert.deepEqual(
    factionSceneCaptionPages("첫 문단\n같은 화면\n\n둘째 문단\r\n\r\n셋째 문단"),
    ["첫 문단\n같은 화면", "둘째 문단", "셋째 문단"],
  );
});

test("개별 장면 문단은 완독 정지와 교차 전환 뒤 한 화면씩 이어진다", () => {
  const pages = factionSceneCaptionPageTimings("가".repeat(12) + "\n\n" + "나".repeat(24));
  assert.equal(pages.length, 2);
  assert.equal(pages[0].revealSec, 1);
  assert.equal(pages[0].completeSec, 1);
  assert.equal(pages[1].startSec, 1 + FACTION_SCENE_PARAGRAPH_HOLD_SEC);
  assert.equal(
    pages[1].revealStartSec,
    pages[1].startSec + FACTION_SCENE_PARAGRAPH_TRANSITION_SEC,
  );
  assert.equal(pages[1].revealSec, 2);
  assert.equal(
    factionSceneTiming({ caption: "가".repeat(12) + "\n\n" + "나".repeat(24) }).captionRevealSec,
    pages[1].completeSec,
  );
});

test("해설이 없으면 기존 기본 길이를 유지한다", () => {
  assert.equal(factionSceneTiming({}).durationSec, FACTION_SCENE_DEFAULT_SEC);
});

test("해설 길이에 맞춰 완독 정지와 종료 페이드까지 확보한다", () => {
  const timing = factionSceneTiming({ caption: "가".repeat(24) });
  assert.equal(timing.captionRevealSec, 2);
  assert.equal(
    timing.durationSec,
    timing.captionCompleteSec +
      FACTION_SCENE_POST_CAPTION_HOLD_SEC +
      FACTION_SCENE_EXIT_FADE_SEC,
  );
});

test("durationSec는 자동 길이를 자르지 않는 최소 노출 시간이다", () => {
  const auto = factionSceneTiming({
    caption: "가".repeat(180),
    durationSec: 2,
  });
  assert.ok(auto.durationSec > 15);
  assert.equal(
    factionSceneTiming({ caption: "짧음", durationSec: 9 }).durationSec,
    9,
  );
});
