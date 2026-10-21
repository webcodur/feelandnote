import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const appDir = fileURLToPath(new URL('../../../../', import.meta.url))

test('a failed view request does not suppress the next visit; StrictMode shares one request', async () => {
  const bundle = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, write: false,
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import Participation from './src/components/features/engagement/FactionParticipation';
      const root = createRoot(document.getElementById('root'));
      window.calls = []; window.finished = 0; window.next = null; let visit = 0;
      window.mount = (id, strict = false) => {
        const counter = <Participation key={++visit} factionId={id} slug="test" name="Test" />;
        root.render(strict ? <StrictMode>{counter}</StrictMode> : counter);
      };`,
    },
    plugins: [{ name: 'participation-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      const mocks: Record<string, string> = {
        'next-intl': 'export const useTranslations=()=>key=>key;',
        '@/actions/engagement/incrementFactionView': `export const incrementFactionView=async(id,count)=>{
          window.calls.push({id,count}); await new Promise(resolve=>setTimeout(resolve,10)); window.finished++; return window.next;
        };`,
        '@/components/ui/ShareButtons': 'export default ()=>null;',
        './PageLikeButton': 'export default ()=>null;',
      }
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: appDir }))
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', request => { void request.respond({ contentType: 'text/html', body: '<div id="root"></div>' }) })
    await page.goto('http://participation.test/')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const mount = async (id: string, strict = false) => {
      await page.evaluate(({ id, strict }) => (window as unknown as { mount: (id: string, strict: boolean) => void }).mount(id, strict), { id, strict })
    }
    const calls = () => page.evaluate(() => (window as unknown as { calls: { id: string; count: boolean }[] }).calls)
    const id = '903886e6-fa17-4ea0-ae9e-84d8a3245bed'
    await mount(id)
    await page.waitForFunction(() => (window as unknown as { calls: unknown[] }).calls.length === 1)
    // Wait for the null response to finish, then enter the same page again.
    await page.waitForFunction(() => (window as unknown as { finished: number }).finished === 1)
    assert.equal(await page.evaluate(id => localStorage.getItem(`faction-view:${id}`), id), null, 'Failed requests must not mark a visit as counted')
    await page.evaluate(() => { (window as unknown as { next: number }).next = 2 })
    await mount(id)
    await page.waitForFunction(() => document.querySelector('[data-faction-views] [aria-live]')?.textContent === '2')
    assert.deepEqual(await calls(), [{ id, count: true }, { id, count: true }])
    await mount(id)
    await page.waitForFunction(() => (window as unknown as { calls: unknown[] }).calls.length === 3)
    assert.equal((await calls())[2].count, false, 'A successfully counted visit is deduplicated')
    const strictId = '77606a16-e24a-4f73-a079-600151d85b2e'
    await mount(strictId, true)
    await page.waitForFunction(() => document.querySelector('[data-faction-views] [aria-live]')?.textContent === '2')
    assert.deepEqual((await calls()).filter(call => call.id === strictId), [{ id: strictId, count: true }], 'StrictMode reuses the pending count and its result')
  } finally { await browser.close() }
})
