import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const appDir = fileURLToPath(new URL('../../../../../', import.meta.url))

async function fixture() {
  const output = await build({
    absWorkingDir: appDir, tsconfig: path.join(appDir, 'tsconfig.json'), outdir: 'fixture', write: false,
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import HomeGraph from './src/components/features/home/introduction/HomeGraph';
      import AnimatedHeight from './src/components/ui/AnimatedHeight';
      const item = (type, i) => ({ id:type+i, type, title:type+i, creator:'Creator', text:'Review', sourceUrl:null, thumbnailUrl:null });
      const data = { person:{ id:'person', slug:'person', name:'Person' }, branches:['BOOK','VIDEO','GAME','MUSIC'].map(type=>({key:type,count:2,items:[item(type,1),item(type,2)]})) };
      createRoot(document.getElementById('root')).render(<><AnimatedHeight><HomeGraph data={data}/></AnimatedHeight><section id="following">Following section</section></>);
    ` },
    plugins: [{ name: 'home-media-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      const empty = 'export default function Empty() { return null }'
      const mocks: Record<string, string> = {
        'next-intl': "export const useTranslations = () => key => key;",
        'next/dynamic': `import React, { lazy, Suspense } from 'react'; export default (load, options={}) => { const Component=lazy(load); return props=><Suspense fallback={options.loading ? <options.loading/> : null}><Component {...props}/></Suspense> }`,
        '@/i18n/navigation': "export const Link = 'a'; export const useRouter = () => ({refresh(){}});",
        '@/actions/contents/getMediaEmbed': `export async function getMediaEmbed(id) { window.mediaCalls=(window.mediaCalls||0)+1; await new Promise(resolve=>setTimeout(resolve,700)); if(id.startsWith('MUSIC'))return {embedType:'appleMusicPreview',embedId:id,previewUrl:null}; return {embedType:'youtube',embedId:id,images:Array.from({length:12},()=> 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>')}; }`,
        './HomeGraphNode': "export const HomeGraphRoot = () => <div style={{height:196}}>Person</div>;",
        './HomeWorkCover': empty,
        '@/components/ui/ClippedContentReadingText': 'export default p => <p>{p.text}</p>;',
        '@/components/ui/ContentTextModal': empty,
        '@/components/features/faction/FactionArtworkViewer': empty,
        '@/components/ui/ContentImage': 'export default p => <img src={p.src} alt={p.alt} style={{position:"absolute",width:"100%",height:"100%"}}/>;',
        '@/hooks/useMouseDragScroll': "import {useRef} from 'react'; export const useMouseDragScroll=()=>({ref:useRef(null),dragProps:{},cursorClassName:''});",
      }
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: appDir }))
    } }],
  })
  const cssRequire = createRequire(require.resolve('@tailwindcss/postcss'))
  const css = await cssRequire('postcss')([require('@tailwindcss/postcss')()]).process(
    '@import "tailwindcss" source(none); @source "./src/components/features/content/*.tsx"; @source "./src/components/ui/pending/*.tsx"; @theme { --color-bg-main:#10100f; --color-bg-card:#1b1a18; --color-line:#38352f; --color-accent:#d7bd78; --radius-card:12px; --radius-control:6px; }',
    { from: path.join(appDir, 'home-media-fixture.css') },
  )
  return {
    js: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text,
    css: css.css + output.outputFiles.find((file: { path: string }) => file.path.endsWith('.css')).text,
  }
}

test('home media switches without a blank panel, loading growth, overlap or repeat fetch', async t => {
  const bundle = await fixture()
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const width of [390, 1440]) await t.test(`${width}px`, async () => {
      const page = await browser.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      try {
        await page.setViewport({ width, height: 844 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:820px;margin:200px auto"></div></body></html>' }))
        await page.goto('http://home-media.test/')
        await page.addStyleTag({ content: bundle.css + ':root{--home-person-width:220px}' })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-media-reading="BOOK"]', { timeout: 3000 }).catch(error => { throw new Error(errors.join('\n') || String(error)) })
        await page.click('[data-media-mode="VIDEO"]')
        await page.waitForSelector('[data-media-reading="VIDEO"]', { timeout: 150 })
        const opacity = await page.$eval('[data-media-reading="VIDEO"]', element => getComputedStyle(element).opacity)
        assert.equal(opacity, '1', 'New content must be visible without waiting for an exit animation')
        const measure = () => page.$eval('[data-home-work-media]', element => ({ height: element.getBoundingClientRect().height, slots: [...element.querySelectorAll('.aspect-video')].map(slot => ({ height: slot.getBoundingClientRect().height, width: slot.getBoundingClientRect().width })) }))
        const pending = await measure()
        await page.waitForSelector('[data-content-image-gallery]')
        await new Promise(resolve => setTimeout(resolve, 350))
        const loaded = await measure()
        assert.ok(Math.abs(pending.height - loaded.height) <= 2, `Loading geometry: ${JSON.stringify({pending,loaded})}`)
        assert.ok(await page.evaluate(() => document.querySelector('[data-animated-height]')!.getBoundingClientRect().bottom <= document.querySelector('#following')!.getBoundingClientRect().top + 1))
        await page.click('[data-media-mode="BOOK"]')
        await page.click('[data-media-mode="VIDEO"]')
        assert.equal(await page.$('[aria-busy="true"]'), null, 'Revisiting a loaded tab must not show another placeholder')
        assert.equal(await page.evaluate(() => (window as unknown as { mediaCalls: number }).mediaCalls), 1)
        await page.click('[data-next-work]')
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-next-work')), true)
        for (const type of ['GAME', 'BOOK', 'VIDEO']) await page.click(`[data-media-mode="${type}"]`)
        assert.equal(await page.$eval('[data-media-reading]', element => element.getAttribute('data-media-reading')), 'VIDEO')
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
