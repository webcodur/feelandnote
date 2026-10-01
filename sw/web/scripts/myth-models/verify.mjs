// 파일명: sw/web/scripts/myth-models/verify.mjs
// 기능: 신화 세계 모형 glb 검사와 모아 보기
// 책임: glb 구조(머리·JSON/BIN 청크·범위·용량 200KB), Draco·텍스처 없음, three.js GLTFLoader.parse로 읽기,
//       원점(바닥 가운데)·크기·삼각형 수·용량을 manifest.json과 맞추기, 면마다 법선이 같은지(각진 면) 본다.
//       미리보기(/tmp/myth-assets/preview-*.png)를 모아 /tmp/myth-assets/contact.png(1600px 이하)를 만든다.
// 실행(저장소 루트): node sw/web/scripts/myth-models/verify.mjs   — 먼저 bake.py로 굽는다(bake.py 머리 주석)
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Box3, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "..", "..", "public", "models", "myth");
const tmp = "/tmp/myth-assets";
const LIMIT = 200 * 1024;
// 게임이 읽는 이름(world/models.ts MODEL_NAMES) — 이 파일에서 직접 읽어 맞춘다
const modelsTs = readFileSync(path.resolve(here, "..", "..", "src", "components", "features", "game", "myth", "world", "models.ts"), "utf8");
const gameNames = [...(modelsTs.match(/MODEL_NAMES = \[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
// 원점을 줄기 밑동에 둔 나무는 바운딩 박스 가운데와 조금 어긋나도 된다
const BASE_ORIGIN = new Set(["olive-tree", "cypress"]);

const problems = [];
const fail = (name, message) => problems.push(`${name}: ${message}`);

function readGlb(file) {
  const buf = readFileSync(file);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error("magic이 glTF가 아니다");
  if (view.getUint32(4, true) !== 2) throw new Error("glTF 2가 아니다");
  if (view.getUint32(8, true) !== buf.byteLength) throw new Error("머리의 길이와 파일 크기가 다르다");
  const chunks = [];
  for (let offset = 12; offset < buf.byteLength;) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (length % 4 !== 0) throw new Error("청크 길이가 4의 배수가 아니다");
    chunks.push({ type, data: buf.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  if (chunks[0]?.type !== 0x4e4f534a) throw new Error("첫 청크가 JSON이 아니다");
  if (chunks[1]?.type !== 0x004e4942) throw new Error("둘째 청크가 BIN이 아니다");
  return { buf, json: JSON.parse(new TextDecoder().decode(chunks[0].data)), bin: chunks[1].data };
}

function checkJson(name, json, bin) {
  if (json.asset?.version !== "2.0") fail(name, "asset.version이 2.0이 아니다");
  const used = json.extensionsUsed ?? [];
  if (used.some((e) => /draco/i.test(e))) fail(name, "Draco 압축이 들어 있다");
  const required = json.extensionsRequired ?? [];
  if (required.some((e) => e !== "KHR_mesh_quantization")) fail(name, `필수 확장이 이상하다: ${required}`);
  if (json.images?.length || json.textures?.length) fail(name, "텍스처가 들어 있다");
  if ((json.buffers?.[0]?.byteLength ?? 0) > bin.byteLength) fail(name, "버퍼가 BIN 청크보다 길다");
  for (const [i, v] of (json.bufferViews ?? []).entries()) {
    if ((v.byteOffset ?? 0) + v.byteLength > bin.byteLength) fail(name, `bufferView ${i}가 BIN 밖으로 나간다`);
  }
  for (const m of json.materials ?? []) {
    const keys = Object.keys(m.pbrMetallicRoughness ?? {}).filter((k) => !["baseColorFactor", "metallicFactor", "roughnessFactor"].includes(k));
    if (keys.length || m.extensions || m.doubleSided) fail(name, `재질 ${m.name}에 베이스 색·거칠기 밖의 값이 있다: ${keys} ${Object.keys(m.extensions ?? {})}`);
  }
}

function flatStats(root) {
  // 삼각형마다 세 꼭짓점 법선이 같으면 각진 면이다(8비트 정수라 1/127 안쪽은 같은 것으로 본다)
  let triangles = 0;
  let smooth = 0;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const normal = node.geometry.getAttribute("normal");
    const index = node.geometry.getIndex();
    if (!normal || !index) {
      smooth += 1;
      return;
    }
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      triangles += 1;
      const same = (p, q) => Math.abs(normal.getX(p) - normal.getX(q)) < 0.02 && Math.abs(normal.getY(p) - normal.getY(q)) < 0.02 && Math.abs(normal.getZ(p) - normal.getZ(q)) < 0.02;
      if (!same(a, b) || !same(a, c)) smooth += 1;
    }
  });
  return { triangles, smooth };
}

async function parse(buf) {
  const loader = new GLTFLoader();
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => loader.parse(ab, "", resolve, reject));
}

const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
const rows = [];
for (const entry of manifest) {
  const { name } = entry;
  const file = path.join(dir, entry.file);
  if (!existsSync(file)) {
    fail(name, "파일이 없다");
    continue;
  }
  const bytes = statSync(file).size;
  let row = { name, bytes, game: gameNames.includes(name) };
  try {
    const { buf, json, bin } = readGlb(file);
    checkJson(name, json, bin);
    if (bytes > LIMIT) fail(name, `용량 ${(bytes / 1024).toFixed(1)}KB가 200KB를 넘는다`);
    if (entry.bytes !== bytes) fail(name, `목록 bytes ${entry.bytes} ≠ 파일 ${bytes}`);
    const gltf = await parse(buf);
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(box.min.clone());
    const center = box.getCenter(box.min.clone());
    const { triangles, smooth } = flatStats(gltf.scene);
    if (triangles !== entry.triangles) fail(name, `목록 triangles ${entry.triangles} ≠ 읽은 값 ${triangles}`);
    if (smooth) fail(name, `각지지 않은 삼각형 ${smooth}개`);
    const listed = entry.size ?? [];
    const diff = [size.x, size.y, size.z].map((v, i) => Math.abs(v - (listed[i] ?? NaN)));
    if (!diff.every((d) => d < 0.03)) fail(name, `목록 size ${listed} ≠ 읽은 값 ${[size.x, size.y, size.z].map((v) => v.toFixed(2))}`);
    if (Math.abs(box.min.y) > 0.01) fail(name, `바닥이 y=0이 아니다(${box.min.y.toFixed(3)})`);
    const off = Math.hypot(center.x, center.z);
    if (!BASE_ORIGIN.has(name) && off > 0.02) fail(name, `원점이 바닥 가운데에서 ${off.toFixed(3)}m 벗어났다`);
    let materials = 0;
    let flatShadingOff = true;
    gltf.scene.traverse((node) => {
      if (node instanceof Mesh) {
        materials += 1;
        if (node.material.side !== 0) fail(name, "재질이 양면이다");
        if (node.material.flatShading) flatShadingOff = false;
      }
    });
    row = { ...row, triangles, size: [size.x, size.y, size.z].map((v) => +v.toFixed(2)), materials, origin: +off.toFixed(2), flatNormals: smooth === 0, loader: "ok", flatShadingOff };
  } catch (error) {
    fail(name, `읽기 실패 — ${error instanceof Error ? error.message : error}`);
    row = { ...row, loader: "fail" };
  }
  rows.push(row);
}

for (const name of gameNames) {
  if (!manifest.some((e) => e.name === name)) fail(name, "게임이 읽는 이름인데 목록에 없다");
}
console.table(rows.map((r) => ({ name: r.name, KB: +(r.bytes / 1024).toFixed(1), tris: r.triangles, size: r.size?.join(" × "), mats: r.materials, origin: r.origin, flat: r.flatNormals, three: r.loader, game: r.game })));

// 모아 보기 — 400×300 칸 4열, 칸 아래에 이름·크기·삼각형·용량
const tiles = [];
for (const [i, r] of rows.entries()) {
  const png = path.join(tmp, `preview-${r.name}.png`);
  if (!existsSync(png)) continue;
  const label = `${r.name}  ${r.size?.join("x") ?? "?"} m  ${r.triangles ?? "?"} tris  ${(r.bytes / 1024).toFixed(0)} KB${r.game ? "" : "  (not read by game)"}`;
  const svg = Buffer.from(`<svg width="400" height="26" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="26" fill="#111318"/><text x="8" y="18" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#e8e4da">${label}</text></svg>`);
  const tile = await sharp(png).resize(400, 300, { fit: "cover" }).composite([{ input: svg, top: 274, left: 0 }]).png().toBuffer();
  tiles.push({ input: tile, left: (i % 4) * 400, top: Math.floor(i / 4) * 300 });
}
if (tiles.length) {
  const out = path.join(tmp, "contact.png");
  const height = Math.ceil(tiles.length / 4) * 300;
  await sharp({ create: { width: 1600, height, channels: 3, background: "#0c0d10" } }).composite(tiles).png().toFile(out);
  console.log(`contact ${out} (1600×${height})`);
}
if (problems.length) {
  console.error(`문제 ${problems.length}건\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`모두 통과: ${rows.length}개`);
