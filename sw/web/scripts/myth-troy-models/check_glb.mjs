// 트로이 전쟁 GLB를 게임이 쓰는 로더(three.js GLTFLoader)로 Node에서 직접 읽어 본다.
// 메시·삼각형·재질 이름(lib.py 재질 표와 같은지)·텍스처 없음·발밑 높이를 보고, report.txt 끝의 「three.js 읽기」 절을 새로 쓴다.
// 쓰는 법(저장소 뿌리에서, build_all.py 다음에): node sw/web/scripts/myth-troy-models/check_glb.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Box3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// lib.py와 같은 환경 변수로 시험용 폴더를 가리킬 수 있다
const modelDir = process.env.MYTH_TROY_OUT || path.resolve(here, "../../public/models/myth-troy");
const reportPath = path.join(process.env.MYTH_TROY_TMP || "/tmp/myth-troy/assets", "report.txt");
const HEAD = "three.js 읽기 확인";

// 재질 이름의 기준은 lib.py의 MATERIALS 표 하나다(여기에 다시 적지 않는다)
const libSource = readFileSync(path.join(here, "lib.py"), "utf8");
const allowed = new Set([...libSource.matchAll(/^\s+"([A-Z_]+)": \{"color"/gm)].map((m) => m[1]));

const loader = new GLTFLoader();
const parse = (buffer) => new Promise((resolve, reject) => loader.parse(buffer, "", resolve, reject));

const lines = [];
const problems = [];
const files = readdirSync(modelDir).filter((f) => f.endsWith(".glb")).sort();
for (const file of files) {
  const key = file.replace(/\.glb$/, "");
  const raw = readFileSync(path.join(modelDir, file));
  try {
    const gltf = await parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    let meshes = 0;
    let tris = 0;
    const names = new Set();
    let textures = 0;
    gltf.scene.traverse((obj) => {
      if (!obj.isMesh) return;
      meshes += 1;
      const geo = obj.geometry;
      tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mat) => {
        names.add(mat.name);
        if (mat.map || mat.normalMap || mat.roughnessMap) textures += 1;
      });
    });
    const box = new Box3().setFromObject(gltf.scene);
    const bad = [...names].filter((n) => !allowed.has(n));
    const flags = [];
    if (meshes === 0 || tris === 0) flags.push("빈 모델");
    if (bad.length > 0) flags.push(`표에 없는 재질 ${bad.join(",")}`);
    if (textures > 0) flags.push("텍스처 있음");
    if (box.min.y < -0.06) flags.push(`발밑 ${box.min.y.toFixed(3)}`);
    if (gltf.animations.length > 0 || gltf.cameras.length > 0) flags.push("애니메이션·카메라 있음");
    if (flags.length > 0) problems.push(`${key}: ${flags.join(" / ")}`);
    lines.push(`${key.padEnd(13)} 메시 ${String(meshes).padStart(2)}  삼각형 ${String(tris).padStart(5)}  재질 ${names.size}  ` +
      `높이(y) ${box.min.y.toFixed(2)}~${box.max.y.toFixed(2)}${flags.length ? "  ← " + flags.join(" / ") : ""}`);
  } catch (err) {
    problems.push(`${key}: 읽기 실패 ${err?.message ?? err}`);
    lines.push(`${key.padEnd(13)} 읽기 실패`);
  }
}

const section = [
  `${HEAD} — node ${process.version}, three GLTFLoader.parse, 파일 ${files.length}개`,
  ...lines,
  `결과: ${problems.length === 0 ? "모두 읽힘, 문제 없음" : problems.join("; ")}`,
].join("\n");
console.log(section);
if (existsSync(reportPath)) {
  const report = readFileSync(reportPath, "utf8");
  const cut = report.indexOf(HEAD);
  const base = (cut >= 0 ? report.slice(0, cut) : report).replace(/\s+$/, "");
  writeFileSync(reportPath, `${base}\n\n${section}\n`, "utf8");
}
process.exitCode = problems.length === 0 ? 0 : 1;
