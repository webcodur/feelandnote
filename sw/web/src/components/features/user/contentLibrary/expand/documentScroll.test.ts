import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const readSibling = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

test("expanded content keeps long prose in the document scroll", () => {
  const contentIntro = readSibling("./ContentIntro.tsx");
  const expandCard = readSibling("./ExpandCard.tsx");

  for (const [name, source] of [
    ["ContentIntro", contentIntro],
    ["ExpandCard", expandCard],
  ] as const) {
    assert.doesNotMatch(
      source,
      /overflow-y-auto/,
      `${name} must not create a nested vertical scroll area`,
    );
    assert.doesNotMatch(
      source,
      /useWheelBoundaryPassThrough/,
      `${name} must not intercept wheel input`,
    );
  }

  const wheelHook = fileURLToPath(
    new URL("./useWheelBoundaryPassThrough.ts", import.meta.url),
  );
  assert.equal(
    existsSync(wheelHook),
    false,
    "manual non-passive wheel forwarding must stay retired",
  );
});
