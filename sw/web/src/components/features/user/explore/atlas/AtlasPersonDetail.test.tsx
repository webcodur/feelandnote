import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type Builder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}
type FixtureWindow = Window & {
  calls: { reviews: number; books: number }
  openPerson: (mode: string, reality: string) => void
}

test('myth and faction person windows share one shelf, retain tab state and avoid duplicate page anchors or queries', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client';import {useState} from 'react';
      import Person from './AtlasPersonDetail';import Shelf from '@/components/features/celeb/CelebShelfSection';
      window.calls={reviews:0,books:0};
      function App(){const [state,setState]=useState({mode:'faction',reality:'REAL'});window.openPerson=(mode,reality)=>setState({mode,reality});
        const person={id:state.mode+state.reality,name:'Person',reality:state.reality,reading:null,appearances:[],voiceV:0,avatarUrl:null};
        return <><div data-page><Shelf pageAnchors hasReviews librarySlot={<p>Page reviews</p>} booksSlot={<p>Page references</p>}/></div>
          <div data-person-window><Person mode={state.mode} person={person} theme={{id:'theme',name:'Theme'}} onClose={()=>{}}/></div></>}
      createRoot(document.getElementById('root')).render(<App/>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'person-shelf-fixture', setup(builder: Builder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
      builder.onResolve({ filter: /^(next-intl|.*\/(Modal|AtlasNav|HubSection|FormattedText|NarratedGuideModal|NarratedMonologueModal|FactionPersonHeader|ContentLibrary|CelebBookShelf|CelebSectionSkeleton|pending|useContainerSectionNavigation|useReadingNarration|useCelebReadingGuide|useCelebVirtualMonologue|useCelebVoice|mythLeadImage|getUserContents|getCelebReferenceBooks))$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useLocale=()=>'ko';export const useTranslations=()=>key=>key;`
        else if (args.path.endsWith('/Modal')) contents = `export default function Modal({children}){return <div data-modal>{children}</div>}`
        else if (args.path.endsWith('/AtlasNav')) contents = `export default function Nav({items}){return <nav data-person-nav>{items.map(item=><a key={item.key} href={'#'+item.sectionId}>{item.label}</a>)}</nav>}`
        else if (args.path.endsWith('/HubSection')) contents = `export default function Section({id,title,children}){return <section id={id}><h3>{title}</h3>{children}</section>}`
        else if (args.path.endsWith('/useContainerSectionNavigation')) contents = `export function useContainerSectionNavigation(){return {activeSectionId:'',navigate(){}}}`
        else if (args.path.endsWith('/useReadingNarration')) contents = `export function useAudioAvailable(){return false}`
        else if (args.path.endsWith('/useCelebReadingGuide')) contents = `export function useCelebReadingGuide(){return null}`
        else if (args.path.endsWith('/useCelebVirtualMonologue')) contents = `export function useCelebVirtualMonologue(){return null}`
        else if (args.path.endsWith('/useCelebVoice')) contents = `export function useCelebVoice(){return {canGreet:false}}`
        else if (args.path.endsWith('/mythLeadImage')) contents = `export function mythLeadImage(){return null}`
        else if (args.path.endsWith('/getUserContents')) contents = `export async function getPublicUserContents(){window.calls.reviews++;return {items:[],total:1}}`
        else if (args.path.endsWith('/getCelebReferenceBooks')) contents = `export async function getCelebReferenceBooks(){window.calls.books++;return {appeared:[],authored:[],professionBooks:[],factionGroups:[]}}`
        else if (args.path.endsWith('/ContentLibrary') || args.path.endsWith('/CelebBookShelf')) {
          const kind = args.path.endsWith('/ContentLibrary') ? 'reviews' : 'books'
          contents = `import {useState} from 'react';export default function Shelf(){const [at,setAt]=useState(0);return <button data-probe="${kind}" onClick={()=>setAt(n=>n+1)}>Work {at}</button>}`
        } else if (args.path.endsWith('/pending')) contents = `export function PendingBlock(){return <div data-pending/>};export function RetryBlock(){return <div data-retry/>}`
        else contents = `export default function Empty(){return null}`
        return { contents, loader: 'jsx', resolveDir }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.setContent('<style>[hidden]{display:none}</style><div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    const root = '[data-person-window]'
    for (const mode of ['faction', 'myth']) {
      if (mode === 'myth') await page.evaluate(() => (window as unknown as FixtureWindow).openPerson('myth', 'REAL'))
      await page.waitForSelector(`${root} [data-probe="reviews"]`)
      assert.equal(await page.$$eval('[data-person-nav] a', nodes => nodes.length), 2, 'The window has profile and one shelf in its contents')
      assert.equal(await page.$$eval(`${root} [data-celeb-shelf]`, nodes => nodes.length), 1)
      assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { reviews: mode === 'faction' ? 1 : 2, books: mode === 'faction' ? 0 : 1 })
      await page.click(`${root} [data-probe="reviews"]`)
      await page.click(`${root} [role="tab"]:last-child`)
      await page.waitForSelector(`${root} [data-probe="books"]`)
      await page.click(`${root} [data-probe="books"]`)
      await page.click(`${root} [role="tab"]:first-child`)
      await page.waitForSelector(`${root} [data-probe="reviews"]`, { visible: true })
      assert.equal(await page.$eval(`${root} [data-probe="reviews"]`, node => node.textContent), 'Work 1')
      await page.click(`${root} [role="tab"]:last-child`)
      await page.waitForSelector(`${root} [data-probe="books"]`, { visible: true })
      assert.equal(await page.$eval(`${root} [data-probe="books"]`, node => node.textContent), 'Work 1')
      assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { reviews: mode === 'faction' ? 1 : 2, books: mode === 'faction' ? 1 : 2 }, 'Returning to a loaded tab must not query it again')
      assert.equal(await page.$$eval('#affiliate-books', nodes => nodes.length), 1, 'The modal must not duplicate page anchors')
      assert.equal(await page.$$eval('#archive', nodes => nodes.length), 1)
    }
    await page.evaluate(() => (window as unknown as FixtureWindow).openPerson('myth', 'FICTION'))
    await page.waitForFunction(() => !document.querySelector('[data-person-window] [role="tablist"]'))
    await page.waitForSelector(`${root} [data-probe="books"]`)
    assert.equal(await page.$(`${root} [data-probe="reviews"]`), null)
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { reviews: 2, books: 3 })
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
