#!/usr/bin/env node
/*
  파일명: sw/web-bo/scripts/generate-world-banners.mjs
  기능: 인물 세계 배너 그림 생성
  책임: codex(image_gen)로 세계별 배경 사진을 뽑아 sw/web/public/images/worlds 에 넣는다.

  규격·장면은 docs/project/celeb-world-banners.md, 진행 상황은
  docs/todo/celeb-world-banner-progress.md 가 SSoT다.

  사용법
    node sw/web-bo/scripts/generate-world-banners.mjs                 # 남은 것만
    node sw/web-bo/scripts/generate-world-banners.mjs --limit 6
    node sw/web-bo/scripts/generate-world-banners.mjs --only rome,joseon --force
    node sw/web-bo/scripts/generate-world-banners.mjs --role mb

  재실행 안전하다. 이미 만들어진 세계는 건너뛰므로 한도에 막혀도 같은 명령으로 이어 붙인다.

  이 환경의 함정 — codex가 그림을 목적지에 저장하지 못한다(쉘 도구가 죽는다).
  그림은 ~/.codex/generated_images/<세션>/call_*.png 에 남으므로 TASK-ID로 세션을 특정해 회수한다.
*/

import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const REPO = path.resolve(import.meta.dirname, "../../..");
const OUT_DIR = path.join(REPO, "sw/web/public/images/worlds");
const WORK_DIR = path.join(os.tmpdir(), "world-banners");
const CODEX_IMAGES = path.join(os.homedir(), ".codex/generated_images");
const CODEX_SESSIONS = path.join(os.homedir(), ".codex/sessions");

/* 잘라 쓰는 띠. 생성물은 1536x1024로 고정돼 나온다(크기 지시가 안 먹는다) */
const BAND = { pc: { top: 302, height: 420 }, mb: { top: 262, height: 500 } };
const CONCURRENCY = 3;

// #region 세계별 장면
/** scene/light 는 docs/project/celeb-world-banners.md 표에서 옮긴다 */
const WORLDS = [
  { id: "joseon", pc: "Overlapping tiled roof eaves of a Korean royal palace seen from a slightly raised angle, receding into the distance, with a wide empty courtyard of large grey stone slabs below and beyond", mb: "A close view of the painted wooden bracket set and rafter ends under a Korean palace eave", light: "Late afternoon sun, very low from the left, raking across the roof tiles" },
  { id: "rome", pc: "A row of ancient Roman brick and travertine arches standing along the LEFT third of the frame, with worn paving stones and broken column stumps stretching away to the right", mb: "A close view of worn Roman mosaic paving, damp after rain", light: "Overcast dusk after the sun has dropped below the horizon; no direct sunlight, no warm glow" },
  { id: "modern-america", pc: "Low glass-and-steel corporate office buildings of an American business park grouped OFF-CENTRE to the right, seen across a wide asphalt lot. Deliberately asymmetric: no mirrored trees or poles", mb: "A close view of a dark glass curtain wall reflecting a pale sky, with a concrete joint running through it", light: "Ten minutes after sunset; the sky still holds even light so the buildings read clearly against it" },
  { id: "three-kingdoms-korea", pc: "A Goguryeo mountain fortress wall of fitted stone running along a ridge, with a fog-filled valley below", mb: "A close view of fitted fortress stonework beside a timber gate post", light: "Dawn side light through thin mist" },
  { id: "goryeo", pc: "A wooden temple hall and a stone pagoda in a mountain courtyard, the ground still wet", mb: "A close view of the lower tiers of a weathered stone pagoda with moss", light: "Morning after rain, soft and directional" },
  { id: "modern-korea", pc: "A Korean riverside district where low 1970s concrete and brick buildings with rooftop water tanks stand in front of taller apartment blocks across the water, power lines crossing above", mb: "A close view of a tiled concrete stairwell landing with a bare handrail", light: "Just after sunset, a dim band of light at the horizon" },
  { id: "warring-states-china", pc: "A rammed-earth city wall above a dry plain scored with cart ruts", mb: "A close view of the taotie pattern on a bronze ritual vessel", light: "Overcast evening" },
  { id: "han-china", pc: "A wooden colonnade and low tiled roofs enclosing an administrative courtyard", mb: "A close view of bamboo slip scrolls beside an ink stone", light: "Late afternoon, low and directional" },
  /* 1차 산출이 거의 검정이었다. 성문을 왼쪽으로 당기고 하늘에 빛을 남긴다 */
  { id: "tang-song", pc: "A Tang dynasty city gate tower placed left of centre above a broad avenue, lanterns hanging under its eaves, the avenue receding to the right", mb: "A close view of a celadon ewer beside a wooden lattice window", light: "Blue hour just after sunset; the sky still holds dim even light behind the tower" },
  { id: "ming-qing", pc: "Layered red palace walls and golden tiled roofs receding into the distance", mb: "A close view of a red palace door with rows of gilt studs", light: "Late afternoon, low from the side" },
  { id: "modern-china", pc: "A river bank at night where old concession-era stone buildings face taller modern towers", mb: "A close view of a brick alley wall with a red paper lantern", light: "Night, weak city light" },
  { id: "ancient-japan", pc: "A torii gate among tall cedar trees in mist", mb: "A close view of a mossy stone lantern", light: "Morning mist, diffuse" },
  { id: "samurai-japan", pc: "The silhouette of a Japanese castle keep above a sloped stone rampart", mb: "A close view of a helmet and shoulder armour resting on a wooden stand", light: "Overcast dawn" },
  /* 1차 산출이 처마만 크게 잡혀 거리가 안 보였다. 눈높이에서 거리를 따라 보게 한다 */
  { id: "edo", pc: "A street of two-storey wooden shopfronts receding into the distance, paper lanterns hung along both sides, the wet ground reflecting them. Seen at eye level from the middle of the street", mb: "A close view of a paper sliding door beside the edge of a tatami mat", light: "Evening after rain; lantern light and a dim sky" },
  { id: "modern-japan", pc: "A narrow alley at night tangled with overhead wires and blank sign frames", mb: "A close view of a tiled wall lit by a vending machine", light: "Night, weak artificial light" },
  { id: "steppe", pc: "Open grassland running to low hills with the silhouette of a round felt tent", mb: "A close view of a leather saddle on felt", light: "Sunset, very low" },
  { id: "ancient-greece", pc: "A marble colonnaded temple on a rise with olive trees, placed off-centre to the left", mb: "A close view of the fluting of a Doric column and its marble grain", light: "Early morning, low from the right" },
  /* 1차 산출은 왼쪽이 캄캄하고 오른쪽만 환해 좌우가 극단이었다 */
  { id: "ancient-india", pc: "The carved sandstone facade of a rock-cut cave temple filling the left half of the frame, its pillared verandah receding, with dim open ground to the right", mb: "A close view of a carved stone lotus relief", light: "Even overcast light with no bright patch anywhere" },
  { id: "mughal", pc: "A symmetrical marble garden palace with a long water channel", mb: "A close view of inlaid marble floral patterning", light: "Early morning" },
  { id: "modern-india", pc: "A colonial-era administrative building along a wide dusty avenue", mb: "A close view of a barred window with hanging cloth", light: "Overcast day" },
  { id: "ancient-near-east", pc: "A mud-brick ziggurat rising over a windblown plain", mb: "A close view of a cuneiform clay tablet", light: "Sunset with dust in the air" },
  { id: "islamic-golden-age", pc: "The arcaded courtyard of a madrasa with star-patterned tiled paving", mb: "A close view of geometric tilework beside a brass lamp", light: "Late afternoon, low through the arcade" },
  /* 1차 산출의 주황 노을이 39장 중 혼자 튀었다. 재생성본은 돔이 아래로 몰려 자르는 위치를 내린다 */
  { id: "ottoman-persia", pc: "A skyline of domes and minarets rising behind low rooftops, seen from a slight distance", mb: "A close view of a carpet pattern beside a brass ewer", light: "Overcast dusk. No sunset colour, no orange or gold in the sky", bandTop: { pc: 560 } },
  { id: "modern-middle-east", pc: "Low rooftops crowded with water tanks and satellite dishes under blowing sand", mb: "A close view of a concrete wall and a barred opening", light: "Hazy midday" },
  { id: "medieval-rus", pc: "A snow-covered timber fortress with onion domes behind it", mb: "A close view of notched log wall joints under snow", light: "Overcast winter" },
  { id: "imperial-russia", pc: "A snow-covered square before a long palace facade", mb: "A close view of a frosted window frame with a candle behind it", light: "Winter dusk" },
  { id: "soviet-east-europe", pc: "Rows of concrete housing blocks under a flat grey sky", mb: "A close view of a grey stairwell landing with a steel rail", light: "Overcast day" },
  /* 1차 산출이 시골 벽돌집 한 채로 나와 건국기 관청으로 안 읽혔다. 하늘도 39장 중 가장 밝았다 */
  { id: "colonial-america", pc: "A two-storey brick colonial assembly hall with a white cupola and tall sash windows, standing along the far side of an empty square, a bare flagpole beside it", mb: "A close view of a panelled wooden door with a brass handle", light: "Overcast early morning; the sky stays dark grey with no bright patch" },
  /* 1차 산출의 주황 노을이 39장 중 혼자 튀었다 */
  { id: "frontier-america", pc: "Railway track running to the horizon past a wooden water tower, with a low timber depot beside it", mb: "A close view of weathered plank siding beside a hanging lantern", light: "Overcast late afternoon. No sunset colour, no orange sky" },
  { id: "medieval-europe", pc: "A town wall and a cathedral spire in dawn fog", mb: "A close view of an arched window and melted candle wax", light: "Dawn fog" },
  { id: "renaissance", pc: "A city square with a cathedral dome beyond an arcade", mb: "A close view of a fresco fragment on plaster beside a wooden easel", light: "Afternoon" },
  { id: "age-of-sail", pc: "A harbour crowded with the bare masts of sailing ships in morning fog", mb: "A close view of a sea chart with brass dividers", light: "Dawn fog" },
  { id: "industrial-europe", pc: "Brick factory chimneys and an iron bridge under a smoke-heavy sky", mb: "A close view of riveted iron plate with escaping steam", light: "Overcast afternoon" },
  { id: "world-wars", pc: "An empty railway platform with steam drifting along bare tracks", mb: "A close view of wet platform paving beside an iron column", light: "Overcast winter" },
  { id: "modern-west", pc: "A European evening street with tram rails set into wet stone", mb: "A close view of wet asphalt under a street lamp", light: "Evening after rain" },
  { id: "latin-america", pc: "An alley of painted colonial walls with a volcanic ridge beyond", mb: "A close view of faded lime-washed plaster and an iron balcony", light: "Late afternoon" },
  /* 1차 산출이 주황 노을 + 아카시아 실루엣이라 채도 최고에 흔한 사바나 클리셰였다 */
  { id: "africa", pc: "A red earth road running past the low mud-brick walls at the edge of a settlement, dry grassland stretching beyond them", mb: "A close view of a mud wall beside woven cloth", light: "Overcast late afternoon. No sunset colour, no orange sky, no silhouetted acacia" },
  { id: "myth", pc: "Broken marble columns above a sea of cloud under stars", mb: "A close view of a broken marble fragment under starlight", light: "Silver night" },
  { id: "neutral", pc: "A featureless stone surface in deep fog with a single shaft of light", mb: "A close view of the same stone surface in fog", light: "Weak light with direction only" },
];
// #endregion

/* 모바일은 좁은 화면이라 원경을 세로로 자르면 주제가 사라진다. 재질이 읽히는 근경만 쓴다.
   1차 산출에서 근경 지시에도 하늘·바다·먼 풍경이 끼어든 장이 다섯 있어 못 박는다. */
const CLOSE_UP = `This is a tight close-up. The surface fills the whole frame from edge to
edge. No sky, no horizon, no distant landscape, no wide view.`;

const COMMON = (scene, light, role) => `SCENE: ${scene}.
LIGHT: ${light}.
${role === "mb" ? CLOSE_UP : ""}

No people anywhere. No text, no letters, no logos, no signage, no watermarks.
Palette: muted and desaturated. Deepest shadows near #121212. Keep the whole frame dark;
nothing in it should be brighter than a mid grey. One light source only.
Composition: the horizon sits in the lower third; the centre of the frame stays visually
empty; the upper area is dark sky or dark ceiling. The subject must still read when the
top third and the bottom third are cropped away. Avoid mirror symmetry.
Texture: sharp, real material detail. No painterly brushwork, no illustration, no CGI
render, no HDR glow.`;

// #region codex 호출과 회수
let codexPath = null;
async function resolveCodex() {
  if (codexPath) return codexPath;
  const { stdout } = await execFileAsync("where", ["codex"], { shell: true });
  // .cmd 래퍼를 써야 한다. 확장자 없는 shim 은 node 에서 산발적으로 실패한다
  const found = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  codexPath = found.find((line) => line.toLowerCase().endsWith(".cmd")) ?? found[0];
  return codexPath;
}

function todaySessionDir() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return path.join(CODEX_SESSIONS, String(now.getFullYear()), pad(now.getMonth() + 1), pad(now.getDate()));
}

/** TASK-ID(또는 그 앞부분)가 든 세션 기록을 찾아 세션 id 를 돌려준다.
    남의 세션 그림을 집지 않기 위함이다. 앞부분만 주면 가장 최근 것을 고른다 */
function findSessionId(taskId) {
  const dir = todaySessionDir();
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((name) => name.startsWith("rollout-") && name.endsWith(".jsonl"))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 400);

  for (const file of files) {
    if (fs.readFileSync(path.join(dir, file.name), "utf8").includes(taskId)) {
      const matched = /rollout-.*?-([0-9a-f-]{36})\.jsonl$/.exec(file.name);
      if (matched) return matched[1];
    }
  }
  return null;
}

/** 세션 폴더에서 가장 최근 그림을 집는다. 스스로 고쳐 다시 그린 경우가 있어 최신이 최종본이다 */
function newestImage(sessionId) {
  const dir = path.join(CODEX_IMAGES, sessionId);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .map((name) => ({ full: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.full ?? null;
}
// #endregion

// #region 톤 보정
/* 39장이 한 벌로 보이려면 밝기와 채도를 같은 자리에 맞춰야 한다.
   1차 실측에서 평균 밝기가 12~114로 흩어져 밝은 장만 화면에서 튀었다.
   장면을 다시 뽑는 대신 산출물의 밝기 분포를 맞춘다. */
/* 밝은 쪽(상위 1%)만 같은 자리로 옮기고 검은색은 건드리지 않는다.
   중앙값까지 맞추려 하면 어두운 장은 검은색이 들려 뿌옇게 되고, 밝은 장은
   대비가 눌려 실루엣으로 뭉갠다(1차 보정에서 실측). */
const TONE = { high: 112, maxColourSpread: 7 };

/** 밝기 분포에서 중앙값과 상위 1% 지점을 구한다 */
async function measure(image) {
  const grey = await image.clone().greyscale().raw().toBuffer();
  const sorted = Uint8Array.from(grey).sort();
  return {
    median: sorted[Math.floor(sorted.length * 0.5)],
    high: sorted[Math.floor(sorted.length * 0.99)],
  };
}

async function normalizeFile(filePath) {
  /* 윈도우에서는 sharp 가 파일을 잡고 있는 동안 같은 경로에 쓸 수 없다.
     통째로 읽어 버퍼로 다룬 뒤 쓴다 */
  const original = fs.readFileSync(filePath);
  const before = await measure(sharp(original));
  const stats = await sharp(original).stats();
  const means = stats.channels.slice(0, 3).map((channel) => channel.mean);
  const colourSpread = Math.max(...means) - Math.min(...means);

  /* 검은색을 그대로 두려고 더하기 없이 배율만 쓴다. 과보정을 막으려 배율을 묶는다 */
  const gain = Math.min(2, Math.max(0.5, TONE.high / Math.max(20, before.high)));
  const offset = 0;

  const saturation = colourSpread > TONE.maxColourSpread
    ? Math.max(0.55, TONE.maxColourSpread / colourSpread)
    : 1;

  const buffer = await sharp(original)
    .linear(gain, offset)
    .modulate({ saturation })
    .webp({ quality: 78 })
    .toBuffer();
  fs.writeFileSync(filePath, buffer);

  const after = await measure(sharp(buffer));
  return { before, after, gain: Math.round(gain * 100) / 100, saturation: Math.round(saturation * 100) / 100 };
}
// #endregion

async function generate(world, role) {
  const taskId = `fnworld-${world.id}-${role}-${Date.now().toString(36)}`;
  const promptPath = path.join(WORK_DIR, `${world.id}-${role}.txt`);
  const outMessage = path.join(WORK_DIR, `${world.id}-${role}.out.txt`);
  const prompt = `TASK-ID: ${taskId}

Generate ONE ultra-photorealistic environmental photograph.

${COMMON(world[role], world.light, role)}

Return the image. Do not run any shell command.`;

  fs.writeFileSync(promptPath, prompt, "utf8");

  const codex = await resolveCodex();
  /* 프롬프트는 argv 가 아니라 stdin 으로 넣는다(따옴표·줄바꿈이 깨지지 않게).
     execFile 은 stdin 리다이렉트를 못 하므로 셸 명령으로 부른다. */
  const command = `"${codex}" exec - -m gpt-5.6-sol --skip-git-repo-check `
    + `-s read-only --dangerously-bypass-approvals-and-sandbox `
    + `--output-last-message "${outMessage}" --color never < "${promptPath}"`;
  try {
    await execAsync(command, {
      cwd: REPO, maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000, windowsHide: true,
    });
  } catch (error) {
    // codex 는 자체 도구 오류로 비정상 종료해도 그림은 남긴다. 회수 단계에서 판정한다
    if (!error.stdout && !error.stderr) throw error;
  }

  const sessionId = findSessionId(taskId);
  if (!sessionId) return { ok: false, reason: "세션을 찾지 못했다(한도 소진 의심)" };
  const image = newestImage(sessionId);
  if (!image) return { ok: false, reason: "세션에 그림이 없다" };

  const meta = await sharp(image).metadata();
  if (meta.width < 1024) return { ok: false, reason: `해상도 미달 ${meta.width}x${meta.height}` };

  const band = BAND[role];
  /* 주제가 아래로 몰려 나온 세계는 자르는 위치를 따로 준다 */
  const bandTop = world.bandTop?.[role] ?? band.top;
  const top = Math.max(0, Math.min(bandTop, meta.height - band.height));
  const height = Math.min(band.height, meta.height - top);
  const outPath = path.join(OUT_DIR, `${world.id}-${role}.webp`);
  await sharp(image).extract({ left: 0, top, width: meta.width, height }).webp({ quality: 78 }).toFile(outPath);
  await normalizeFile(outPath);

  const size = Math.round(fs.statSync(outPath).size / 1024);
  return { ok: true, size, source: image };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };
  const role = flag("--role") ?? "pc";
  const force = args.includes("--force");
  const limit = Number(flag("--limit") ?? 0);
  const only = flag("--only")?.split(",").map((value) => value.trim()).filter(Boolean) ?? null;

  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  /* 코덱스가 남긴 원본에서 잘라내기·톤 보정을 다시 한다. 생성 비용이 들지 않는다.
     보정 방식을 바꿨을 때 이미 손댄 파일에 겹쳐 손대지 않으려면 이쪽을 쓴다 */
  if (args.includes("--rebuild")) {
    const list = only ? WORLDS.filter((world) => only.includes(world.id)) : WORLDS;
    let done = 0;
    for (const world of list) {
      const sessionId = findSessionId(`fnworld-${world.id}-${role}-`);
      const image = sessionId ? newestImage(sessionId) : null;
      if (!image) { console.log(`  건너뜀 ${world.id} — 원본을 못 찾았다`); continue; }
      const meta = await sharp(image).metadata();
      const band = BAND[role];
      const bandTop = world.bandTop?.[role] ?? band.top;
      const top = Math.max(0, Math.min(bandTop, meta.height - band.height));
      const outPath = path.join(OUT_DIR, `${world.id}-${role}.webp`);
      await sharp(image).extract({ left: 0, top, width: meta.width, height: Math.min(band.height, meta.height - top) })
        .webp({ quality: 78 }).toFile(outPath);
      const result = await normalizeFile(outPath);
      done += 1;
      console.log(`  ${world.id.padEnd(22)} 상위1% ${String(result.before.high).padStart(3)}→${String(result.after.high).padStart(3)}  배율 ${result.gain}  채도 ${result.saturation}`);
    }
    console.log(`[세계 배너] 원본에서 다시 만듦 ${done}장`);
    return;
  }

  /* 이미 있는 그림의 톤만 맞춘다. 같은 목표 값으로 수렴하므로 여러 번 돌려도 안전하다 */
  if (args.includes("--normalize-only")) {
    const files = fs.readdirSync(OUT_DIR).filter((name) => name.endsWith(`-${role}.webp`)).sort();
    for (const name of files) {
      const result = await normalizeFile(path.join(OUT_DIR, name));
      console.log(`  ${name.replace(`-${role}.webp`, "").padEnd(22)} 중앙 ${String(result.before.median).padStart(3)}→${String(result.after.median).padStart(3)}`
        + `  상위1% ${String(result.before.high).padStart(3)}→${String(result.after.high).padStart(3)}`
        + `  배율 ${result.gain}  채도 ${result.saturation}`);
    }
    console.log(`[세계 배너] 톤 보정 ${files.length}장`);
    return;
  }

  let targets = WORLDS.filter((world) => (only ? only.includes(world.id) : true));
  if (!force) {
    targets = targets.filter((world) => !fs.existsSync(path.join(OUT_DIR, `${world.id}-${role}.webp`)));
  }
  if (limit > 0) targets = targets.slice(0, limit);

  console.log(`[세계 배너] ${role} 대상 ${targets.length}건 / 전체 ${WORLDS.length}`);
  if (targets.length === 0) return;

  const results = { ok: 0, fail: 0 };
  for (let index = 0; index < targets.length; index += CONCURRENCY) {
    const chunk = targets.slice(index, index + CONCURRENCY);
    await Promise.all(chunk.map(async (world) => {
      const started = Date.now();
      try {
        const result = await generate(world, role);
        const seconds = Math.round((Date.now() - started) / 1000);
        if (result.ok) {
          results.ok += 1;
          console.log(`  ok   ${world.id}-${role} ${result.size}KB ${seconds}초`);
        } else {
          results.fail += 1;
          console.log(`  실패 ${world.id}-${role} ${result.reason} ${seconds}초`);
        }
      } catch (error) {
        results.fail += 1;
        console.log(`  실패 ${world.id}-${role} ${String(error.message).slice(0, 200)}`);
      }
    }));
  }

  console.log(`[세계 배너] 성공 ${results.ok} · 실패 ${results.fail}`);
}

main();
