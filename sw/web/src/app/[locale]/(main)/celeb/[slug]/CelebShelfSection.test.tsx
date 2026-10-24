import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type FixtureWindow = Window & {
  effects: Record<string, number>
  pauses: number
  scenario: (hasReviews: boolean, hash?: string) => void
}

test('one shelf preserves both panes, suspends hidden effects and supports reference-only figures and old anchors', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client';import {useState,useEffect} from 'react';
      import Shelf from '@/components/features/celeb/CelebShelfSection';import {useCelebServiceModel} from './detail/useCelebServiceModel';
      window.effects={reviews:0,references:0};window.pauses=0;
      HTMLMediaElement.prototype.pause=function(){window.pauses++};
      function Probe({kind}){const [work,setWork]=useState(0);useEffect(()=>{window.effects[kind]++;return()=>{window.effects[kind]--}},[kind]);
        return <div data-probe={kind}><button data-next={kind} onClick={()=>setWork(n=>n+1)}>Work {work}</button><audio/></div>}
      function App(){const [state,setState]=useState({hasReviews:true,id:0});
        window.scenario=(hasReviews,hash='')=>{history.replaceState(null,'',hash||'#');setState(s=>({hasReviews,id:s.id+1}))};
        const model=useCelebServiceModel({profile:{celeb_tier:state.hasReviews?'full':'light',celeb_reality:state.hasReviews?'REAL':'FICTION',reading:null,contentTypeCounts:{BOOK:state.hasReviews?2:0}},
          sideAvailability:{relations:false,influence:false,spectrum:false,relatedFigures:false,relatedFactions:false,affiliateBooks:true}});
        return <><nav>{model.items.map(item=><a key={item.key} data-section={item.key} href={'#'+item.target.sectionId}>{item.label}</a>)}</nav>
          <Shelf key={state.id} pageAnchors hasReviews={state.hasReviews} librarySlot={<Probe kind="reviews"/>} booksSlot={<Probe kind="references"/>}/></>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'shelf-tabs-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace?: string }, callback: () => unknown) => void
    }) {
      builder.onResolve({ filter: /^next-intl$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const useTranslations=()=>key=>key;', loader: 'js' }))
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.setContent('<style>[hidden]{display:none}</style><div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('[data-probe="reviews"]')
    assert.equal(await page.$$eval('[data-section="library"]', nodes => nodes.length), 1)
    assert.equal(await page.$$eval('[data-section="affiliateBooks"]', nodes => nodes.length), 0)
    assert.equal(await page.$eval('[data-section="library"]', node => node.textContent), 'bookshelfTitle')
    assert.equal(await page.$('[data-probe="references"]'), null, 'Reference UI must not mount before it is opened')
    await page.click('[data-next="reviews"]')
    await page.click('[role="tab"]:last-child')
    await page.waitForSelector('[data-probe="references"]')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).effects.reviews === 0)
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).effects), { reviews: 0, references: 1 })
    assert.ok(await page.evaluate(() => (window as unknown as FixtureWindow).pauses) > 0)
    await page.click('[data-next="references"]')
    await page.focus('[role="tab"]:last-child')
    await page.keyboard.press('ArrowLeft')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).effects.reviews === 1)
    assert.equal(await page.$eval('[data-next="reviews"]', node => node.textContent), 'Work 1')
    assert.equal(await page.$eval('[role="tab"]:first-child', node => node.getAttribute('aria-selected')), 'true')
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).effects.references === 1)
    assert.equal(await page.$eval('[data-next="references"]', node => node.textContent), 'Work 1')
    await page.evaluate(() => { window.location.hash = '#library' })
    await page.waitForFunction(() => document.querySelector('[role="tab"]:first-child')?.getAttribute('aria-selected') === 'true')
    await page.evaluate(() => { window.location.hash = '#affiliate-books' })
    await page.waitForFunction(() => document.querySelector('[role="tab"]:last-child')?.getAttribute('aria-selected') === 'true')
    assert.equal(await page.$$eval('#affiliate-books, #archive', nodes => nodes.length), 2)
    await page.evaluate(() => (window as unknown as FixtureWindow).scenario(false))
    await page.waitForFunction(() => !document.querySelector('[role="tablist"]'))
    assert.equal(await page.$('[data-probe="reviews"]'), null)
    assert.ok(await page.$('[data-probe="references"]'))
    assert.equal(await page.$$eval('[data-section="library"]', nodes => nodes.length), 1)
    await page.evaluate(() => (window as unknown as FixtureWindow).scenario(true, '#archive'))
    await page.waitForFunction(() => document.querySelector('[role="tab"]:last-child')?.getAttribute('aria-selected') === 'true')
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
