import assert from "node:assert/strict";
import test from "node:test";
import { exploreModeResumeHref, parseAtlasCatalogPreferences } from "./exploreModeResume";
import type { RecentHistoryItem } from "./recent-history";

const history: RecentHistoryItem[] = [
  { kind: "faction", id: "lab", title: "OpenAI", href: "/explore/faction/openai?group=founders&person=sam", thumbnail: null, visitedAt: 2 },
  { kind: "myth", id: "odyssey", title: "Odyssey", href: "/explore/myth/homer-odyssey?group=heroes", thumbnail: null, visitedAt: 1 },
];

test("each mode resumes its own last entry and group when another mode was visited more recently", () => {
  assert.equal(exploreModeResumeHref("myth", history, ""), "/explore/myth/homer-odyssey?group=heroes");
  assert.equal(exploreModeResumeHref("faction", history, ""), "/explore/faction/openai?group=founders");
  assert.equal(exploreModeResumeHref("figures", history, ""), "/explore");
});

test("existing last-selection cookies work without a local recent-history record", () => {
  const cookies = "fn-last-myth=homer-odyssey; fn-last-faction=openai";
  assert.equal(exploreModeResumeHref("myth", [], cookies), "/explore/myth/homer-odyssey");
  assert.equal(exploreModeResumeHref("faction", [], cookies), "/explore/faction/openai");
});

test("invalid cookie paths do not redirect outside an entry and preserve the last catalog filter", () => {
  assert.equal(exploreModeResumeHref("myth", [], "fn-last-myth=%E0%A4%A", { section: "greek", query: "Odyssey" }), "/explore?mode=myth&section=greek&q=Odyssey");
  assert.equal(exploreModeResumeHref("faction", [], "fn-last-faction=..%2F..%2Flogin"), "/explore?mode=faction");
});

test("stored catalog filters keep the modes independent and discard malformed storage", () => {
  const raw = JSON.stringify({ myth: { section: "greek", query: "Odyssey" }, faction: { section: "ai", query: "OpenAI" } });
  assert.deepEqual(parseAtlasCatalogPreferences(raw), { myth: { section: "greek", query: "Odyssey" }, faction: { section: "ai", query: "OpenAI" } });
  assert.deepEqual(parseAtlasCatalogPreferences('{"myth":{"section":4,"query":false}}'), {});
  for (const invalid of [null, "false", "[]", "broken"]) assert.deepEqual(parseAtlasCatalogPreferences(invalid), {});
});
