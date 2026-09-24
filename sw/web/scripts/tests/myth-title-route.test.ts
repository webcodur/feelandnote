import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { GET } from "../../src/app/api/myth-title/[file]/route";

const file = "homer-iliad-000000000000.png";
const source = sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#486785" } }).png().toBuffer();
process.env.R2_PUBLIC_URL = "https://assets.feelandnote.com";

test("one title source serves only the requested WebP width", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async input => {
    urls.push(String(input));
    return new Response(new Uint8Array(await source), { status: 200 });
  };
  try {
    const params = { params: Promise.resolve({ file }) };
    const response = await GET(new Request(`http://localhost/api/myth-title/${file}?w=768`), params);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.deepEqual(urls, [`https://assets.feelandnote.com/myth/title-art/${file}`]);
    const result = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 768);
  } finally { globalThis.fetch = originalFetch; }
});

test("invalid widths and absent title sources are rejected", async () => {
  const invalid = await GET(new Request(`http://localhost/api/myth-title/${file}?w=999`), {
    params: Promise.resolve({ file }),
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 404 });
  const missing = await GET(new Request("http://localhost/api/myth-title/missing-000000000000.png?w=768"), {
    params: Promise.resolve({ file: "missing-000000000000.png" }),
  });
  globalThis.fetch = originalFetch;
  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
});
