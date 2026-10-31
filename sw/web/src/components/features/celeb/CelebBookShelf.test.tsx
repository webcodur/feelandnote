import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type FixtureWindow = Window & { calls: { profession: number; faction: number }; fail: boolean; failFactions: boolean; changePerson: () => void; locale?: string }
type Builder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}

test('personal shelf loads profession counts on visibility without switching books, preserves controls and retries failures', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client'; import {useState} from 'react'; import Shelf from './CelebBookShelf';
      window.calls={profession:0,faction:0};
      function App(){const [id,setId]=useState('a');window.changePerson=()=>setId(current=>current==='a'?'b':'a');return <Shelf celebId={id}
        appeared={[{id:'first',title:'First',editions:[],creator:null}]} authored={[]} profession="author"
        professionBooks={[]} factionGroups={[]} supplementaryDeferred/>}createRoot(document.getElementById('root')).render(<><div style={{height:2200}}/><App/><div style={{height:2200}}/></>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'personal-shelf-fixture', setup(builder: Builder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
      builder.onResolve({ filter: /^(next-intl|next\/image|@\/i18n\/navigation|.*getProfessionBooks|.*getCelebFactionBooks|.*BookShelfSelection|.*BookShelfBookList|.*pending)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useLocale=()=>window.locale??'ko';export const useTranslations=namespace=>Object.assign((key,values={})=>key==='bookShelfCategoryTitle'?values.category:namespace==='profession'&&key==='author'?(window.locale==='en'?'Author':'작가'):key,{has:key=>namespace==='profession'&&key==='author'});`
        else if (args.path === 'next/image') contents = `export default function Image({src,alt,width,height}){return <img src={src} alt={alt} width={width} height={height}/>} `
        else if (args.path === '@/i18n/navigation') contents = `export const Link=({href,children,...props})=><a href={href} {...props}>{children}</a>`
        else if (args.path.endsWith('getProfessionBooks')) contents = `export async function getProfessionBooks(){window.calls.profession++;if(window.fail)throw Error('DB failed');return [{contentId:'professional',title:'Training',professionCategory:'train'},{contentId:'learning',title:'Learning',professionCategory:'become'},{contentId:'exploring',title:'Exploring',professionCategory:'about'}]}`
        else if (args.path.endsWith('getCelebFactionBooks')) contents = `export async function getCelebFactionBooks(id){window.calls.faction++;if(window.failFactions)throw Error('DB failed');return id==='b'?[]:[{factionId:'f',factionSlug:'faction',factionName:'Faction',books:[{contentId:'affiliation',title:'Affiliation'}]},{factionId:'g',factionSlug:'myth',factionName:'Myth',isMyth:true,books:[{contentId:'myth',title:'Myth Book'}]}]}`
        else if (args.path.endsWith('BookShelfSelection')) contents = `export default function Selection({books,categoryPicker,listOpen,onListOpenChange}){return <><div data-selection>{books[0]?.title}</div><button data-open-list onClick={()=>onListOpenChange(true)}>Open list</button>{listOpen&&<div data-list-controls>{categoryPicker}</div>}</>}`
        else if (args.path.endsWith('BookShelfBookList')) contents = `export default function List(){return null}`
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
    await page.waitForSelector('[data-bookshelf-select-affiliation]')
    assert.ok(await page.$eval('[data-bookshelf-activate-personal]', node => node.textContent?.includes('작가')), 'The profession card must show its actual name before lazy loading')
    assert.equal(await page.$$eval('[data-bookshelf-relations] button', nodes => nodes.length), 2, 'Appeared and authored belong in a separate relation row')
    assert.equal(await page.$eval('[data-bookshelf-relation="authored"]', node => (node as HTMLButtonElement).disabled), true)
    assert.equal(await page.$('[data-bookshelf-select-category]'), null, 'Relations and profession must not share a dropdown')
    assert.ok(await page.$eval('[data-bookshelf-subcontrols]', node => !node.textContent?.includes('0')), 'Unloaded profession counts must not appear as zero')
    assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'false')
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { profession: 0, faction: 1 })
    assert.equal(await page.$('details'), null, 'The shelf must not show redundant category help')
    const choose = async (name: string) => page.click(name === '작가' ? '[data-bookshelf-activate-personal]' : '[data-bookshelf-relation="appeared"]')
    await page.$eval('[data-celeb-bookshelf]', node => node.scrollIntoView())
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.profession === 1
      && [...document.querySelectorAll('[data-bookshelf-subcontrols] button')].every(node => node.textContent?.includes('1')))
    assert.equal(await page.$eval('[data-selection]', node => node.textContent), 'First', 'Background counts must arrive without selecting profession or replacing the current book')
    assert.equal(await page.$eval('[data-bookshelf-relation="appeared"]', node => node.getAttribute('aria-checked')), 'true')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.faction), 1)
    await choose('작가')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Training')
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 800 })
      assert.ok(await page.evaluate(() => {
        const profession = document.querySelector('[data-bookshelf-subcontrols]')!
        const affiliation = document.querySelector('[data-bookshelf-affiliation]')!
        const personal = document.querySelector('[data-bookshelf-profession-controls]')!
        const relations = document.querySelector('[data-bookshelf-relations]')!
        return affiliation.getBoundingClientRect().bottom <= personal.getBoundingClientRect().top
          && personal.contains(profession)
          && !personal.contains(relations)
      }), 'Affiliations must stay above the personal card, with profession choices inside it on desktop and mobile')
      const affiliationTop = await page.$eval('[data-bookshelf-affiliation]', node => node.getBoundingClientRect().top)
      await choose('groupAppeared')
      assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getBoundingClientRect().top), affiliationTop, 'Hiding profession choices must not move the affiliation control')
      await choose('작가')
      assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getBoundingClientRect().top), affiliationTop, 'Showing profession choices must not move the affiliation control')
    }
    await choose('groupAppeared'); await choose('작가')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.profession), 1, 'Switching categories must reuse the profession books loaded in the background')
    await page.click('[data-bookshelf-activate-affiliation]')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Affiliation')
    assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'true')
    assert.equal(await page.$$eval('[role="radio"][aria-checked="true"]', nodes => nodes.length), 0)
    assert.equal(await page.$$eval('[data-bookshelf-subcontrols] button', nodes => nodes.length), 3, 'The personal card keeps its choices while viewing affiliations')
    await page.focus('[data-bookshelf-subcontrols] button:first-child')
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Learning')
    assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'false')
    const personalHeight = await page.$eval('[data-bookshelf-profession-controls]', node => node.getBoundingClientRect().height)
    await page.click('[data-bookshelf-activate-affiliation]')
    await page.click('[data-bookshelf-activate-personal]')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Learning')
    assert.equal(await page.$eval('[data-bookshelf-profession-controls]', node => node.getBoundingClientRect().height), personalHeight, 'Switching sources preserves the profession card height and choice')
    await choose('groupAppeared')
    assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'false')
    await page.click('[data-bookshelf-select-affiliation]')
    await page.keyboard.press('Escape')
    assert.equal(await page.$eval('[data-bookshelf-affiliation]', node => node.getAttribute('data-active')), 'false', 'Opening the dropdown must not activate the affiliation')
    await page.select('[data-bookshelf-select-affiliation]', 'g')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Myth Book')
    assert.ok(await page.$('a[href="/explore/myth/myth"]'), 'The page link must follow the selected affiliation')
    await choose('작가')
    await page.focus('[data-bookshelf-activate-affiliation]')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Myth Book')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.faction), 1)
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).fail = true;
      (window as unknown as FixtureWindow).changePerson();
    })
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'First')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.faction === 2 && !document.querySelector('[data-bookshelf-group-control]'))
    assert.equal(await page.$('[data-bookshelf-select-affiliation]'), null, 'People without affiliations must not have an empty selector')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.profession === 2)
    assert.equal(await page.$eval('[data-selection]', node => node.textContent), 'First', 'A failed background count request must leave the current book in place')
    await choose('작가')
    await page.waitForSelector('[data-retry]')
    await page.evaluate(() => { (window as unknown as FixtureWindow).fail = false })
    await page.click('[data-retry]')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.profession === 3)
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).failFactions = true;
      (window as unknown as FixtureWindow).changePerson();
    })
    await page.waitForSelector('[data-bookshelf-group-control="faction"] [data-retry]')
    assert.equal(await page.$eval('[data-selection]', node => node.textContent), 'First', 'Affiliation failures must not hide the current category')
    await page.evaluate(() => { (window as unknown as FixtureWindow).failFactions = false })
    await page.click('[data-bookshelf-group-control="faction"] [data-retry]')
    await page.waitForSelector('[data-bookshelf-select-affiliation]')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.faction), 4)
    await page.evaluate(() => {
      (window as unknown as FixtureWindow).locale = 'en';
      (window as unknown as FixtureWindow).changePerson();
    })
    await page.waitForFunction(() => document.querySelector('[data-bookshelf-activate-personal]')?.textContent?.includes('Author'))
    await page.click('[data-open-list]')
    assert.ok(await page.$('[data-list-controls] [data-bookshelf-personal-controls]'), 'The book list must use the same personal card controls')
    assert.ok(await page.$('[data-list-controls] [data-bookshelf-relations]'))
    await page.click('[data-list-controls] [data-bookshelf-activate-personal]')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === 'Training')
    assert.equal(await page.$$eval('[data-list-controls] [data-bookshelf-subcontrols] button', nodes => nodes.length), 3)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
