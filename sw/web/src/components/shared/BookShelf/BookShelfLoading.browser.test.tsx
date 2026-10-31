import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')

test('pending book counts and content never reserve a larger layout than loaded content', async () => {
  const appDir = fileURLToPath(new URL('../../../../', import.meta.url))
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, outdir: 'fixture',
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import {useState} from 'react';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';
      import Shelf from './src/components/shared/BookShelf/BookShelf';
      const books=n=>Array.from({length:n},(_,i)=>({id:String(i),title:'Book',creator:null,editions:[],thumbnailUrl:null}));
      function App(){const [ready,setReady]=useState(false);window.showReady=value=>flushSync(()=>setReady(value));
        const groups=[{key:'appeared',label:'Appearing',intro:'',books:[]},{key:'authored',label:'Written',intro:'',books:[]},
          {key:'profession',label:'Computer Scientist',intro:'',books:books(ready?24:0),
            ...(!ready?{deferred:{state:'loading',onLoad:()=>{}}}:{}),
            choices:[{key:'train',label:'Train',intro:'',books:books(ready?10:0)},
              {key:'become',label:'Learn',intro:'',books:books(ready?6:0)},{key:'about',label:'Explore',intro:'',books:books(ready?8:0)}]}];
        return <Shelf groups={groups} controlsLayout="personal" ariaLabel="Bookshelf"/>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'loading-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace?: string }, callback: () => unknown) => void
    }) {
      builder.onResolve({ filter: /^next-intl$/ }, () => ({ path: 'translations', namespace: 'fixture' }))
      builder.onLoad({ filter: /translations/, namespace: 'fixture' }, () => ({ contents: `export const useTranslations=()=> (key,values={})=>key==='bookShelfCount'?values.count+' books':key==='bookShelfCategoryTitle'?values.category+' Bookshelf':key;`, loader: 'js' }))
      builder.onResolve({ filter: /^@\/i18n\/navigation$/ }, () => ({ path: 'navigation', namespace: 'navigation' }))
      builder.onLoad({ filter: /.*/, namespace: 'navigation' }, () => ({ contents: 'export const Link=()=>null; export const useRouter=()=>({refresh(){}})', loader: 'js' }))
      builder.onResolve({ filter: /\/BookShelfSelection$/ }, () => ({ path: 'selection', namespace: 'selection' }))
      builder.onLoad({ filter: /.*/, namespace: 'selection' }, () => ({ contents: 'export default ()=> <article style={{height:160}} data-loaded-book/>', loader: 'jsx', resolveDir: appDir }))
      builder.onResolve({ filter: /\/BookShelfBookList$/ }, () => ({ path: 'list', namespace: 'list' }))
      builder.onLoad({ filter: /.*/, namespace: 'list' }, () => ({ contents: 'export default ()=>null', loader: 'js' }))
    } }],
  })
  const cssRequire = createRequire(require.resolve('@tailwindcss/postcss'))
  const { readFileSync } = await import('node:fs')
  const css = await cssRequire('postcss')([require('@tailwindcss/postcss')()]).process(
    readFileSync(`${appDir}/src/app/globals.css`, 'utf8'), { from: `${appDir}/src/app/globals.css` },
  )
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.on('pageerror', error => console.error(String(error)))
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.setContent('<div id="root"></div>')
    await page.addStyleTag({ content: css.css + output.outputFiles.filter((file: { path: string }) => file.path.endsWith('.css')).map((file: { text: string }) => file.text).join('') })
    await page.addScriptTag({ content: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text })
    await page.waitForSelector('[data-bookshelf]')
    const measure = () => page.evaluate(() => ({
      total: document.querySelector('[data-bookshelf]')!.getBoundingClientRect().height,
      card: document.querySelector('[data-bookshelf-profession-controls]')!.getBoundingClientRect().height,
      header: document.querySelector('[data-bookshelf-activate-personal]')!.getBoundingClientRect().height,
      loading: document.querySelector('[data-bookshelf-loading]')?.getBoundingClientRect().height ?? 0,
    }))
    for (const width of [320, 390, 1280]) {
      await page.setViewport({ width, height: 900 })
      await page.evaluate(() => (window as unknown as { showReady: (ready: boolean) => void }).showReady(false))
      await page.waitForSelector('[data-bookshelf-loading]')
      const pending = await measure()
      assert.ok(pending.loading <= 64, `The loading indicator must stay compact: ${pending.loading}px at ${width}px`)
      await page.evaluate(() => (window as unknown as { showReady: (ready: boolean) => void }).showReady(true))
      await page.waitForSelector('[data-loaded-book]')
      const ready = await measure()
      assert.ok(pending.card <= ready.card, 'Pending counts must not enlarge the profession card')
      assert.ok(pending.header <= ready.header, 'Pending counts must not wrap the title more than actual counts')
      assert.ok(pending.total <= ready.total, 'Loading must not reserve more space than the actual book')
    }
  } finally { await browser.close() }
})
