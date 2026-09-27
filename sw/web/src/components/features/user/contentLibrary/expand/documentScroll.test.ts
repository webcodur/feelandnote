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
