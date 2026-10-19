import assert from "node:assert/strict";
import { test } from "node:test";
import { ANALYTICS_STORAGE_KEY, isProductionAnalyticsLocation, readAnalyticsDisabled } from "./policy";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

test("only the HTTPS production hostname can collect analytics", () => {
  assert.equal(isProductionAnalyticsLocation({ hostname: "feelandnote.com", protocol: "https:" }), true);
  for (const hostname of ["localhost", "127.0.0.1", "192.168.0.6", "preview.feelandnote.com", "feelandnote.com.evil.test"]) {
    assert.equal(isProductionAnalyticsLocation({ hostname, protocol: "https:" }), false);
  }
  assert.equal(isProductionAnalyticsLocation({ hostname: "feelandnote.com", protocol: "http:" }), false);
});

test("resident opt-out persists across navigation and can be undone explicitly", () => {
  const store = storage();
  assert.equal(readAnalyticsDisabled("?analytics=on", store), false);
  assert.equal(readAnalyticsDisabled("?analytics=off", store), true);
  assert.equal(store.getItem(ANALYTICS_STORAGE_KEY), "1");
  assert.equal(readAnalyticsDisabled("?category=book", store), true);
  assert.equal(readAnalyticsDisabled("?analytics=invalid", store), true);
  assert.equal(readAnalyticsDisabled("?analytics=on", store), false);
  assert.equal(readAnalyticsDisabled("", store), false);
});

test("blocked storage cannot break the page or bypass an opt-out", () => {
  const denied = { getItem: () => { throw Error("denied"); }, setItem: () => { throw Error("denied"); }, removeItem: () => { throw Error("denied"); } };
  assert.equal(readAnalyticsDisabled("?analytics=off", denied), true);
  assert.equal(readAnalyticsDisabled("", denied), true);
  assert.equal(readAnalyticsDisabled("?analytics=on", denied), true);
});
