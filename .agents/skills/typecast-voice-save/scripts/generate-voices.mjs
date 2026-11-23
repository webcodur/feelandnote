#!/usr/bin/env node
// [목소리·문장·설정] 목록을 받아 스튜디오 편집기에서 한 줄씩 생성하고 wav로 저장한다.
// 스튜디오 안 생성은 크레딧을 쓰지 않는다. 다운로드 단추는 누르지 않는다.
// 사용: node generate-voices.mjs --url <스튜디오 프로젝트 주소> --job <줄 목록.json> --out <저장 폴더>
// 줄 목록: [{ "voice": "필재", "text": "...", "emotion": "기쁨", "intensity": 120, "speed": 1.1, "pitch": 0, "name": "선택" }]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, printFiles, runEgo } from "./ego-run.mjs";

const DEFAULTS = { emotion: "일반", intensity: 100, speed: 1, pitch: 0 };
const RANGE = { intensity: [0, 200], speed: [0.5, 2], pitch: [-5, 5] };

const a = parseArgs();
if (!a.url?.startsWith("https://studio.typecast.ai/") || !a.job || !a.out) {
  console.error("사용: node generate-voices.mjs --url https://studio.typecast.ai/text-to-speech/<id> --job <줄 목록.json> --out <저장 폴더>");
  process.exit(2);
}
const lines = JSON.parse(readFileSync(a.job, "utf8")).map((l, i) => {
  const L = { ...DEFAULTS, ...l };
  if (!L.voice || !L.text?.trim()) throw new Error(`${i + 1}번 줄: voice와 text가 필요하다`);
  for (const [k, [lo, hi]] of Object.entries(RANGE)) {
    if (!(Number(L[k]) >= lo && Number(L[k]) <= hi)) throw new Error(`${i + 1}번 줄: ${k}는 ${lo}~${hi}다`);
  }
  return L;
});

const { files } = runEgo(async (P, lib) => {
  const fs = await import("node:fs/promises");
  await fs.mkdir(P.out, { recursive: true });
  return lib.withTask(`typecast voice generate ${Date.now()}`, async (task) => {
    const page = await lib.openProject(task, P.url);
    // 열자마자 남아 있던 대본(직전 작업의 마지막 줄)의 음원 요청이 뒤늦게 와 첫 줄에 섞인다(26.11.22: 첫 화면 앞에 앞 편 9번이 붙음). 한 번 재생해 흘려보낸다.
    await lib.playAndCollect(page).catch(() => {});
    const files = [];
    for (const [i, L] of P.lines.entries()) {
      const n = i + 1;
      try {
        await lib.applyLine(page, L);
        let bufs = await lib.playAndCollect(page);
        // 계정 단위 생성 한도(「일정 시간 내 생성 한도를 초과했습니다」)면 실패로 넘기지 않고 기다렸다 같은 줄을 다시 재생한다(1·2·4·8분).
        for (const min of [1, 2, 4, 8]) {
          if (bufs.length || !(await lib.rateLimited(page))) break;
          console.error(`${n}: 생성 한도 — ${min}분 기다린다`);
          await page.waitForTimeout(min * 60000);
          await page.reload({ timeout: 60000 });
          if (await lib.ensureLogin(page)) await page.goto(P.url, { timeout: 60000 }); // 기다리는 사이 로그인이 풀렸으면 다시 들어간다
          await page.waitForSelector('button[aria-label="Play"]', { timeout: 30000 });
          await lib.applyLine(page, L);
          bufs = await lib.playAndCollect(page);
        }
        if (!bufs.length) throw new Error((await lib.rateLimited(page)) ? "생성 한도가 15분 넘게 풀리지 않는다(잠시 뒤 다시 돌린다)" : "새 음원 요청이 없었다(바로 앞 줄과 문장·설정이 같으면 재사용된다)");
        const buf = lib.joinWav(bufs);
        const file = `${P.out}/${L.name || `${String(n).padStart(2, "0")}-${L.voice}`}.wav`;
        await fs.writeFile(file, buf);
        files.push({ n, file, ...lib.wavInfo(buf) });
      } catch (e) {
        files.push({ n, error: e.message });
      }
    }
    return { files };
  });
}, { url: a.url, out: resolve(a.out).replace(/\\/g, "/"), lines });

printFiles(files);
if (files.some((f) => f.error)) process.exit(1);
