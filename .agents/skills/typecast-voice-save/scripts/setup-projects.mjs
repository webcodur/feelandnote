#!/usr/bin/env node
// 이 컴퓨터·이 계정의 시험용 프로젝트를 맞춘다. 로그인을 확인하고, 이름이 같은 프로젝트를 찾고, 없으면 만들어 목록 파일을 쓴다.
// 프로젝트 주소는 계정마다 다르다. 다른 컴퓨터·다른 계정에서 처음 쓸 때 한 번 돌린다(이미 있으면 찾기만 한다).
// 사용: node setup-projects.mjs --out <목록 파일.json> [--names test,test2,test3]
// 로그인은 ego 기본 프로필의 것을 쓴다. 로그인돼 있지 않으면 ego 에서 사용자가 로그인한 뒤 다시 돌린다(비밀번호를 다루지 않는다).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, runEgo } from "./ego-run.mjs";

const a = parseArgs();
if (!a.out) { console.error("사용: node setup-projects.mjs --out <목록 파일.json> [--names test,test2,test3]"); process.exit(2); }
const names = (a.names || "test,test2,test3").split(",").map((s) => s.trim()).filter(Boolean);

const r = runEgo(async (P, lib) => lib.withTask(`typecast setup projects ${Date.now()}`, async (task) => {
  const page = task.page("p1");
  const list = async () => {
    await page.goto("https://studio.typecast.ai/text-to-speech", { timeout: 60000 });
    for (let t = 0; t < 30; t++) {
      const ready = await page.evaluate(() => [...document.querySelectorAll("button,a")].some((b) => (b.innerText || "").trim() === "새 프로젝트"));
      if (ready) break;
      await page.waitForTimeout(500);
    }
    return page.evaluate(() => ({
      url: location.href,
      ready: [...document.querySelectorAll("button,a")].some((b) => (b.innerText || "").trim() === "새 프로젝트"),
      projects: [...document.querySelectorAll('a[href*="/text-to-speech/"]')].map((el) => ({ href: el.getAttribute("href"), name: (el.innerText || "").trim().split("\n")[0].trim() })),
    }));
  };
  let s = await list();
  if (!s.ready) return { error: `스튜디오 프로젝트 목록이 열리지 않는다(로그인 필요?): ${s.url}` };
  const found = {};
  for (const p of s.projects) if (P.names.includes(p.name) && !found[p.name]) found[p.name] = p.href;
  const made = [];
  for (const name of P.names.filter((n) => !found[n])) {
    await page.click("text=새 프로젝트", { label: "new project" });
    await page.waitForSelector("[role=dialog] input", { timeout: 10000 });
    await page.fill("[role=dialog] input", name);
    await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelector("[role=dialog]").querySelectorAll("button")].find((b) => b.innerText.trim() === "확인")?.click());
    for (let t = 0; t < 40 && !/\/text-to-speech\/[0-9a-f]{24}/.test(await page.evaluate(() => location.href)); t++) await page.waitForTimeout(500);
    const url = await page.evaluate(() => location.href);
    if (!/\/text-to-speech\/[0-9a-f]{24}/.test(url)) return { error: `「${name}」 프로젝트를 만들지 못했다` };
    found[name] = new URL(url).pathname;
    made.push(name);
    s = await list();
  }
  return { found, made };
}), { names });

if (r.error) { console.error(r.error); process.exit(1); }
const out = resolve(a.out);
const prev = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
const projects = names.map((n) => `https://studio.typecast.ai${r.found[n]}`);
writeFileSync(out, JSON.stringify({ about: prev.about || "타입캐스트 음성 받기에 쓰는 스튜디오 시험용 프로젝트(이 컴퓨터·이 계정 것, 저장소에 올리지 않는다). 일꾼 하나가 프로젝트 하나를 맡는다. setup-projects.mjs 가 쓴다.", projects }, null, 1) + "\n");
console.log(`프로젝트 ${projects.length}개${r.made.length ? ` (새로 만듦: ${r.made.join(", ")})` : ""} → ${out}`);
for (const [i, u] of projects.entries()) console.log(`  ${names[i]}  ${u}`);
