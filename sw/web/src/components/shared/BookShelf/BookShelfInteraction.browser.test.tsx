import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')

test('bookshelf controls share typography and centering, with distinct hover, press and selection', async () => {
  const appDir = fileURLToPath(new URL('../../../../', import.meta.url))
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, outdir: 'fixture',
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import {useState} from 'react';import {createRoot} from 'react-dom/client';
      import Controls from './src/components/shared/BookShelf/BookShelfPersonalControls';
      import Affiliation from './src/components/features/celeb/BookShelfAffiliationAddon';
      const books=n=>Array.from({length:n},(_,i)=>({id:String(i),title:'Book',creator:null,editions:[],thumbnailUrl:null}));
      const group={key:'profession',label:'Entrepreneur',intro:'',books:books(24),choices:[
        {key:'train',label:'Train',intro:'',books:books(10)},
        {key:'become',label:'Learn',intro:'',books:books(6)},
        {key:'about',label:'Explore',intro:'',books:books(8)}]};
      const affiliations=['The Singularity Is Near','SpaceX','Tesla','Private Spaceflight','xAI','X',"Musk's Network",'PayPal Mafia',"Peter Thiel's Network",'Social Media','Crypto Assets','OpenAI','Autonomous Driving']
        .map((name,i)=>({factionId:'f'+i,factionName:name,factionSlug:'faction-'+i,books:books(i===0?2:1).map(b=>({contentId:b.id,title:b.title}))}));
      function App(){const [choice,setChoice]=useState('become');const [active,setActive]=useState(false);return <main style={{maxWidth:420,margin:'48px auto'}}>
        <Affiliation groups={affiliations} selected={affiliations[0]}
          isActive={active} onSelect={()=>{}} onActivate={()=>setActive(true)}/>
        <div style={{marginTop:12}}><Controls groups={[{key:'appeared',label:'Appearing',intro:'',books:books(14)},{key:'authored',label:'Written',intro:'',books:[]},group]}
          selected={group} activeKey="profession" choiceKey={choice} isActive ariaLabel="Bookshelf" onSelect={()=>{}} onChoice={setChoice}/></div>
      </main>}createRoot(document.getElementById('root')).render(<App/>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    plugins: [{ name: 'translations', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      builder.onResolve({ filter: /^(next-intl|@\/i18n\/navigation)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'next-intl'
        ? `export const useTranslations=()=> (key,values={})=>key==='bookShelfCount'?values.count+' books':key==='bookShelfCategoryTitle'?values.category+' Bookshelf':key;`
        : 'export const Link=({children,...props})=><a {...props}>{children}</a>', loader: 'jsx', resolveDir: appDir }))
    } }],
  })
  const cssRequire = createRequire(require.resolve('@tailwindcss/postcss'))
  const css = await cssRequire('postcss')([require('@tailwindcss/postcss')()]).process(
    readFileSync(`${appDir}/src/app/globals.css`, 'utf8'), { from: `${appDir}/src/app/globals.css` },
  )
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.setContent('<!doctype html><div id="root"></div>')
    await page.addStyleTag({ content: css.css + output.outputFiles.filter((file: { path: string }) => file.path.endsWith('.css')).map((file: { text: string }) => file.text).join('') })
    await page.addScriptTag({ content: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text })
    const learn = '[data-bookshelf-subcontrols] button:nth-child(2)'
    const explore = '[data-bookshelf-subcontrols] button:nth-child(3)'
    await page.waitForSelector(explore)
    assert.deepEqual(await page.$$eval('[data-bookshelf-control-count]', nodes => nodes.map(node => node.textContent?.trim())),
      ['2', '14', '0', '24', '10', '6', '8'], 'Every control must show a bare number without a books suffix')
    assert.equal(await page.$eval('[data-bookshelf-select-affiliation] option', node => node.textContent), 'The Singularity Is Near (2)')
    for (const width of [320, 390, 1280]) {
      await page.setViewport({ width, height: 800 })
      const typography = await page.evaluate(() => ({
        labels: [...document.querySelectorAll('[data-bookshelf-control-label]')].map(node => {
          const css = getComputedStyle(node); return [css.fontSize, css.fontWeight, css.textAlign]
        }),
        counts: [...document.querySelectorAll('[data-bookshelf-control-count]')].map(node => {
          const css = getComputedStyle(node); return [css.fontSize, css.fontWeight, css.textAlign]
        }),
        centers: [...document.querySelectorAll('[data-bookshelf-summary]')].map(node => {
          const summary = node.getBoundingClientRect()
          const frame = node.closest('[data-bookshelf-affiliation], [data-bookshelf-profession-controls]')!.getBoundingClientRect()
          return Math.abs(summary.x + summary.width / 2 - frame.x - frame.width / 2)
        }),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))
      assert.ok(typography.labels.every(value => value.join() === '14px,600,center'), 'All control labels must share typography and alignment')
      assert.ok(typography.counts.every(value => value.join() === '14px,500,center'), 'All counts must share typography and alignment')
      assert.ok(typography.centers.every(offset => offset < 1), 'Action icons must not shift the heading center')
      assert.equal(typography.overflow, false)
      await page.click('[data-bookshelf-select-affiliation]')
      await page.waitForSelector('[data-bookshelf-select-affiliation]:open')
      const picker = await page.$eval('[data-bookshelf-select-affiliation]', node => {
        const frame = node.closest('[data-bookshelf-affiliation]')!.getBoundingClientRect()
        const first = node.querySelector('option')!.getBoundingClientRect()
        const css = getComputedStyle(node, '::picker(select)')
        return { left: first.left, right: first.right, top: first.top, frameLeft: frame.left, frameRight: frame.right,
          frameBottom: frame.bottom, height: Number.parseFloat(css.height), viewportWidth: innerWidth }
      })
      assert.ok(picker.top >= picker.frameBottom, 'The menu must open below the full affiliation row')
      assert.ok(picker.left >= picker.frameLeft && picker.right <= picker.frameRight, 'The menu must remain within the row edges')
      assert.ok(picker.left >= 0 && picker.right <= picker.viewportWidth, 'The menu must stay inside the viewport')
      assert.ok(picker.height <= 320, 'Long lists must scroll instead of growing across the page')
      await page.keyboard.press('Escape')
      if (width === 320) {
        await page.click('[data-bookshelf-activate-affiliation]')
        assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'true')
        assert.equal(await page.$('[data-bookshelf-select-affiliation]:open'), null, 'Activating affiliations must only switch the shelf')
      }
      await page.click('[data-bookshelf-activate-affiliation]')
      await page.waitForSelector('[data-bookshelf-select-affiliation]:open')
      await page.keyboard.press('Escape')
    }
    const appearance = (selector: string) => page.$eval(selector, node => {
      const style = getComputedStyle(node)
      return { color: style.color, border: style.borderColor, background: style.backgroundColor, selected: node.getAttribute('aria-checked'), transition: style.transitionDuration }
    })
    const selected = await appearance(learn)
    const idle = await appearance(explore)
    await page.hover(explore)
    const hovered = await appearance(explore)
    assert.notEqual(hovered.color, selected.color, 'An unselected hover must not use the selected accent')
    assert.notEqual(hovered.border, selected.border)
    assert.notEqual(hovered.background, idle.background)
    assert.equal(hovered.selected, 'false')
    assert.equal(hovered.transition, '0s', 'Hover feedback must remain immediate')
    assert.deepEqual(await appearance(learn), selected, 'Hovering another choice must not change the current selection')
    await page.mouse.down()
    const pressed = await appearance(explore)
    assert.equal(pressed.selected, 'false', 'Mouse down alone must not activate the choice')
    assert.notEqual(pressed.color, selected.color)
    assert.notEqual(pressed.background, hovered.background, 'Press must have its own feedback')
    await page.mouse.up()
    await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-checked') === 'true', {}, explore)
    assert.equal((await appearance(explore)).color, selected.color, 'A selected hover must retain the accent')
    await page.mouse.move(0, 0)
    assert.equal((await appearance(explore)).color, selected.color, 'Selection must persist after the pointer leaves')
    assert.equal((await appearance(learn)).selected, 'false')
  } finally { await browser.close() }
})
