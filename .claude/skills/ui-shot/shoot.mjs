/*
  화면 점검용 캡처 — 유저 브라우저와 무관한 별도 브라우저를 띄운다.
  사용: node .claude/skills/ui-shot/shoot.mjs <url> <mobile|tablet|desktop> <출력폴더> [--full]
*/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const require = createRequire(resolve(process.cwd(), "package.json"));
const puppeteer = require("puppeteer");

const [, , url, mode = "mobile", outDir = ".tmp/shots", ...rest] = process.argv;
const fullPage = rest.includes("--full");

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

const vp = VIEWPORTS[mode];
if (!url || !vp) {
  console.error("사용: node shoot.mjs <url> <mobile|tablet|desktop> <출력폴더> [--full]");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90_000 });

  // 지연 로드가 자리를 잡도록 한 번 훑어 내린 뒤 위로 돌아온다
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1500));

  const meta = await page.evaluate(() => ({
    pageH: document.body.scrollHeight,
    innerW: window.innerWidth,
    sections: [...document.querySelectorAll("section[id]")].map((s) => ({
      id: s.id,
      top: Math.round(s.getBoundingClientRect().top + window.scrollY),
      h: Math.round(s.getBoundingClientRect().height),
    })),
  }));

  const shots = [];

  if (fullPage) {
    const file = join(outDir, `${mode}-full.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(file);
  } else {
    // 구획이 없으면 화면 높이 단위로 처음부터 끝까지 자른다
    const targets = meta.sections.length
      ? meta.sections
      : Array.from({ length: Math.ceil(meta.pageH / vp.height) }, (_, i) => ({
          id: `p${i + 1}`,
          top: i * vp.height,
          h: vp.height,
        }));

    for (const s of targets) {
      const parts = Math.max(1, Math.ceil(s.h / vp.height));
      for (let i = 0; i < parts; i++) {
        const name = parts > 1 ? `${s.id}-${i + 1}` : s.id;
        const file = join(outDir, `${mode}-${name}.png`);
        await page.evaluate((y) => window.scrollTo(0, y), s.top + i * vp.height);
        await new Promise((r) => setTimeout(r, 450));
        await page.screenshot({ path: file });
        shots.push(file);
      }
    }
  }

  console.log(JSON.stringify({ ...meta, shots }, null, 1));
} finally {
  await browser.close();
}
