import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const readSibling = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

test("content introduction keeps long prose in the document scroll", () => {
  const contentIntro = readSibling("./ContentIntro.tsx");

  assert.doesNotMatch(
    contentIntro,
    /overflow-y-auto/,
    "ContentIntro must not create a nested vertical scroll area",
  );
});

/* 감상배경은 상자 안에서 굴린다. 예전에 6줄(11.1em)로 좁혀 두는 바람에 거의 모든 글이
   상자에 갇혔고, 그걸 휠 가로채기로 풀려다 실패해 스크롤을 통째로 걷어냈다.
   되살린 지금은 상자를 넉넉히 잡는 것과 경계에서 페이지로 넘어가는 것, 둘 다 지켜야 한다. */
test("review box stays roomy enough that short reviews never scroll", () => {
  const reviewBox = readSibling("./ReviewScrollBox.tsx");

  const height = reviewBox.match(/max-h-\[([\d.]+)em\]/);
  assert(height, "ReviewScrollBox must cap the review box with an em-based max height");

  // 줄높이 1.85 기준 최소 14줄. 감상배경 열에 아홉은 이 안에 들어와 스크롤이 생기지 않는다
  const lines = Number(height[1]) / 1.85;
  assert(
    lines >= 14,
    `review box must stay at least 14 lines tall, got ${lines.toFixed(1)}`,
  );
});

test("review box lets the wheel escape to the page", () => {
  const reviewBox = readSibling("./ReviewScrollBox.tsx");

  assert.doesNotMatch(
    reviewBox,
    /overscroll-(?:y-)?(?:contain|none)/,
    "review box must not trap overscroll — the wheel has to chain to the page at the edge",
  );
  assert.doesNotMatch(
    reviewBox,
    /useWheelBoundaryPassThrough/,
    "the review box must not intercept wheel input",
  );

  const wheelHook = fileURLToPath(
    new URL("./useWheelBoundaryPassThrough.ts", import.meta.url),
  );
  assert.equal(
    existsSync(wheelHook),
    false,
    "manual non-passive wheel forwarding must stay retired",
  );
});
