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

test("서사 항목 문단은 완독 정지와 교차 전환 뒤 한 화면씩 이어진다", () => {
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

test("해설 낭독 음원이 있으면 글자 점등을 낭독 길이에 맞춘다", () => {
  const caption = "가".repeat(24);
  // 글자 수 추정으로는 2초지만 낭독은 5초 → 점등도 5초로 늘어난다.
  const pages = factionSceneCaptionPageTimings(caption, 5);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].revealSec, 5);
  assert.equal(factionSceneTiming({ caption }).captionRevealSec, 2);
  assert.equal(factionSceneTiming({ caption, voiceSec: 5 }).captionRevealSec, 5);
});

test("문단이 여럿이면 정지·교차를 뺀 낭독 시간을 글자 수 비례로 나눈다", () => {
  const caption = "가".repeat(10) + "\n\n" + "나".repeat(30);
  const voiceSec = 8;
  const pages = factionSceneCaptionPageTimings(caption, voiceSec);
  const overhead =
    FACTION_SCENE_PARAGRAPH_HOLD_SEC + FACTION_SCENE_PARAGRAPH_TRANSITION_SEC;
  const revealTotal = voiceSec - overhead;

  assert.equal(pages[0].revealSec, revealTotal * 0.25);
  assert.equal(pages[1].revealSec, revealTotal * 0.75);
  // 마지막 문단 완독 시점이 낭독 끝과 일치한다.
  assert.ok(Math.abs(pages[1].completeSec - voiceSec) < 1e-9);
});

test("낭독이 문단 사이 쉼보다 짧아도 컷이 낭독을 끝까지 담는다", () => {
  const caption = "가\n\n나\n\n다";
  const timing = factionSceneTiming({ caption, voiceSec: 0.5 });
  assert.ok(
    timing.durationSec >=
      timing.captionStartSec +
        0.5 +
        FACTION_SCENE_POST_CAPTION_HOLD_SEC +
        FACTION_SCENE_EXIT_FADE_SEC,
  );
});

test("낭독 길이가 없거나 0이면 기존 글자 수 추정을 그대로 쓴다", () => {
  const caption = "가".repeat(24);
  const base = factionSceneTiming({ caption }).durationSec;
  assert.equal(factionSceneTiming({ caption, voiceSec: 0 }).durationSec, base);
  assert.equal(
    factionSceneTiming({ caption, voiceSec: Number.NaN }).durationSec,
    base,
  );
});

test("덩어리가 없으면 기존 해설 한 벌을 덩어리 하나로 정규화한다", () => {
  const caption = "가".repeat(24);
  const timing = factionSceneTiming({ caption });
  assert.equal(timing.beats.length, 1);
  assert.equal(timing.beats[0].speaker, "");
  assert.equal(timing.beats[0].showsIdentity, true);
  // 구 데이터의 해설 시작 시각과 완전히 같아야 한다.
  assert.equal(timing.beats[0].textStartSec, timing.captionStartSec);
  assert.equal(timing.beats[0].completeSec, timing.captionCompleteSec);
});

test("화자가 바뀌는 덩어리에서만 이름 자리를 새로 띄운다", () => {
  const timing = factionSceneTiming({
    beats: [
      { text: "해설이다." },
      { speaker: "세이렌", text: "이리 와요." },
      { speaker: "세이렌", text: "조금만 더 가까이." },
      { speaker: "오디세우스", text: "묶어라." },
    ],
  });
  assert.deepEqual(
    timing.beats.map((b) => b.showsIdentity),
    [true, true, false, true],
  );
  // 이름을 다시 띄우지 않는 덩어리는 교차 시간만 두고 곧장 본문으로 넘어간다.
  assert.ok(
    Math.abs(
      timing.beats[2].textStartSec -
        timing.beats[2].startSec -
        FACTION_SCENE_PARAGRAPH_TRANSITION_SEC,
    ) < 1e-9,
  );
  assert.ok(
    timing.beats[3].textStartSec - timing.beats[3].startSec >
      FACTION_SCENE_PARAGRAPH_TRANSITION_SEC,
  );
});

test("덩어리가 여럿이면 장면 길이가 마지막 덩어리까지 담는다", () => {
  const timing = factionSceneTiming({
    beats: [
      { speaker: "세이렌", text: "가".repeat(24) },
      { speaker: "오디세우스", text: "나".repeat(24) },
    ],
  });
  assert.equal(timing.captionCompleteSec, timing.beats[1].completeSec);
  assert.ok(
    timing.durationSec >=
      timing.beats[1].completeSec +
        FACTION_SCENE_POST_CAPTION_HOLD_SEC +
        FACTION_SCENE_EXIT_FADE_SEC,
  );
});

test("어느 덩어리의 음성도 컷 끝에서 잘리지 않는다", () => {
  const timing = factionSceneTiming({
    beats: [
      { speaker: "세이렌", text: "짧음", voiceSec: 12 },
      { speaker: "오디세우스", text: "짧음" },
    ],
  });
  assert.ok(
    timing.durationSec >=
      timing.beats[0].textStartSec +
        12 +
        FACTION_SCENE_POST_CAPTION_HOLD_SEC +
        FACTION_SCENE_EXIT_FADE_SEC,
  );
});

test("말 없는 이미지 컷은 덩어리 0개로 기본 길이를 쓴다", () => {
  const timing = factionSceneTiming({ beats: [] });
  assert.equal(timing.beats.length, 0);
  assert.equal(timing.durationSec, FACTION_SCENE_DEFAULT_SEC);
});
