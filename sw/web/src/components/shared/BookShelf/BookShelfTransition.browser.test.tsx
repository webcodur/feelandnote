import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')

test('book count and content updates share one animation, preserve focus and respect reduced motion', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {useState} from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
      import Transition from './BookShelfTransition';
      function App(){const [value,setValue]=useState('waiting');window.update=value=>flushSync(()=>setValue(value));return <>
        <Transition inline changeKey={value}><span id="count">{value}</span></Transition>
        <Transition changeKey={value}><input id="draft" defaultValue="keep my edit"/><p>{value}</p></Transition>
      </>}createRoot(document.getElementById('root')).render(<App/>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('#draft')
    await page.focus('#draft')
    await page.type('#draft', ' changed')
    const result = await page.evaluate(() => {
      const draft = document.querySelector<HTMLInputElement>('#draft')!
      const value = draft.value
      const update = (window as unknown as { update: (value: string) => void }).update
      update('24'); update('25'); update('26')
      const motions = [...document.querySelectorAll('[data-bookshelf-transition]')].map(node => node.getAnimations())
      return {
        preserved: draft === document.querySelector('#draft') && draft.value === value && document.activeElement === draft,
        text: document.querySelector('#count')?.textContent,
        counts: motions.map(items => items.length),
        timings: motions.map(items => items[0].effect!.getTiming()),
      }
    })
    assert.equal(result.preserved, true, 'Rapid content updates must not recreate inputs or discard focus')
    assert.equal(result.text, '26')
    assert.deepEqual(result.counts, [1, 1], 'Repeated updates must replace the current animation instead of stacking effects')
    assert.equal(result.timings[0].duration, result.timings[1].duration)
    assert.equal(result.timings[0].easing, result.timings[1].easing)
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.waitForFunction(() => document.getAnimations().length === 0)
    assert.equal(await page.evaluate(() => {
      (window as unknown as { update: (value: string) => void }).update('27')
      return document.getAnimations().length
    }), 0, 'Reduced motion must cancel active effects and skip new effects')
    assert.equal(await page.$eval('#count', node => node.textContent), '27')
  } finally { await browser.close() }
})
