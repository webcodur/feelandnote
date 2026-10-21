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
        window.navigate = (closeFirst = false, keepOpen = false) => {
          window.renderedRoute = 'detail';
          if (closeFirst) flushSync(() => setLayers([]));
          history.pushState({ __NA: true, tree: 'detail' }, '', '/detail');
          if (!keepOpen) flushSync(() => setLayers([]));
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

test("modal back navigation preserves the page and closes only the top layer", async t => {
  const output = await buildFixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const scenario of ["mobile back", "desktop back", "nested", "gallery", "close button", "escape", "overlay", "programmatic", "swap", "navigation", "persistent modal navigation", "close then navigation", "pending close navigation", "replace state", "blocked", "rapid reopen", "draft"]) {
      await t.test(scenario, async () => {
        const page = await browser.newPage();
        try {
          page.setDefaultTimeout(1500);
          const errors: string[] = [];
          page.on("pageerror", error => errors.push(String(error)));
          await page.setViewport({ width: scenario === "desktop back" ? 1440 : 390, height: 844 });
          await page.setRequestInterception(true);
          page.on("request", request => void request.respond({ status: 200, contentType: "text/html", body: '<html><body style="margin:0"><div id="root"></div><div style="height:3000px"></div></body></html>' }));
          await page.goto("http://localhost:45679/source");
          await page.evaluate(() => history.pushState({ __NA: true, tree: "list" }, "", "/list"));
          // Next.js의 native history 연동처럼 내부 state를 보존하고 외부 URL 변경을 기록한다.
          await page.evaluate(() => {
            const api = window as unknown as { nativeUpdates: number; renderedRoute: string };
            api.nativeUpdates = 0;
            api.renderedRoute = "list";
            for (const name of ["pushState", "replaceState"] as const) {
              const original = history[name].bind(history);
              history[name] = (data, unused, url) => {
                if (!data?.__NA && url) { api.nativeUpdates++; api.renderedRoute = history.state.tree; }
                original(data?.__NA ? data : { ...data, __NA: true, tree: history.state.tree }, unused, url);
              };
            }
            window.addEventListener("popstate", event => { api.renderedRoute = event.state?.tree; });
          });
          await page.addStyleTag({ content: '#open{position:fixed;top:0;left:0}.fixed{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}.relative{position:relative}[role=dialog]{background:white;width:250px;min-height:150px}' });
          await page.addScriptTag({ content: output.outputFiles[0].text });
          await page.waitForSelector("#open");
          await page.evaluate(() => window.scrollTo(0, 600));
          await page.click("#open");
          await settle(page);
          // StrictMode must leave exactly one additional history entry.
          assert.equal(await page.evaluate(() => history.length), 4);
          assert.equal(await page.evaluate(() => history.state.tree), "list");
          if (scenario === "nested" || scenario === "gallery") {
            await show(page, ["parent", scenario === "gallery" ? "gallery" : "child"]);
            await page.goBack();
            await settle(page);
            assert.deepEqual(await page.$$eval('[role="dialog"] h2', nodes => nodes.map(node => node.textContent)), ["parent"]);
          } else if (scenario === "swap") {
            await show(page, ["replacement"]);
            assert.equal(await page.evaluate(() => history.length), 4);
          } else if (scenario === "replace state") {
            await page.evaluate(() => history.replaceState({ filter: "name" }, "", "?sort=name#section"));
          } else if (scenario === "draft") {
            await page.type("textarea", " saved");
          } else if (scenario === "blocked") {
            await page.evaluate(() => (window as unknown as { blockClose: (value: boolean) => void }).blockClose(true));
            await page.goBack();
            await settle(page);
            assert.equal(await page.$$eval('[role="dialog"]', nodes => nodes.length), 1);
            await page.evaluate(() => (window as unknown as { blockClose: (value: boolean) => void }).blockClose(false));
          }
          if (scenario.includes("navigation")) {
            if (scenario === "pending close navigation") {
              await page.evaluate(() => {
                const back = history.back.bind(history);
                history.back = () => { setTimeout(back, 50); };
                const api = window as unknown as { showLayers: (layers: string[]) => void; navigate: () => void };
                api.showLayers([]);
                setTimeout(() => api.navigate(), 10);
              });
            } else await page.evaluate(scenario => (window as unknown as { navigate: (closeFirst: boolean, keepOpen: boolean) => void }).navigate(scenario === "close then navigation", scenario === "persistent modal navigation"), scenario);
            await page.waitForFunction(() => location.pathname === "/detail" && !document.querySelector('[role="dialog"]'));
            await settle(page);
            assert.equal(new URL(page.url()).pathname, "/detail");
            assert.equal(await page.$$eval('[role="dialog"]', nodes => nodes.length), 0);
            assert.equal(await page.evaluate(() => (window as unknown as { renderedRoute: string }).renderedRoute), "detail", "a delayed modal close must not undo the destination route");
            await page.goBack();
            await settle(page);
            assert.equal(new URL(page.url()).pathname, "/list");
          } else {
            if (scenario === "close button") await page.click('[aria-label="close"]');
            else if (scenario === "escape") await page.keyboard.press("Escape");
            else if (scenario === "overlay") await page.mouse.click(5, 5);
            else if (scenario === "programmatic") await show(page, []);
            else if (scenario === "rapid reopen") {
              await page.evaluate(() => {
                const api = window as unknown as { showLayers: (layers: string[]) => void };
                api.showLayers([]);
                queueMicrotask(() => api.showLayers(["reopened"]));
              });
              await settle(page);
              await page.goBack();
            } else await page.goBack();
            await settle(page);
            assert.equal(await page.$$eval('[role="dialog"]', nodes => nodes.length), 0);
            assert.equal(new URL(page.url()).pathname, "/list");
            assert.equal(await page.evaluate(() => document.body.style.overflow), "");
            assert.equal(await page.evaluate(() => history.state.tree), "list", "modal dismissal must preserve the Next.js page tree");
            assert.equal(await page.evaluate(() => (window as unknown as { renderedRoute: string }).renderedRoute), "list");
            assert.equal(await page.evaluate(() => window.scrollY), 600, "closing must preserve the list scroll position");
            if (scenario === "replace state") {
              assert.equal(new URL(page.url()).search + new URL(page.url()).hash, "?sort=name#section");
              assert.equal(await page.evaluate(() => history.state.filter), "name");
              assert.ok(await page.evaluate(() => (window as unknown as { nativeUpdates: number }).nativeUpdates) > 0, "external history changes must still reach the Next.js router");
            }
            if (scenario === "draft") {
              await show(page, ["parent"]);
              assert.match(await page.$eval("textarea", node => node.value), /saved/);
              await page.goBack();
              await settle(page);
            }
          }
          await page.goBack();
          await settle(page);
          assert.equal(new URL(page.url()).pathname, "/source", "closing must not leave an empty back step");
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      });
    }
  } finally { await browser.close(); }
});
