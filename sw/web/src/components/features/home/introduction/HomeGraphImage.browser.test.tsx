import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const appDir = fileURLToPath(new URL('../../../../../', import.meta.url))
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type ImageFrame = { blur: number; opacity: number }

async function fixture(portrait = true) {
  const source = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600"><rect width="480" height="600" fill="#a78967"/></svg>')
  const output = await build({
    absWorkingDir: appDir, tsconfig: path.join(appDir, 'tsconfig.json'), outdir: 'fixture', write: false,
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    stdin: { resolveDir: appDir, loader: 'tsx', contents: `
      import {useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {HomeGraphRoot} from './src/components/features/home/introduction/HomeGraphNode';
      import styles from './src/components/features/home/introduction/HomeGraph.module.css';
      function Example(){const [index,setIndex]=useState(0);return <div className={styles.container}><div className={styles.graph} data-person-index={index}>
        <HomeGraphRoot key={index} person={{id:String(index),slug:'person-'+index,name:'Person '+index,title:'Title',photoUrl:${portrait ? JSON.stringify(source) : 'null'},avatarUrl:${JSON.stringify(source)}}} onNavigate={()=>setIndex(value=>value+1)}/><div/>
      </div></div>}
      createRoot(document.getElementById('root')).render(<Example/>);
    ` },
    plugins: [{ name: 'person-image-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      const mocks: Record<string, string> = {
        'next-intl': 'export const useTranslations=()=>key=>key;',
        '@/i18n/navigation': "export const Link='a';",
        'next/image': 'export default p=><img src={p.src} alt={p.alt} width={p.width} height={p.height} className={p.className} onLoad={p.onLoad} onError={p.onError} style={p.fill?{position:"absolute",inset:0,width:"100%",height:"100%"}:undefined}/>;',
      }
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'tsx', resolveDir: appDir }))
    } }],
  })
  const cssRequire = createRequire(require.resolve('@tailwindcss/postcss'))
  const css = await cssRequire('postcss')([require('@tailwindcss/postcss')()]).process(
    '@import "tailwindcss" source(none); @source "./src/components/ui/BlurDissolve.tsx";',
    { from: path.join(appDir, 'person-image-fixture.css') },
  )
  return {
    js: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js')).text,
    css: css.css + output.outputFiles.find((file: { path: string }) => file.path.endsWith('.css')).text,
  }
}

test('person photos and avatars dissolve on first entry and switch cached images immediately', async t => {
  const [withPortrait, withoutPortrait] = await Promise.all([fixture(), fixture(false)])
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const { width, reduced, portrait } of [{ width: 1440, reduced: false, portrait: true }, { width: 390, reduced: false, portrait: true }, { width: 390, reduced: false, portrait: false }, { width: 1440, reduced: true, portrait: true }]) await t.test(`${width}px, reduced motion ${reduced}, portrait ${portrait}`, async () => {
      const bundle = portrait ? withPortrait : withoutPortrait
      const page = await browser.newPage()
      try {
        await page.setViewport({ width, height: 844 })
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }])
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:20px auto"></div></body></html>' }))
        await page.goto('http://person-image.test/')
        await page.addStyleTag({ content: bundle.css })
        const kind = portrait ? 'portrait' : 'avatar'
        await page.addScriptTag({ content: `
          window.imageFrames=[];
          function sampleImage(){
            const layer=document.querySelector('[data-person-image="${kind}"]');
            const target=layer?.querySelector('div')??layer;
            if(target){const style=getComputedStyle(target);window.imageFrames.push({blur:Number(style.filter.match(/blur\\(([\\d.]+)px\\)/)?.[1]??0),opacity:Number(style.opacity)});}
            requestAnimationFrame(sampleImage);
          }
          requestAnimationFrame(sampleImage);
        ` })
        await page.addScriptTag({ content: bundle.js })
        const checkEntry = async (first: boolean) => {
          await page.waitForFunction(() => {
            const frames = (window as unknown as Window & { imageFrames: ImageFrame[] }).imageFrames
            const last = frames.at(-1)
            return frames.length > 20 && last?.blur === 0 && last.opacity === 1
          })
          const frames = await page.evaluate(() => (window as unknown as Window & { imageFrames: ImageFrame[] }).imageFrames)
          assert.equal(frames.some(frame => frame.blur > 0), first && !reduced, 'Only the first entry may blur')
          assert.equal(frames.some(frame => frame.opacity < 1), first && !reduced, 'Loaded images must switch without fading')
        }
        await checkEntry(true)
        const original = await page.$eval(`[data-person-image="${kind}"] img`, element => element.getAttribute('src'))
        await page.evaluate(() => { (window as unknown as Window & { imageFrames: ImageFrame[] }).imageFrames = [] })
        await page.click('[data-person-direction="1"]')
        await page.waitForSelector('[data-person-index="1"]')
        await checkEntry(false)
        assert.equal(await page.$eval(`[data-person-image="${kind}"] img`, element => element.getAttribute('src')), original, 'The second entry exercises the same cached image')
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
