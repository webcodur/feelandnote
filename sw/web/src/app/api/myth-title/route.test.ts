import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { GET } from "./[file]/route";
import { titleArtworkFile } from "@/lib/title-artwork";
import { MYTH_TITLE_DISPLAY } from "@feelandnote/shared/constants/responsive-artwork";

test("hashed myth and faction artwork resize to WebP, coalesce requests, and retry missing sources", async (t) => {
  const original = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#846abf" } }).png().toBuffer();
  const previous = process.env.R2_PUBLIC_URL;
  process.env.R2_PUBLIC_URL = "https://assets.feelandnote.com";
  t.after(() => { if (previous === undefined) delete process.env.R2_PUBLIC_URL; else process.env.R2_PUBLIC_URL = previous; });
  const requests: string[] = [];
  let missing = false;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requests.push(url);
    return missing ? new Response(null, { status: 404 }) : new Response(new Uint8Array(original));
  });
  const get = (file: string, width = 768) => GET(new Request(`https://example.com/api/myth-title/${file}?w=${width}`), { params: Promise.resolve({ file }) });
  for (const path of ["myth/title-art/olympus-123456abcdef.png", "faction/269cd3a9-18b9-4fe3-87ea-854a87c09e98/cover/4226c2ca6f29f290.webp"]) {
    const file = titleArtworkFile(`https://assets.feelandnote.com/${path}`)!;
    assert.ok(file);
    const before = requests.length;
    const responses = await Promise.all([get(file), get(file)]);
    assert.equal(requests.length, before + 1);
    assert.equal(requests.at(-1), `https://assets.feelandnote.com/${path}`);
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control")!, /immutable/);
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, 768);
      assert.equal(metadata.height, 512);
    }
  }
  for (const width of MYTH_TITLE_DISPLAY.widths) {
    const response = await get("olympus-123456abcdef.png", width);
    assert.equal(response.status, 200);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, Math.round(width * 1024 / 1536));
  }
  const before = requests.length;
  for (const file of ["../secret.png", "https://example.com/file.png", "faction-invalid-123456abcdef.webp", "unhashed.png"]) {
    assert.equal((await get(file)).status, 400);
  }
  assert.equal((await get("olympus-123456abcdef.png", 9999)).status, 400);
  assert.equal(requests.length, before);
  missing = true;
  assert.equal((await get("missing-123456abcdef.png")).status, 404);
  missing = false;
  assert.equal((await get("missing-123456abcdef.png")).status, 200);
});

test("external and malformed asset URLs cannot select the resize source", () => {
  for (const url of [
    "https://evil.example/myth/title-art/olympus-123456abcdef.png",
    "http://assets.feelandnote.com/myth/title-art/olympus-123456abcdef.png",
    "https://assets.feelandnote.com/faction/../cover/123456abcdef.webp",
    "https://assets.feelandnote.com/myth/title-art/%2e%2e%2fsecret-123456abcdef.png",
  ]) assert.equal(titleArtworkFile(url), null);
});
