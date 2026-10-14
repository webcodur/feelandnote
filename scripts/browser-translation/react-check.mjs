import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SOURCES } from './languages.mjs';
const require = createRequire(new URL('../../sw/web/package.json', import.meta.url));
const esbuild = createRequire(require.resolve('tsx'))('esbuild');
const puppeteer = require('puppeteer');
const output = resolve('.artifacts/browser-translation');
await mkdir(output, { recursive: true });
const bundle = await esbuild.build({ entryPoints: [resolve('scripts/browser-translation/react-lab.jsx')],
  bundle: true, format: 'esm', write: false, alias: {
    react: require.resolve('react'), 'react-dom': require.resolve('react-dom'), 'react-dom/client': require.resolve('react-dom/client'),
  } });
const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');
const ssrBundle = await esbuild.build({ entryPoints: [resolve('scripts/browser-translation/react-lab.jsx')],
  bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react-dom', 'react-dom/*'], write: false });
const ssrModule = { exports: {} };
new Function('require', 'module', 'exports', ssrBundle.outputFiles[0].text)(require, ssrModule, ssrModule.exports);
const markup = require('react-dom/server').renderToString(require('react').createElement(ssrModule.exports.Lab));
assert(!markup.includes(SOURCES.intro), 'SSR must not contain visible English body text');
assert(markup.includes('正在准备翻译'), 'SSR must show a localized pending state');
const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
  <style>${css}.react-overlay{position:fixed;inset:0;display:grid;place-items:center;background:#000a;padding:1rem}
  .react-modal{background:var(--panel);padding:1.5rem;width:min(650px,100%);max-height:80dvh;overflow:auto}</style>
  <div id="react-root">${markup}</div><script type="module" src="/react-check.mjs"></script></html>`;
const server = await serve(0, { '/react': { type: 'text/html; charset=utf-8', body: html },
  '/react-check.mjs': { type: 'text/javascript', body: bundle.outputFiles[0].text } });
const browser = await puppeteer.launch({ headless: true });
const errors = [];
const results = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(globalThis, 'Translator', { value: {
      create: async ({ targetLanguage }) => ({ destroy() {}, translate: async text => {
        await new Promise(resolve => setTimeout(resolve, 80)); return `TEST[${targetLanguage}] · ${text.length}`;
      } }),
    } });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/react`);
  await page.waitForSelector('#react-start');
  await page.waitForFunction(() => !!window.reactTranslationLab);
  assert.equal(await page.evaluate(() => window.reactTranslationLab.reactVersion), '19.2.0');
  assert.equal(await page.$eval('#react-intro', node => node.dataset.state), 'pending');
  results.push('Server HTML shows localized pending text and hydrates without English body flash or mismatch');
  await page.click('#react-start');
  await page.waitForFunction(() => document.querySelector('#react-intro').dataset.state === 'translated');
  for (let index = 0; index < 15; index += 1) {
    await page.click('#react-open');
    await page.click('#react-next');
    await page.waitForFunction(() => document.querySelector('#react-review').dataset.state === 'translated');
    await page.click('#react-close');
  }
  results.push('React 19.2 portal mounted, changed data and unmounted 15 times without DOM errors');
  await page.select('#react-language', 'es'); await page.select('#react-language', 'ja');
  await page.waitForFunction(() => document.querySelector('#react-intro').dataset.state === 'translated');
  assert.match(await page.$eval('#react-intro', node => node.textContent), /^TEST\[ja\]/);
  results.push('React discards late results after rapid language changes');
  await page.click('#react-open'); await page.click('#react-next'); await page.click('#react-modal-original');
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal(await page.$eval('#react-intro', node => node.dataset.state), 'original');
  assert.equal(await page.$eval('#react-review', node => node.dataset.state), 'original');
  results.push('Original switch cancels translation in both the page and the open portal');
  await page.click('#react-close'); await page.click('#react-start');
  await page.waitForFunction(() => document.querySelector('#react-intro').dataset.state === 'translated');
  await page.click('#react-open');
  await page.waitForFunction(() => document.querySelector('#react-review').dataset.state === 'translated');
  const calls = await page.evaluate(() => window.reactTranslationLab.engine.metrics.calls);
  await page.click('#react-close'); await page.click('#react-open');
  await page.waitForFunction(() => document.querySelector('#react-review').dataset.state === 'translated');
  assert.equal(await page.evaluate(() => window.reactTranslationLab.engine.metrics.calls), calls);
  results.push('React portal reopening consumes no new translation calls');
  await page.screenshot({ path: resolve(output, 'react-portal-mock.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'react-check.json'), JSON.stringify({ type: 'REAL React 19.2 + MOCK Translator API', results, errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
