import assert from "node:assert/strict";
import test from "node:test";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import { EMPTY_MONOLOGUE_FILTERS, filterMonologueCelebs, MONOLOGUE_PAGE_SIZE, monologuePage } from "./monologueBrowse";

const figures: VirtualMonologueCeleb[] = [
  { id: "1", nickname: "프란츠 카프카", searchNames: "프란츠 카프카 Franz Kafka", profession: "writer", nationality: "CZ", hasVoice: false },
  { id: "2", nickname: "도널드 트럼프", searchNames: "도널드 트럼프 Donald Trump", profession: "politician", nationality: "US", hasVoice: true },
  { id: "3", nickname: "빅토르 위고", searchNames: "빅토르 위고 Victor Hugo", profession: "writer", nationality: "FR", hasVoice: true },
].map(figure => ({ ...figure, slug: null, title: null, avatar_url: null, voiceUrl: null, voiceLocale: "ko", voiceV: 0 }));

test("text-only figures remain discoverable with translated names and whitespace differences", () => {
  assert.deepEqual(filterMonologueCelebs(figures, EMPTY_MONOLOGUE_FILTERS).map(figure => figure.id), ["1", "2", "3"]);
  for (const query of [" FRANZ KAFKA ", "프란츠카프카"]) {
    assert.deepEqual(filterMonologueCelebs(figures, { ...EMPTY_MONOLOGUE_FILTERS, query }).map(figure => figure.id), ["1"]);
  }
});

test("profession, nationality and actual narration filters apply together", () => {
  assert.deepEqual(filterMonologueCelebs(figures, { ...EMPTY_MONOLOGUE_FILTERS, profession: "writer", audio: "voiced" }).map(figure => figure.id), ["3"]);
  assert.deepEqual(filterMonologueCelebs(figures, { ...EMPTY_MONOLOGUE_FILTERS, nationality: "CZ", audio: "text" }).map(figure => figure.id), ["1"]);
  assert.equal(filterMonologueCelebs(figures, { ...EMPTY_MONOLOGUE_FILTERS, nationality: "CZ", audio: "voiced" }).length, 0);
});

test("large results keep a fixed face count and clamp pages after filtering", () => {
  const many = Array.from({ length: 4000 }, (_, index) => ({ ...figures[0], id: String(index) }));
  const first = monologuePage(many, 1);
  const second = monologuePage(many, 2);
  assert.equal(first.items.length, MONOLOGUE_PAGE_SIZE);
  assert.equal(second.items.length, MONOLOGUE_PAGE_SIZE);
  assert.ok(second.items.every(figure => !first.items.some(previous => previous.id === figure.id)));
  assert.equal(monologuePage(figures, 250).page, 1);
  assert.equal(monologuePage([], 250).items.length, 0);
});
