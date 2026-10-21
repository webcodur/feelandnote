import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../../../../", import.meta.url));

async function fixture() {
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, outdir: "fixture", write: false,
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    stdin: { resolveDir: appDir, loader: "tsx", contents: `
      import { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import Picker from './src/components/features/user/explore/myth/AtlasPicker';
      const entry = (id, name, href) => ({ id, name, href, count: 5, groups: [{id:'g1',name:'Group One',count:3},{id:'g2',name:'Group Two',count:2}] });
      window.mockTrees = {
        myth: [{id:'region',name:'그리스·로마',entries:[entry('first','오디세이아','/explore/myth/first'),entry('second','헤라클레스','/explore/myth/second'),{id:'disabled',name:'미공개 신화',disabled:true,groups:[]}]}],
        faction: [{id:'region',name:'Technology',entries:[entry('first','OpenAI','/explore/faction/first'),entry('second','Anthropic','/explore/faction/second')]}],
      };
      window.applied = []; window.routes = [];
      function Harness() {
        const [open,setOpen] = useState(true);
        const myth = !location.search.includes('faction');
        return open && <Picker tree={window.mockTrees[myth?'myth':'faction']} selection={{themeId:'region',entryId:'first',groupId:null}} initialLevel={1} myth={myth}
          onSelect={selection=>window.applied.push(selection)} onClose={()=>setOpen(false)} />;
      }
      createRoot(document.getElementById('root')).render(<Harness/>);`,
    },
    plugins: [{ name: "atlas-picker-fixture", setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void;
    }) {
      const mocks: Record<string, string> = {
        "next-intl": `import messages from './messages/ko/explore.json';
          export const useLocale=()=> 'ko';
          export const useTranslations=namespace=>(key,values={})=>{
            if(namespace==='shared.accessibility') return key==='close'?'닫기':key;
            const dict=namespace.split('.').reduce((value,part)=>value?.[part],messages);
            return String(dict?.[key]??key).replace(/\\{(\\w+)\\}/g,(_,name)=>values[name]??'');
          };`,
        "@/i18n/navigation": "export const useRouter=()=>({push:href=>window.routes.push(href)});",
        "@/actions/home/getAtlasNavigation": "export const getAtlasNavigation=async myth=>window.mockTrees[myth?'myth':'faction'];",
      };
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: appDir }));
    } }],
  });
  const cssRequire = createRequire(require.resolve("@tailwindcss/postcss"));
  const css = await cssRequire("postcss")([require("@tailwindcss/postcss")()]).process(
    '@import "tailwindcss" source(none); @source "./src/components/features/user/explore/myth/AtlasPicker*.tsx"; @source "./src/components/ui/Modal.tsx"; @source "./src/components/ui/modalLayout.ts"; @source "./src/components/features/faction/entry/factionPersonLayout.ts"; @theme { --color-bg-main:#10100f; --color-bg-card:#1b1a18; --color-bg-secondary:#171614; --color-text-primary:#f3eee5; --color-text-secondary:#aaa79d; --color-text-tertiary:#77746d; --color-accent:#d7bd78; --color-accent-hover:#ead28b; --color-line:#38352f; }',
    { from: path.join(appDir, "atlas-picker-fixture.css") },
  );
  return {
    js: output.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text,
    css: css.css + output.outputFiles.find((file: { path: string }) => file.path.endsWith(".css")).text,
  };
}

test("atlas chips select once, pulse confirmation, and apply only through the fixed footer", async t => {
  const bundle = await fixture();
  const reviewDir = process.env.ATLAS_PICKER_REVIEW_DIR;
  if (reviewDir) await mkdir(reviewDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.setRequestInterception(true);
    page.on("request", request => { void request.respond({ contentType: "text/html", body: '<html lang="ko"><body style="margin:0;background:#10100f;color:#f3eee5"><div id="root"></div></body></html>' }); });
    const visit = async (world: string, width = 390, height = 844) => {
      // Modal close removes its history entry asynchronously; finish that before replacing the fixture document.
      await page.waitForFunction(() => !history.state?.__feelandnoteModal, { timeout: 5000 });
      await page.setViewport({ width, height });
      await page.goto(`http://atlas.test/?${world}`);
      await page.addStyleTag({ content: bundle.css });
      await page.addScriptTag({ content: bundle.js });
      await page.waitForSelector('[data-atlas-option="second"]', { timeout: 5000 }).catch(() => {
        throw new Error(`Picker did not render: ${errors.join("\n")}`);
      });
    };
    for (const world of ["myth", "faction"]) {
      for (const width of [390, 1440]) {
        await t.test(`${world} ${width}px`, async () => {
          await visit(world, width);
          assert.equal((await page.$$('[data-atlas-confirm]')).length, 1);
          assert.equal((await page.$$('[data-atlas-picker-header] [data-atlas-confirm]')).length, 0);
          assert.equal((await page.$$('[data-atlas-picker-footer] [data-atlas-confirm]')).length, 1);
          assert.equal(await page.$eval('[data-atlas-confirm]', element => element.textContent?.trim()), "선택 완료");
          assert.equal((await page.$$('[data-atlas-picker] h2, #atlas-picker-hint')).length, 0);
          await page.click('[data-atlas-option="second"]');
          assert.equal(await page.$eval('[data-atlas-option="second"]', e => e.getAttribute("aria-pressed")), "true");
          assert.ok(await page.$('[data-atlas-confirm-pulse]'));
          assert.deepEqual(await page.$eval('[data-atlas-confirm-pulse]', e => ({
            duration: getComputedStyle(e).animationDuration,
            iterations: getComputedStyle(e).animationIterationCount,
            buttonTransform: getComputedStyle(e.parentElement!).transform,
          })), { duration: "0.65s", iterations: "2", buttonTransform: "none" });
          if (reviewDir && world === "myth") {
            const dialog = await page.$('[role="dialog"]');
            await writeFile(path.join(reviewDir, `atlas-picker-utility-panel-${width}.png`), await dialog!.screenshot(), { flag: "wx" });
          }
          await page.click('[data-atlas-option="second"]');
          assert.equal(await page.$eval('[data-atlas-panel]', e => e.getAttribute("data-atlas-column")), "1");
          assert.equal(await page.evaluate(() => (window as unknown as { applied: unknown[] }).applied.length), 0);
          await page.click('[data-atlas-tab="2"]');
          await page.waitForSelector('[data-atlas-option="g2"]');
          await page.waitForFunction(() => !document.querySelector('[role="dialog"]')!.getAnimations({ subtree: true }).some(animation => animation.playState === "running"));
          await page.click('[data-atlas-option="g2"]');
          await page.click('[data-atlas-option="g2"]');
          assert.ok(await page.$('[role="dialog"]'));
          assert.equal(await page.evaluate(() => (window as unknown as { applied: unknown[] }).applied.length), 0);
          const bounds = await page.$eval('[data-atlas-picker-footer]', e => {
            const footer = e.getBoundingClientRect();
            const dialog = e.closest('[role="dialog"]')!.getBoundingClientRect();
            const confirm = e.querySelector('[data-atlas-confirm]')!.getBoundingClientRect();
            return footer.left >= dialog.left - 1 && footer.right <= dialog.right + 1 && confirm.left >= footer.left && confirm.right <= footer.right && confirm.bottom <= dialog.bottom;
          });
          assert.ok(bounds, "footer confirmation stays visible within the modal");
          await page.click('[data-atlas-confirm]');
          await page.waitForSelector('[role="dialog"]', { hidden: true });
          assert.deepEqual(await page.evaluate(() => (window as unknown as { applied: unknown[] }).applied), [{ themeId: "region", entryId: "second", groupId: "g2" }]);
        });
      }
    }
    await t.test("search selection pulses confirmation; switching world keeps search and routes only on confirmation", async () => {
      await visit("myth", 390, 480);
      await page.type('input[type="search"]', "Anthropic");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-atlas-worlds]')!).visibility === "visible");
      await page.click('[data-atlas-worlds] button:last-child');
      await page.waitForSelector('[data-atlas-option="second"]');
      assert.equal(await page.$eval('input[type="search"]', e => (e as HTMLInputElement).value), "Anthropic");
      await page.focus('input[type="search"]');
      await page.keyboard.press("Enter");
      await page.waitForSelector('[data-atlas-confirm-pulse]');
      assert.equal(await page.$eval('[data-atlas-option="second"]', e => e.getAttribute("aria-pressed")), "true");
      assert.equal(await page.evaluate(() => (window as unknown as { routes: string[] }).routes.length), 0);
      await page.click('[data-atlas-confirm]');
      assert.deepEqual(await page.evaluate(() => (window as unknown as { routes: string[] }).routes), ["/explore/faction/second"]);
    });
    await t.test("close discards the draft", async () => {
      await visit("myth");
      await page.click('[data-atlas-option="second"]');
      await page.click('[aria-label="닫기"]');
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      assert.equal(await page.evaluate(() => (window as unknown as { applied: unknown[] }).applied.length), 0);
    });
    await t.test("reduced motion disables the pulse animation", async () => {
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await visit("myth");
      await page.click('[data-atlas-option="second"]');
      assert.equal(await page.$eval('[data-atlas-confirm-pulse]', e => getComputedStyle(e).animationName), "none");
    });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
