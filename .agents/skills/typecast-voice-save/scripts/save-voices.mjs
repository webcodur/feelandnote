#!/usr/bin/env node
// 이미 만든 스튜디오 프로젝트를 끝까지 재생시키고, 브라우저가 받아 오는 음원을 줄마다 wav로 저장한다.
// 사용: node save-voices.mjs --url <스튜디오 프로젝트 주소> --out <저장 폴더> [--prefix line]
import { resolve } from "node:path";
import { parseArgs, printFiles, runEgo } from "./ego-run.mjs";

const a = parseArgs();
if (!a.url?.startsWith("https://studio.typecast.ai/") || !a.out) {
  console.error("사용: node save-voices.mjs --url https://studio.typecast.ai/text-to-speech/<id> --out <저장 폴더> [--prefix line]");
  process.exit(2);
}

const { paragraphs, files } = runEgo(async (P, lib) => {
  const fs = await import("node:fs/promises");
  return lib.withTask(`typecast voice save ${Date.now()}`, async (task) => {
    const page = await lib.openProject(task, P.url);
    const paragraphs = await lib.countParagraphs(page);
    const bufs = await lib.playAndCollect(page);
    await fs.mkdir(P.out, { recursive: true });
    const files = [];
    for (const [i, buf] of bufs.entries()) {
      const file = `${P.out}/${P.prefix}-${String(i + 1).padStart(2, "0")}.wav`;
      await fs.writeFile(file, buf);
      files.push({ n: i + 1, file, ...lib.wavInfo(buf) });
    }
    return { paragraphs, files };
  });
}, { url: a.url, out: resolve(a.out).replace(/\\/g, "/"), prefix: a.prefix || "line" });

printFiles(files);
if (paragraphs !== null && paragraphs !== files.length) console.warn(`경고: 대본 ${paragraphs}줄인데 음원 ${files.length}개를 받았다. 줄 순서와 개수를 확인한다.`);
