import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer, { type Page } from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const fixtureDir = fileURLToPath(new URL("./", import.meta.url));

async function buildFixture() {
  const mocks: Record<string, string> = {
    "next-intl": `export const useTranslations = () => key => key;`,
    "@/actions/celebs/getCelebForModal": `export const getCelebForModal = async id => ({ id });`,
    "@/i18n/navigation": `
      import { useSyncExternalStore } from 'react';
      export const usePathname = () => useSyncExternalStore(
        callback => { window.addEventListener('fixture-route', callback); return () => window.removeEventListener('fixture-route', callback); },
        () => location.hash || '/'
      );`,
    "./useHeaderSearch": `
      import { useState, useRef } from 'react';
      export function useHeaderSearch() {
        const [isOpen, setIsOpen] = useState(false);
        const [isModeOpen, setIsModeOpen] = useState(false);
        const [query, setQuery] = useState('');
        return {
          containerRef: useRef(null), mobileContainerRef: useRef(null), inputRef: useRef(null),
          isOpen, setIsOpen, isModeOpen, setIsModeOpen, query, setQuery,
          mode: 'celeb', contentCategory: 'book', setSelectedIndex() {},
        };
      }`,
    "@/components/shared/search/SearchModeDropdown": `export default () => null;`,
    "@/components/shared/search/SearchResultsDropdown": `
      export default function Results({ onCelebInfoClick, onViewAllResults }) {
        return <><button data-info onClick={() => onCelebInfoClick({ id: 'person' })}>Info</button>
          <button data-results onClick={onViewAllResults}>Results</button></>;
      }`,
    // Keep the actual Modal and scroll manager; only replace the profile/data layer.
    "@/components/features/celeb/modals/CelebDetailModal": `
      import Modal from '@/components/ui/Modal';
      export default function Detail({ isOpen, onClose }) {
        return <Modal isOpen={isOpen} onClose={onClose} animateHeight={false} frame="plain">
          <button data-close-detail onClick={onClose}>Close detail</button>
        </Modal>;
      }`,
  };
  return build({
    absWorkingDir: fileURLToPath(new URL("../../../../", import.meta.url)),
    tsconfig: fileURLToPath(new URL("../../../../tsconfig.json", import.meta.url)),
    stdin: {
      resolveDir: fixtureDir, loader: "tsx",
      contents: `
        import { StrictMode } from 'react';
        import { createRoot } from 'react-dom/client';
        import HeaderSearch from './HeaderSearch';
        const root = createRoot(document.getElementById('root'));
        window.unmountSearch = () => root.unmount();
        root.render(<StrictMode><HeaderSearch /></StrictMode>);`,
    },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", loader: { ".css": "empty" },
    plugins: [{
      name: "search-fixture",
      setup(builder: {
        onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
        onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void;
      }) {
        builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
        builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "export default {};", loader: "js" }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: fixtureDir }));
      },
    }],
  });
}

async function openSearch(page: Page) {
  await page.click('button[aria-label="pages.search"]');
  await page.waitForSelector('input:focus');
  await page.waitForFunction(() => document.body.style.overflow === "hidden");
}

async function expectScrollable(page: Page) {
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflowY), "hidden", "body lock must be released");
  await page.mouse.move(350, 700);
  await page.mouse.wheel({ deltaY: 300 });
  await page.waitForFunction(() => window.scrollY > 0, { timeout: 2000 });
}

test("header search releases page scroll after closing, nested dialogs, resize, navigation, and unmount", async t => {
  const output = await buildFixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const scenario of ["close", "detail-then-search", "search-then-detail", "desktop-resize", "navigation", "unmount"] as const) {
      await t.test(scenario, async () => {
        const page = await browser.newPage();
        try {
          page.setDefaultTimeout(3000);
          await page.setViewport({ width: 390, height: 844 });
          await page.setContent('<html><body style="margin:0"><div id="root"></div><div style="height:3000px"></div></body></html>');
          // Tailwind's xl breakpoint: mobile controls/overlay disappear at 80rem.
          await page.addStyleTag({ content: '.hidden{display:none}.fixed{position:fixed;inset:0}@media(min-width:80rem){.xl\\:hidden{display:none}.xl\\:block{display:block}}' });
          await page.addScriptTag({ content: output.outputFiles[0].text });
          await page.waitForSelector('button[aria-label="pages.search"]');
          await openSearch(page);
          let detailKeptLock = true;
          if (scenario === "detail-then-search" || scenario === "search-then-detail") {
            await page.click('[data-info]');
            await page.waitForSelector('[data-close-detail]');
            if (scenario === "detail-then-search") {
              await page.click('[data-close-detail]');
              await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
              assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden", "search still owns a lock");
            }
            await page.evaluate(() => (document.querySelector('button[aria-label="shared.accessibility.close"]') as HTMLElement).click());
            if (scenario === "search-then-detail") {
              await page.waitForFunction(() => !document.querySelector('input:focus'));
              detailKeptLock = await page.evaluate(() => document.body.style.overflow === "hidden");
              await page.click('[data-close-detail]');
            }
          } else if (scenario === "desktop-resize") {
            await page.setViewport({ width: 1440, height: 900 });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          } else if (scenario === "navigation") {
            await page.evaluate(() => { location.hash = '/explore'; window.dispatchEvent(new Event('fixture-route')); });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          } else if (scenario === "unmount") {
            await page.evaluate(() => (window as unknown as { unmountSearch: () => void }).unmountSearch());
          } else {
            await page.click('button[aria-label="shared.accessibility.close"]');
          }
          await expectScrollable(page);
          assert.equal(detailKeptLock, true, "detail still owns a lock");
          assert.equal(await page.$('.fixed'), null, "mobile overlay must close");
        } finally {
          await page.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});
