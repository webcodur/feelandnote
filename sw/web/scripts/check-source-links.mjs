import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const web = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const compiled = await build({
  stdin: { resolveDir: web, loader: 'tsx', contents: `
    import React, {useCallback, useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import {NextIntlClientProvider} from 'next-intl';
    import WebSource from './src/components/ui/SourceLink';
    import BoSource from '../web-bo/src/components/ui/SourceLink';
    import WebModal from './src/components/ui/Modal';
    import BoModal from '../web-bo/src/components/ui/Modal';
    import ko from './messages/ko/core.json';
    import en from './messages/en/core.json';
    const bo = location.pathname.startsWith('/bo');
    const locale = location.pathname.endsWith('/en') ? 'en' : 'ko';
    const Source = bo ? BoSource : WebSource;
    const Parent = bo ? BoModal : WebModal;
    window.parentClicks = 0; window.outerClosed = false;
    function App() {
      const [open, setOpen] = useState(true);
      const close = useCallback(() => { window.outerClosed = true; setOpen(false); }, []);
      return <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : ko}>
        <Source sourceUrl="https://example.com/direct">Direct source</Source>
        <Parent isOpen={open} onClose={close} title="Parent" zIndex={10000}>
          <div style={{position:'relative', zIndex:10000, padding:16}} onClick={() => window.parentClicks++}>
            <Source sourceUrl="https://example.com/reading | https://example.com/explanation | https://example.com/reading"
              className="rounded p-3 text-accent hover:bg-accent/10">Multiple sources</Source>
          </div>
        </Parent>
      </NextIntlClientProvider>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  ` },
  jsx: 'automatic', bundle: true, write: false, outfile: 'harness.js',
  platform: 'browser', format: 'iife', alias: { '@': `${web}/src` },
  define: { 'process.env.NODE_ENV': '"development"' },
});
const js = compiled.outputFiles.find(file => file.path.endsWith('.js')).text;
const assets = new Map();
for (const app of ['web', 'web-bo']) {
  const from = fileURLToPath(new URL(`../../${app}/src/app/globals.css`, import.meta.url));
  const base = fileURLToPath(new URL(`../../${app}/`, import.meta.url));
  const css = await postcss([tailwind({ base })]).process(await readFile(from, 'utf8'), { from });
  assets.set(`/${app}.css`, css.css);
}
const moduleCss = compiled.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n');
const server = createServer((request, response) => {
  const url = request.url;
  response.setHeader('Content-Type', url.endsWith('.js') ? 'text/javascript' : url.endsWith('.css') ? 'text/css' : 'text/html');
  response.end(url === '/harness.js' ? js : assets.has(url) ? assets.get(url) :
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/${url.startsWith('/bo') ? 'web-bo' : 'web'}.css"><style>${moduleCss}</style></head><body><div id="root"></div><script src="/harness.js"></script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/web/ko', '/web/en', '/bo']) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
      await page.setViewport(viewport);
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`, { waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('a', a => a.getAttribute('href')), 'https://example.com/direct');
      const trigger = 'button[aria-haspopup="dialog"]';
      await page.waitForSelector(trigger);
      await page.click(trigger);
      await page.waitForSelector('[role="dialog"] a[href="https://example.com/explanation"]');
      const result = await page.$eval('[role="dialog"] a[href="https://example.com/explanation"]', a => {
        const dialog = a.closest('[role="dialog"]');
        const box = dialog.getBoundingClientRect();
        return { links: [...dialog.querySelectorAll('a')].map(a => a.getAttribute('href')),
          title: dialog.getAttribute('aria-label') ?? dialog.querySelector('h2')?.textContent,
          native: dialog.matches(':modal'), width: box.width, height: box.height,
          maxHeight: Number.parseFloat(getComputedStyle(dialog).maxHeight),
          layer: [...document.querySelectorAll('[style]')].some(e => e.style.zIndex === '10001') };
      });
      assert.deepEqual(result.links, ['https://example.com/reading', 'https://example.com/explanation']);
      assert(result.width >= 300 && result.width <= viewport.width && result.height <= viewport.height * 0.66 + 1);
      assert(result.maxHeight <= viewport.height * 0.66 + 1);
      if (route === '/bo') assert(result.native, 'Admin sources must occupy the native top layer');
      else assert(result.layer, 'Web sources must appear above their parent');
      assert.equal(result.title, route.endsWith('/en') ? 'Sources' : '출처 목록');
      assert.equal(await page.evaluate(() => window.parentClicks), 0);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('a[href="https://example.com/explanation"]'));
      assert.equal(await page.evaluate(() => window.outerClosed), false);
      assert.equal(await page.$eval(trigger, button => button === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.keyboard.press('Enter');
      await page.waitForSelector('a[href="https://example.com/explanation"]');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), true);
      await page.keyboard.press('Escape');
      console.log(JSON.stringify({ route, viewport, ...result, parentPreserved: true, focusRestored: true }));
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
