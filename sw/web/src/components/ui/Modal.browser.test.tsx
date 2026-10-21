import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Page } from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../", import.meta.url));

async function buildFixture() {
  return build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`,
    stdin: { resolveDir: appDir, loader: "tsx", contents: `
      import { StrictMode, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { flushSync } from 'react-dom';
      import Modal from './src/components/ui/Modal';
      import Gallery from './src/components/ui/ImageGalleryModal';
      function Harness() {
        const [layers, setLayers] = useState([]);
        const [draft, setDraft] = useState('my draft');
        const [blocked, setBlocked] = useState(false);
        window.showLayers = next => flushSync(() => setLayers(next));
        window.blockClose = value => flushSync(() => setBlocked(value));
        window.navigateAsync = () => {
          window.navigationCancelled = false; window.navigationDone = false;
          const cancel = () => { window.navigationCancelled = true; };
          addEventListener('popstate', cancel);
          flushSync(() => setLayers([]));
          setTimeout(() => {
            if (!window.navigationCancelled) history.pushState({tree:'detail'}, '', '/detail');
            removeEventListener('popstate', cancel);
            window.navigationDone = true;
          }, 100);
        };
        return <>
          <button id="open" onClick={() => setLayers(['parent'])}>Open</button>
          {layers.filter(name => name !== 'gallery').map((name, index) => <Modal key={name} isOpen title={name}
            frame="plain" animateHeight={false} zIndex={600 + index}
            closeButtonDisabled={blocked} closeOnEscape={!blocked}
            onClose={() => setLayers(current => current.filter(item => item !== name))}>
            <textarea aria-label={name + ' draft'} value={draft} onChange={event => setDraft(event.target.value)}/>
          </Modal>)}
          {layers.includes('gallery') && <Gallery images={[{ src: 'data:image/png;base64,', alt: 'Image' }]}
            initialIndex={0} title="Gallery" labels={{close:'Close',previous:'Previous',next:'Next'}}
            onClose={() => setLayers(current => current.filter(item => item !== 'gallery'))}/>}
        </>;
      }
      createRoot(document.getElementById('root')).render(<StrictMode><Harness/></StrictMode>);
    ` },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    plugins: [{ name: "modal-fixture", setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
      onLoad: (options: { filter: RegExp; namespace?: string }, callback: () => unknown) => void;
    }) {
      builder.onResolve({ filter: /^(next-intl|next\/image)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
      builder.onLoad({ filter: /next-intl/, namespace: "fixture" }, () => ({
        contents: "export const useTranslations = () => key => key;", loader: "js",
      }));
      builder.onLoad({ filter: /next\/image/, namespace: "fixture" }, () => ({ contents: "export default () => null;", loader: "js" }));
    } }],
  });
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
}

async function show(page: Page, names: string[]) {
  await page.evaluate(names => (window as unknown as { showLayers: (names: string[]) => void }).showLayers(names), names);
  await settle(page);
}

test("modals leave browser history alone during closing, filters and delayed navigation", async t => {
  const output = await buildFixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const scenario of ["close button", "escape", "overlay", "programmatic", "nested", "gallery", "replace state", "blocked", "async navigation", "browser back"]) {
      await t.test(scenario, async () => {
        const page = await browser.newPage();
        try {
          const errors: string[] = [];
          page.on("pageerror", error => errors.push(String(error)));
          await page.setViewport({ width: scenario === "overlay" ? 1440 : 390, height: 844 });
          await page.setRequestInterception(true);
          page.on("request", request => void request.respond({ status: 200, contentType: "text/html", body: '<html><body style="margin:0"><div id="root"></div><div style="height:3000px"></div></body></html>' }));
          await page.goto("http://localhost:45679/source");
          await page.evaluate(() => {
            history.pushState({ tree: "list" }, "", "/list");
            (window as unknown as { originalHistory: unknown }).originalHistory = { push: history.pushState, replace: history.replaceState };
          });
          await page.addStyleTag({ content: '#open{position:fixed;top:0;left:0}.fixed{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}.relative{position:relative}[role=dialog]{background:white;width:250px;min-height:150px}' });
          await page.addScriptTag({ content: output.outputFiles[0].text });
          await page.waitForSelector("#open");
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.click("#open");
          await settle(page);
          assert.equal(await page.evaluate(() => history.length), 3, "Opening a modal must not add an artificial history entry");
          assert.ok(await page.evaluate(() => {
            const original = (window as unknown as { originalHistory: { push: unknown; replace: unknown } }).originalHistory;
            return history.pushState === original.push && history.replaceState === original.replace;
          }), "A modal must not replace browser history methods");
          if (scenario === "browser back") {
            await page.goBack({ waitUntil: "domcontentloaded" });
            assert.equal(new URL(page.url()).pathname, "/source", "Browser Back follows the real navigation history");
          } else if (scenario === "async navigation") {
            await page.evaluate(() => (window as unknown as { navigateAsync: () => void }).navigateAsync());
            await page.waitForFunction(() => (window as unknown as { navigationDone: boolean }).navigationDone);
            assert.equal(await page.evaluate(() => (window as unknown as { navigationCancelled: boolean }).navigationCancelled), false);
            assert.equal(new URL(page.url()).pathname, "/detail");
            assert.equal(await page.$('[role="dialog"]'), null);
            await page.goBack();
            await settle(page);
            assert.equal(new URL(page.url()).pathname, "/list");
          } else {
            if (scenario === "nested") {
              await show(page, ["parent", "child"]);
              const closeButtons = await page.$$('[role="dialog"] [aria-label="close"]');
              await closeButtons.at(-1)!.click();
              await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 1);
              assert.deepEqual(await page.$$eval('[role="dialog"] h2', nodes => nodes.map(node => node.textContent)), ["parent"]);
            } else if (scenario === "gallery") {
              await show(page, ["gallery"]);
              await page.click('[aria-label="Close"]');
            } else if (scenario === "replace state") {
              await page.evaluate(() => history.replaceState({ filter: "name" }, "", "?sort=name#section"));
            } else if (scenario === "blocked") {
              await page.evaluate(() => (window as unknown as { blockClose: (value: boolean) => void }).blockClose(true));
              await page.keyboard.press("Escape");
              assert.ok(await page.$('[role="dialog"]'));
              assert.equal(await page.$eval('[aria-label="close"]', button => (button as HTMLButtonElement).disabled), true);
              await page.evaluate(() => (window as unknown as { blockClose: (value: boolean) => void }).blockClose(false));
            }
            if (scenario === "escape") await page.keyboard.press("Escape");
            else if (scenario === "overlay") await page.mouse.click(5, 5);
            else if (scenario === "programmatic") await show(page, []);
            else if (scenario !== "gallery") await page.click('[aria-label="close"]');
            await settle(page);
            assert.equal(await page.$('[role="dialog"]'), null);
            assert.equal(new URL(page.url()).pathname, "/list");
            assert.equal(await page.evaluate(() => document.body.style.overflow), "");
            assert.equal(await page.evaluate(() => window.scrollY), 600);
            assert.equal(await page.evaluate(() => history.length), 3, "Closing must not add or traverse history");
            if (scenario === "replace state") {
              assert.equal(new URL(page.url()).search + new URL(page.url()).hash, "?sort=name#section");
              assert.equal(await page.evaluate(() => history.state.filter), "name");
            }
          }
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      });
    }
  } finally { await browser.close(); }
});
