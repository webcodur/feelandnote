import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type FixtureWindow = Window & { calls: { profession: number; faction: number }; fail: boolean; changePerson: () => void; locale?: string }
type Builder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}

test('personal shelf loads only the selected supplementary category, retries and resets for another person', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client'; import {useState} from 'react'; import Shelf from './CelebBookShelf';
      window.calls={profession:0,faction:0};
      function App(){const [id,setId]=useState('a');window.changePerson=()=>setId(current=>current==='a'?'b':'a');return <Shelf celebId={id}
        appeared={[{id:'first',title:'First',editions:[],creator:null}]} authored={[]} profession="author"
        professionBooks={[]} factionGroups={[]} supplementaryDeferred/>}createRoot(document.getElementById('root')).render(<App/>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'personal-shelf-fixture', setup(builder: Builder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
      builder.onResolve({ filter: /^(next-intl|.*getProfessionBooks|.*getCelebFactionBooks|.*BookShelfSelection|.*BookShelfBookList|.*BookShelfAffiliationAddon|.*pending)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useLocale=()=>window.locale??'ko';export const useTranslations=namespace=>Object.assign(key=>namespace==='profession'&&key==='author'?(window.locale==='en'?'Author':'작가'):key,{has:key=>namespace==='profession'&&key==='author'});`
        else if (args.path.endsWith('getProfessionBooks')) contents = `export async function getProfessionBooks(){window.calls.profession++;if(window.fail)throw Error('DB failed');return [{contentId:'professional',title:'Training',professionCategory:'train'}]}`
        else if (args.path.endsWith('getCelebFactionBooks')) contents = `export async function getCelebFactionBooks(){window.calls.faction++;return [{factionId:'f',factionName:'Faction',books:[{contentId:'affiliation',title:'Affiliation'}]}]}`
        else if (args.path.endsWith('BookShelfSelection')) contents = `export default function Selection({books}){return <div data-selection>{books[0]?.title}</div>}`
        else if (args.path.endsWith('BookShelfBookList')) contents = `export default function List(){return null}`
        else if (args.path.endsWith('BookShelfAffiliationAddon')) contents = `export default function Addon(){return null}`
        else contents = `export function RetryBlock({onRetry}){return <button data-retry onClick={onRetry}>Retry</button>}`
        return { contents, loader: 'jsx', resolveDir }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('[data-selection]')
    assert.ok(await page.$('[role="radio"][aria-label="작가"]'), 'The category must use the actual profession name before lazy loading')
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { profession: 0, faction: 0 })
    const choose = async (name: string) => page.evaluate(name => {
      const button = [...document.querySelectorAll('button')].find(node => node.textContent?.includes(name) || name === 'groupAffiliation' && node.textContent?.includes('affiliationCount'))
      if (!button || button.disabled) throw Error('Unavailable category: ' + name)
      button.click()
    }, name)
    await page.evaluate(() => { (window as unknown as FixtureWindow).fail = true })
    await choose('작가')
    await page.waitForSelector('[data-retry]')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.faction), 0)
    await page.evaluate(() => { (window as unknown as FixtureWindow).fail = false })
    await page.click('[data-retry]')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Training')
    await choose('groupAppeared'); await choose('작가')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.profession), 2)
    await choose('groupAffiliation')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Affiliation')
    await choose('groupAppeared'); await choose('groupAffiliation')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.faction), 1)
    await page.evaluate(() => (window as unknown as FixtureWindow).changePerson())
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'First')
    await choose('작가')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.profession === 3)
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).locale = 'en';
      (window as unknown as FixtureWindow).changePerson();
    })
    await page.waitForSelector('[role="radio"][aria-label="Author"]')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
