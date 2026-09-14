import assert from "node:assert/strict";
import test from "node:test";
import { findJourney } from "./catalog";
import { getJourneyOffer, INITIAL_SELECTION } from "./choices";

test("동명 앨범·다른 창작자와 속편을 연결하지 않는다", () => {
  assert.equal(findJourney({ title: "The Low End Theory", creator: "A Tribe Called Quest", type: "MUSIC" }), "low-end-theory");
  assert.equal(findJourney({ title: "The Low End Theory", creator: "Low End Theory, The", type: "MUSIC" }), null);
  assert.equal(findJourney({ title: "The Low End Theory (Live)", creator: "A Tribe Called Quest", type: "MUSIC" }), null);
  assert.equal(findJourney({ title: "젤다의 전설 브레스 오브 더 와일드", creator: "Nintendo", type: "GAME" }), "breath-of-the-wild");
  assert.equal(findJourney({ title: "젤다의 전설 브레스 오브 더 와일드 익스팬션 패스", creator: "Nintendo", type: "GAME" }), null);
  assert.equal(findJourney({ title: "Wheat Field with Cypresses", creator: "Vincent van Gogh", type: "ART" }), null);
});

test("CD 선택 시 LP 구매 링크로 바꾸지 않는다", () => {
  const offer = getJourneyOffer("low-end-theory", { ...INITIAL_SELECTION, format: "cd" });
  assert.equal(offer.status, "unavailable");
  assert.equal(offer.link, undefined);
});

test("Switch 본편 소유자에게 본편 재구매나 Switch 2 패스를 판매하지 않는다", () => {
  const offer = getJourneyOffer("breath-of-the-wild", { ...INITIAL_SELECTION, owned: true });
  assert.equal(offer.status, "guide");
  assert.match(offer.summary, /다시 살 필요가 없습니다/);
});

test("Switch 2 소유자의 본편·구독 조합별 구매 안내", () => {
  const fresh = getJourneyOffer("breath-of-the-wild", { ...INITIAL_SELECTION, device: "switch2" });
  assert.equal(fresh.link, "https://store.nintendo.co.kr/70010000096819");
  const owned = getJourneyOffer("breath-of-the-wild", { ...INITIAL_SELECTION, device: "switch2", owned: true });
  assert.match(owned.title, /업그레이드/);
  assert.equal(owned.status, "guide");
  const subscribed = getJourneyOffer("breath-of-the-wild", { ...INITIAL_SELECTION, device: "switch2", owned: true, subscription: true });
  assert.match(subscribed.summary, /가입 기간 중 추가 요금 없이/);
  assert.match(subscribed.facts.join(" "), /구독 종료/);
});

test("프린트 소재·크기를 정확히 알리고 판매처로 옵션이 전달된다고 주장하지 않는다", () => {
  const offer = getJourneyOffer("wheat-field", { ...INITIAL_SELECTION, material: "canvas", size: "xl" });
  assert.match(offer.title, /캔버스.*Extra large/);
  assert.match(offer.facts[0], /101.6 × 80.3/);
  assert.match(offer.note, /자동 전달되지 않습니다/);
});
