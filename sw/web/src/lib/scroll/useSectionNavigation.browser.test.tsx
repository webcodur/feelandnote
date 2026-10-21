import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer, { type Page } from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../", import.meta.url));

async function buildFixture() {
  const mocks: Record<string, string> = {
    "next-intl": `export const useTranslations = () => (key, values) => key + (values?.name ? ' ' + values.name : '');`,
    "@/i18n/navigation": `export const usePathname = () => '/explore/myth/test'; export function Link({ children, ...props }) { return <a {...props}>{children}</a>; }`,
    "@/components/layout/bottomNavDock": `export const useBottomNavDock = () => null;`,
    "@/components/ui/Modal": `export default ({ isOpen, children }) => isOpen ? <div style={{position:'fixed',inset:0,zIndex:100}}>{children}</div> : null;`,
    "./AtlasRailHighlight": `export default () => null;`,
  };
  return build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`,
    stdin: {
      resolveDir: appDir, loader: "tsx", contents: `
        import { StrictMode } from 'react';
        import { createRoot } from 'react-dom/client';
        import AtlasNavSections from './src/components/shared/atlasNav/AtlasNavSections';
        const items = ['selection', 'members', 'shelf', 'index'].map((name, index) => ({
          key: name, label: name, chapter: '0' + (index + 1), sectionId: 'atlas-' + name,
        }));
        createRoot(document.getElementById('root')).render(<StrictMode><AtlasNavSections items={items}/></StrictMode>);
      `,
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{
      name: "atlas-fixture",
      setup(builder: {
        onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
        onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void;
      }) {
        builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
        builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "export default new Proxy({}, { get: (_, key) => key });", loader: "js" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: appDir }));
      },
    }],
  });
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let frame = 0; frame < 5; frame++) await new Promise(resolve => requestAnimationFrame(resolve));
  });
}

test("atlas navigation keeps the final section selected at the page bottom", async t => {
  const output = await buildFixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const scenario of [
      { name: "mobile faction, short final section", width: 390, height: 844, lastHeight: 90, footer: 0 },
      { name: "mobile myth, short final section", width: 430, height: 932, lastHeight: 130, footer: 40 },
      { name: "mobile, tall final section", width: 390, height: 844, lastHeight: 1100, footer: 0 },
      { name: "mobile, tall footer", width: 390, height: 844, lastHeight: 90, footer: 900 },
      { name: "desktop, short final section", width: 1440, height: 900, lastHeight: 90, footer: 0 },
    ]) {
      await t.test(scenario.name, async () => {
        const page = await browser.newPage();
        try {
          page.setDefaultTimeout(2000);
          const errors: string[] = [];
          page.on("pageerror", error => errors.push(String(error)));
          await page.setViewport({ width: scenario.width, height: scenario.height });
          await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
          await page.setContent(`<html><body style="margin:0"><div id="root"></div><main>
            <section id="atlas-selection" style="height:900px">selection</section>
            <section id="atlas-members" style="height:1100px">members</section>
            <section id="atlas-shelf" style="height:400px">shelf</section>
            <section id="atlas-index" style="height:${scenario.lastHeight}px">index</section>
            </main><footer style="height:${scenario.footer}px"></footer></body></html>`);
          await page.addStyleTag({ content: '.atlasRail{display:none}.atlasBar{position:fixed;inset:auto 0 0;background:white}.atlasBarCurrent{min-width:100px}' });
          await page.addScriptTag({ content: output.outputFiles[0].text });
          await page.waitForSelector('.atlasBarLabel');
          await settle(page);
          assert.equal(await page.$eval('.atlasBarLabel', element => element.textContent), 'selection');
          const membersTop = await page.$eval('#atlas-members', element => element.getBoundingClientRect().top + window.scrollY);
          await page.click('.atlasBarStep[aria-label="next members"]');
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
          assert.equal(await page.evaluate(() => window.scrollY), membersTop, 'chapter arrows must arrive without a scrolling animation');
          await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await settle(page);
          const bottom = await page.evaluate(() => ({ y: window.scrollY, height: innerHeight, total: document.documentElement.scrollHeight }));
          assert.ok(bottom.y + bottom.height >= bottom.total - 1, JSON.stringify(bottom));
          assert.equal(await page.$eval('.atlasBarLabel', element => element.textContent), 'index', 'reaching the bottom must keep the final chapter selected after observer callbacks');
          await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }));
          await settle(page);
          assert.equal(await page.$eval('.atlasBarLabel', element => element.textContent), 'members', 'scrolling back must resume normal section tracking');
          await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await settle(page);
          assert.equal(await page.$eval('.atlasBarLabel', element => element.textContent), 'index');
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await settle(page);
          await page.click('.atlasBarCurrent');
          await page.click('.atlasSheetItem[data-chapter="04"]');
          await settle(page);
          assert.equal(await page.$eval('.atlasBarLabel', element => element.textContent), 'index', 'choosing the last chapter must survive bottom and observer updates');
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
