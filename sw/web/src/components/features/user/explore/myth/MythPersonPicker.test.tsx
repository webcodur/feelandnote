import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../../../../", import.meta.url));

async function fixture() {
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, outdir: "fixture", write: false,
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    stdin: {
      resolveDir: appDir, loader: "tsx", contents: `
        import { useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { flushSync } from 'react-dom';
        import Picker from './src/components/features/user/explore/myth/members/AtlasMemberList';
        import ViewToggle from './src/components/features/user/explore/myth/members/AtlasMemberViewToggle';
        const image = (color, tag) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="' + color + '"/><circle cx="200" cy="180" r="65" fill="#dbc5a0"/><path d="M70 500V390a130 130 0 0 1 260 0v110" fill="#565b50"/></svg>') + '#' + tag;
        const avatar = image('#343a30', 'avatar');
        const person = (id, name, fields = {}) => ({ id, name, title: '인물 소개', bio: '일반 약력으로 대체하지 않음', summary: '다른 도감의 대표 설명', avatarUrl: avatar, portraitUrl: null, imageUrl: null, appearances: [], ...fields });
        const people = [
          person('avatar', '작은 얼굴'),
          person('portrait', '대표사진', { portraitUrl: image('#6f6550', 'portrait'), appearances: [{ mythId: 'other', summary: '다른 도감 설명' }] }),
          person('empty', '사진 없음', { avatarUrl: null }),
          person('theme', '전용 사진', { portraitUrl: image('#604d49', 'alternate'), appearances: [{ mythId: 'other', summary: '다른 도감 설명' }, { mythId: 'theme', summary: '이 도감에서 맡은 역할.\\n\\n해당 인물의 두 번째 문단.', imageUrl: image('#4a565d', 'scene') }] }),
          person('same-avatar', '아바타만 등록', { imageUrl: avatar }),
        ];
        function Harness() {
          const [imageMode, setImageMode] = useState('portrait');
          const [showDescription, setShowDescription] = useState(false);
          const [members, setMembers] = useState(people);
          const [selectedId, onSelect] = useState(null);
          window.setMode = value => flushSync(() => {
            setShowDescription(value === 'description');
            if(value !== 'description') setImageMode(value);
          });
          window.resetList = () => flushSync(() => setMembers(people));
          window.longList = () => flushSync(() => setMembers(Array.from({ length: 15 }, (_, index) => person('person-' + index, '인물 ' + index, index >= 10 ? { portraitUrl: image('#6f6550', 'photo-' + index) } : {}))));
          return <><ViewToggle showDescription={showDescription} imageMode={imageMode} onDescriptionChange={setShowDescription} onImageModeChange={setImageMode}/>
            <Picker people={members} name="구성원" mythId="theme" listKey="theme-all" showDescription={showDescription} imageMode={imageMode} selectedId={selectedId} onSelect={onSelect}/></>;
        }
        createRoot(document.getElementById('root')).render(<Harness/>);`,
    },
    plugins: [{
      name: "picker-fixture",
      setup(builder: {
        onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
        onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void;
      }) {
        builder.onResolve({ filter: /^next-intl$/ }, args => ({ path: args.path, namespace: "fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const useTranslations = () => (key, values) => key === 'expandMembers' ? '모두 보기 (' + values.count + ')' : key === 'collapseMembers' ? '접기' : key;`, loader: "js",
        }));
      },
    }],
  });
  const cssRequire = createRequire(require.resolve("@tailwindcss/postcss"));
  const css = await cssRequire("postcss")([require("@tailwindcss/postcss")()]).process(
    '@import "tailwindcss" source(none); @source "./src/components/features/user/explore/myth/MythPersonPicker.tsx"; @source "./src/components/features/user/explore/myth/members/*.tsx"; @source "./src/components/features/user/explore/myth/mythLayout.ts"; @source "./src/components/shared/celebGridLayout.ts"; @source "./src/components/shared/PortraitPersonStepper.tsx"; @theme { --color-bg-main:#10100f; --color-bg-card:#1b1a18; --color-bg-secondary:#22211e; --color-text-primary:#f3eee5; --color-text-secondary:#aaa79d; --color-accent:#d7bd78; }',
    { from: path.join(appDir, "picker-fixture.css") },
  );
  return {
    js: output.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text,
    css: css.css + output.outputFiles.find((file: { path: string }) => file.path.endsWith(".css")).text,
  };
}

test("member views preserve photo fallback and pair each figure with the current atlas description", async t => {
  const bundle = await fixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const width of [390, 1440]) {
      await t.test(`${width}px`, async () => {
        const page = await browser.newPage();
        try {
          const errors: string[] = [];
          page.on("pageerror", error => errors.push(String(error)));
          await page.setViewport({ width, height: 844 });
          await page.setContent('<html lang="ko"><body style="margin:0;padding:24px 16px;background:#10100f;color:#f3eee5"><main style="max-width:1100px;margin:auto"><div id="root"></div></main></body></html>');
          await page.addStyleTag({ content: bundle.css });
          await page.addScriptTag({ content: bundle.js });
          await page.waitForSelector('[data-person-id="same-avatar"]');
          const ids = (layout: string) => page.$$eval(`[data-person-layout="${layout}"] [data-person-id]`, cards => cards.map(card => card.getAttribute("data-person-id")));
          assert.deepEqual(await ids("portrait"), ["portrait", "theme"]);
          assert.deepEqual(await ids("compact"), ["avatar", "empty", "same-avatar"]);
          const bounds = await page.evaluate(() => {
            const photo = document.querySelector('[data-person-layout="portrait"]')!.getBoundingClientRect();
            const compact = document.querySelector('[data-person-layout="compact"]')!.getBoundingClientRect();
            const card = document.querySelector('[data-person-layout="compact"] button > span')!.getBoundingClientRect();
            return { bottom: photo.bottom, top: compact.top, width: card.width, height: card.height };
          });
          assert.ok(bounds.top > bounds.bottom, "compact group must start below all portrait cards");
          assert.ok(Math.abs(bounds.width - bounds.height) < 1, "compact card must be square");
          assert.ok(bounds.width < (width === 390 ? 120 : 190), "compact cards must keep avatar grid sizing");
          if (process.env.FN_PICKER_SCREENSHOT_DIR) {
            await mkdir(process.env.FN_PICKER_SCREENSHOT_DIR, { recursive: true });
            await page.screenshot({ path: path.join(process.env.FN_PICKER_SCREENSHOT_DIR, `members-${width}.png`), fullPage: true });
          }
          await page.evaluate(() => (document.querySelector('[data-person-id="theme"]') as HTMLElement).click());
          for (let attempt = 0; attempt < 2; attempt++) {
            await page.$eval('[data-person-id="theme"] img', image => image.dispatchEvent(new Event("error")));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          }
          assert.deepEqual(await ids("portrait"), ["portrait"]);
          assert.deepEqual(await ids("compact"), ["avatar", "empty", "theme", "same-avatar"]);
          assert.equal(await page.$eval('[data-person-id="theme"]', card => card.getAttribute("aria-pressed")), "true");
          assert.equal(await page.$$('[data-person-layout="compact"] [data-portrait-person]').then(cards => cards.length), 0, "portrait stepper must skip the compact grid");
          await page.evaluate(() => (window as unknown as { setMode: (mode: string) => void }).setMode("avatar"));
          assert.deepEqual(await ids("compact"), ["avatar", "portrait", "empty", "theme", "same-avatar"]);
          await page.evaluate(() => (window as unknown as { longList: () => void }).longList());
          await page.evaluate(() => (window as unknown as { setMode: (mode: string) => void }).setMode("portrait"));
          assert.deepEqual(await ids("portrait"), ["person-10", "person-11", "person-12", "person-13", "person-14"]);
          assert.equal((await ids("compact")).length, 7);
          await page.click('button[aria-expanded="false"]');
          assert.equal((await ids("compact")).length, 10);
          await page.click('button[aria-expanded="true"]');
          assert.equal((await ids("compact")).length, 7);
          await page.evaluate(() => {
            const fixture = window as unknown as { resetList: () => void; setMode: (mode: string) => void };
            fixture.resetList(); fixture.setMode("description");
          });
          assert.equal(await page.$$('[data-person-description]').then(cards => cards.length), 5);
          const description = await page.$eval('[data-person-id="theme"]', card => card.textContent!);
          assert.match(description, /이 도감에서 맡은 역할/);
          assert.match(description, /해당 인물의 두 번째 문단/);
          assert.doesNotMatch(description, /다른 도감 설명|일반 약력|대표 설명/);
          assert.equal(await page.$$('[data-person-id="theme"] [data-text-paragraph]').then(paragraphs => paragraphs.length), 2);
          const missing = await page.$eval('[data-person-id="portrait"]', card => card.textContent!);
          assert.match(missing, /empty/);
          assert.doesNotMatch(missing, /다른 도감 설명|일반 약력|대표 설명/);
          const descriptionLayout = await page.$eval('[data-person-id="theme"]', card => ({
            image: card.querySelector('button')!.getBoundingClientRect().toJSON(),
            text: card.lastElementChild!.getBoundingClientRect().toJSON(),
          }));
          if (width === 390) assert.ok(descriptionLayout.text.top >= descriptionLayout.image.bottom);
          else assert.ok(descriptionLayout.text.left > descriptionLayout.image.right);
          await page.click('[data-member-view="avatar"]');
          assert.equal(await page.$$('[data-person-description]').then(cards => cards.length), 5);
          assert.equal(await page.$eval('[data-member-description-toggle]', e => e.getAttribute("aria-checked")), "true");
          assert.match(await page.$eval('[data-person-id="theme"] img', e => (e as HTMLImageElement).src), /#avatar$/);
          assert.equal(await page.$eval('[data-person-id="empty"] [data-portrait-source]', e => e.getAttribute("data-portrait-source")), "initials");
          await page.click('[data-member-description-toggle]');
          assert.equal(await page.$$('[data-person-description]').then(cards => cards.length), 0);
          assert.deepEqual(await ids("compact"), ["avatar", "portrait", "empty", "theme", "same-avatar"]);
          await page.click('[data-member-description-toggle]');
          assert.equal(await page.$eval('[data-person-id="theme"]', e => e.getAttribute("data-member-image")), "avatar");
          await page.click('[data-member-view="portrait"]');
          assert.equal(await page.$eval('[data-member-description-toggle]', e => e.getAttribute("aria-checked")), "true");
          assert.match(await page.$eval('[data-person-id="theme"] img', e => (e as HTMLImageElement).src), /#scene$/);
          if (process.env.FN_PICKER_SCREENSHOT_DIR) {
            const controls = await page.$('[role="group"]:has(> [data-member-description-toggle])');
            await controls!.screenshot({ path: path.join(process.env.FN_PICKER_SCREENSHOT_DIR, `member-controls-${width}.png`) });
          }
          assert.deepEqual(errors, []);
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
