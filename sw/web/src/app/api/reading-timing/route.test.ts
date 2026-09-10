import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

test("timing API only serves sidecars matching the audio ETag", async () => {
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://assets.example.test";
  const { GET } = await import("./route");
  const fetchOriginal = globalThis.fetch;
  const data = {
    version: 1, sourceHash: "a".repeat(64), audioHash: "b".repeat(64), audioEtag: '"current"', duration: 5,
    segments: [{ start: 0, end: 4.9, textStart: 0, textEnd: 15 }],
  };
  const requests: string[] = [];
  let etag = '"current"';
  let missing = false;
  globalThis.fetch = async (url, init) => {
    requests.push(String(url));
    return init?.method === "HEAD"
      ? new Response(null, { headers: { ETag: etag } })
      : missing ? new Response(null, { status: 404 }) : Response.json(data);
  };
  const request = () => new NextRequest("http://localhost/api/reading-timing?id=8d9ac6ec-2095-427b-a2c6-6b8fdbbb910a&locale=ko&v=4");
  try {
    const ok = await GET(request());
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), data);
    assert.ok(requests.every((url) => url.startsWith("https://assets.example.test/celebs/") && url.endsWith("?v=4")));
    etag = '"replaced"';
    assert.equal((await GET(request())).status, 204);
    missing = true;
    assert.equal((await GET(request())).status, 204);
    requests.length = 0;
    assert.equal((await GET(new NextRequest("http://localhost/api/reading-timing?id=../../secret&locale=ko"))).status, 400);
    assert.equal(requests.length, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
