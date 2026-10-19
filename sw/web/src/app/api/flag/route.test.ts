import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./[code]/route";

test("flags serve individual SVGs with browser caching and reject invalid paths", async () => {
  for (const code of ["KR", "US", "NP"]) {
    const response = await GET(new Request(`https://example.com/api/flag/${code}`), { params: Promise.resolve({ code }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.match(response.headers.get("cache-control")!, /public, max-age=/);
    assert.match(await response.text(), /<svg/);
  }
  for (const code of ["../../package.json", "%2fKR", "kr", "ZZ", "SU", "", "KR.svg"]) {
    const response = await GET(new Request("https://example.com/api/flag/invalid"), { params: Promise.resolve({ code }) });
    assert.equal(response.status, 404);
  }
});
