import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { sceneCaptionPages } from "./sceneCaptionPages";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
type FixtureBuilder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void;
};

test("문장 쪽은 대사를 나누지 않고 원문의 개행과 문장 사이 공백을 보존한다", () => {
  const text = '먼 길을 떠났다.  바다를 건넜다.\r\n\r\n오디세우스: "집으로 가겠다. 기다려라!"';
  const pages = sceneCaptionPages(text);
  assert.equal(pages.length, 3);
  assert.equal(pages.map(page => page.separator + page.text).join(""), text);
  assert.equal(pages[2].text, '오디세우스: "집으로 가겠다. 기다려라!"');
});

test("페이지 번역으로 교체된 전체 스토리 DOM은 문장·장면·표시 모드·엔딩 이동 뒤에도 유지된다", async () => {
  const output = await build({
    absWorkingDir: fileURLToPath(new URL("../../../../", import.meta.url)),
    tsconfig: fileURLToPath(new URL("../../../../tsconfig.json", import.meta.url)),
    stdin: {
      resolveDir: fileURLToPath(new URL("./", import.meta.url)),
      loader: "tsx",
      contents: `
        import { createRoot } from 'react-dom/client';
        import Viewer from './FactionArtworkViewer';
        const pixel = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>');
        const images = [
          { url: pixel + '#cover', label: '표지', kind: 'scene', caption: '이야기를 시작한다.' },
          { url: pixel + '#one', label: '첫 장면', kind: 'scene', caption: '먼 길을 떠났다. 바다를 건넜다.\\n오디세우스: "집으로 가겠다."' },
          { url: pixel + '#two', label: '둘째 장면', kind: 'scene', caption: '고향에 도착했다.', ending: { title: '그 후의 이야기', text: '마침내 집으로 돌아왔다.' } },
        ];
        createRoot(document.getElementById('root')).render(<Viewer images={images} title="이야기" initialIndex={1} onClose={() => {}} />);
      `,
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", loader: { ".css": "empty" },
    plugins: [{
      name: "browser-fixture",
      setup(builder: FixtureBuilder) {
        builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
        builder.onResolve({ filter: /^(next\/image|next-intl)$/ }, (args: { path: string }) => ({ path: args.path, namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args: { path: string }) => ({
          loader: "jsx",
          contents: args.path === "next-intl"
            ? `import messages from '${fileURLToPath(new URL("../../../../messages/ko/explore.json", import.meta.url)).replaceAll("\\", "/")}';
              export const useTranslations = (namespace) => (key) => {
                const value = (namespace + '.' + key).split('.').reduce((value, part) => value?.[part], messages);
                return typeof value === 'string' ? value : key;
              };`
            : "import React from 'react'; export default function Image({fill, unoptimized, fetchPriority, ...props}) { return <img {...props}/>; }",
          resolveDir: fileURLToPath(new URL("./", import.meta.url)),
        }));
      },
    }],
  });
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const cssRequire = createRequire(require.resolve("@tailwindcss/postcss"));
    const css = await cssRequire("postcss")([require("@tailwindcss/postcss")()]).process(
      '@import "tailwindcss" source(none); @source "./src/components/features/faction"; @theme { --color-bg-main: #121110; --color-accent: #d4af37; --color-text-primary: #eee; --color-text-secondary: #aaa; --color-reading-active: #8ad8ab; }',
      { from: fileURLToPath(new URL("../../../../story-fixture.css", import.meta.url)) },
    );
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.setContent('<html lang="ko"><body><div id="root"></div></body></html>');
    await page.addStyleTag({ content: css.css });
    await page.addScriptTag({ content: output.outputFiles[0].text });
    await page.waitForSelector("[data-story-page]");
    const original = await page.evaluate(() => ({
      pages: document.querySelectorAll("[data-story-page]").length,
      endings: document.querySelectorAll("[data-scene-ending]").length,
      titles: document.querySelectorAll("[data-story-title]").length,
    }));
    assert.deepEqual(original, { pages: 5, endings: 1, titles: 4 });
    // 브라우저 번역처럼 Text를 font 요소로 교체한다. 이후 React가 그 글을 다시 쓰거나 버리면 실패한다.
    await page.evaluate(() => {
      const targets = document.querySelectorAll("[data-story-caption], [data-story-title], [data-scene-ending]");
      const saved: HTMLElement[] = [];
      for (const target of targets) {
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        for (const node of nodes) {
          if (!node.textContent?.trim()) continue;
          const translated = document.createElement("font");
          translated.textContent = `TRANSLATED: ${node.textContent}`;
          node.replaceWith(translated);
          saved.push(translated);
        }
      }
      (window as unknown as { translated: HTMLElement[] }).translated = saved;
    });
    for (const [action, sceneIndex] of [["next", 1], ["select", 1], ["close-select", 1], ["all", 1], ["next", 2], ["previous", 1], ["split", 1], ["end", 3], ["home", 0]] as const) {
      await page.evaluate(action => {
        if (action === "select") (document.querySelector("[data-artwork-caption][role=button]") as HTMLElement).click();
        else if (action === "close-select") (document.querySelector("[data-caption-select-close]") as HTMLElement).click();
        else if (action === "all" || action === "split") (document.querySelector("[data-scene-captions]") as HTMLElement).click();
        else document.dispatchEvent(new KeyboardEvent("keydown", { key: { next: "ArrowRight", previous: "ArrowLeft", end: "End", home: "Home" }[action], bubbles: true }));
      }, action);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      await page.waitForFunction(() => (window as unknown as { translated: HTMLElement[] }).translated.every(node => node.isConnected && node.textContent?.startsWith("TRANSLATED:")));
      assert.equal(await page.evaluate(sceneIndex => document.querySelector(`[data-story-title="${sceneIndex}"]`)?.getAttribute("aria-hidden"), sceneIndex), null, action);
      assert.deepEqual(errors, [], `${action} must not break translated DOM`);
    }
    assert.equal(await page.evaluate(() => document.querySelector('[data-story-title="0"]')?.getAttribute("aria-hidden")), null);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-story-page]").length), original.pages);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewport(viewport);
      await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      const bounds = await page.evaluate(() => {
        const active = document.querySelector('[data-story-caption]:not([aria-hidden]) [data-story-page]:not([aria-hidden])')!;
        const rect = active.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
      });
      assert.ok(bounds.left >= 0 && bounds.right <= bounds.width, JSON.stringify(bounds));
      assert.ok(bounds.top >= 0 && bounds.bottom < bounds.height, JSON.stringify(bounds));
      if (process.env.FN_STORY_SCREENSHOT_DIR) {
        await mkdir(process.env.FN_STORY_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.FN_STORY_SCREENSHOT_DIR, `story-${viewport.width}.png`) });
      }
    }
  } finally {
    await browser.close();
  }
});
