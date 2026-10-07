import assert from "node:assert/strict";
import test from "node:test";
import { resolveBookBannerTheme } from "./bookBanner";

test("historical Chinese readers keep a modern reprint in the Chinese classics theme", () => {
  assert.equal(resolveBookBannerTheme([{ nationality: "CN", birthDate: "170", reality: "REAL" }], "2019-01-01"), "chinese-classics");
});
test("Western historical and other ancient readers receive different libraries", () => {
  assert.equal(resolveBookBannerTheme([{ nationality: "GB", birthDate: "1564" }]), "western-classics");
  assert.equal(resolveBookBannerTheme([{ nationality: "IN", birthDate: "-300" }]), "ancient-archive");
});
test("a documented death year works when an ancient reader's birth is unknown", () => {
  assert.equal(resolveBookBannerTheme([{ nationality: "CN", deathDate: "219" }]), "chinese-classics");
});
test("unknown dates and fictional readers cannot make a modern book look ancient", () => {
  assert.equal(resolveBookBannerTheme([{ nationality: "CN" }]), "library");
  assert.equal(resolveBookBannerTheme([{ nationality: "CN", birthDate: "100", reality: "FICTION" }], "2000"), "contemporary");
});
test("publication period distinguishes early modern, contemporary, and unknown works", () => {
  assert.equal(resolveBookBannerTheme([], "1922"), "early-modern");
  assert.equal(resolveBookBannerTheme([], "2018"), "contemporary");
  assert.equal(resolveBookBannerTheme([], null), "library");
});
test("regional decisions do not depend on review feed order", () => {
  const readers = [{ nationality: "GB", birthDate: "1500" }, { nationality: "CN", birthDate: "170" }, { nationality: "CN", birthDate: "900" }];
  assert.equal(resolveBookBannerTheme(readers), "chinese-classics");
  assert.equal(resolveBookBannerTheme([...readers].reverse()), "chinese-classics");
});
