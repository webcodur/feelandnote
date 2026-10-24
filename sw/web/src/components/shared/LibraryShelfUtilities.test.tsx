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

test('review and book shelves default to visible introductions and collapsed records, expand lazily and retain selection', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client'; import Shelf from './BookShelf/BookShelf';
      import Reviews from '../features/user/contentLibrary/expand/ExpandDetailView';
      const books=Array.from({length:20},(_,i)=>({id:'book-'+i,title:'Book '+i,creator:null,editions:[],detailsLoaded:true,thumbnailUrl:null}));
      const items=books.map(b=>({id:b.id,content_id:b.id,content:{id:b.id,title:b.title,creator:null,type:'BOOK',thumbnail_url:null}}));
      createRoot(document.getElementById('root')).render(<>
        <div data-review-shelf><Reviews items={items} recordsAction={<a href="/records?focus=book-1" aria-label="Open records" onClick={event=>{event.preventDefault();window.recordVisits=(window.recordVisits??0)+1}}>↗</a>}/></div>
        <div data-book-shelf><Shelf ariaLabel="Books" groups={[{key:'books',label:'Books',intro:'Books',books}]}/></div>
      </>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'shelf-utilities-fixture', setup(builder: Builder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
      builder.onResolve({ filter: /^(next-intl|next\/dynamic|.*\/(ExpandCard|useContentBrief|useCelebContentRecord|ExpandNavigation|LibraryDetailNavigation|MobileIndexModal|BookShelfBookList|BookShelfFeature|BookShelfRelations|useBookIntroduction|getBookShelfBook|LibraryCategoryPicker))$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useLocale=()=>'ko';export const useTranslations=()=>key=>key;`
        else if (args.path === 'next/dynamic') contents = `export default function dynamic(){return ()=>null}`
        else if (args.path.endsWith('/ExpandCard')) contents = `export default function Card({item,showIntroduction}){return <article data-card={item.id} style={{minHeight:300}}>{showIntroduction&&<p data-intro>Introduction</p>}</article>}`
        else if (args.path.endsWith('/BookShelfFeature')) contents = `export default function Feature({source,showIntroduction}){return <article data-card={source.id} style={{minHeight:300}}>{showIntroduction&&<p data-intro>Introduction</p>}</article>}`
        else if (args.path.endsWith('/useContentBrief')) contents = `export function useContentBrief(ids,at,id){return {contentId:id,brief:null,isLoading:false,hasError:false,retry(){}}}`
        else if (args.path.endsWith('/useCelebContentRecord')) contents = `export function useCelebContentRecord(){return {record:null,isLoading:false,hasError:false,retry(){}}}`
        else if (args.path.endsWith('/useBookIntroduction')) contents = `export function prefetchBookIntroduction(){}`
        else if (args.path.endsWith('/getBookShelfBook')) contents = `export async function getBookShelfBook(){throw Error('Unexpected detail lookup')}`
        else if (args.path.endsWith('/BookShelfRelations')) contents = `export function prefetchBookShelfPeople(){};export default function Relations(){return null}`
        else if (args.path.endsWith('/ExpandNavigation') || args.path.endsWith('/LibraryDetailNavigation')) contents = `
          export const LIBRARY_DETAIL_FRAME_CLASS='frame';
          export function LibraryTitleHeader({title}){return <header><h3>{title}</h3></header>}
          export function LibraryArrowButton({direction,onClick,disabled}){return <button data-direction={direction} disabled={disabled} onClick={onClick}>{direction}</button>}
          export function LibraryBottomNavigation(){return null}
          export {LibraryTitleHeader as ExpandTitleHeader,LibraryArrowButton as ExpandArrowButton,LibraryBottomNavigation as ExpandBottomNavigation};`
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
    await page.setViewport({ width: 1000, height: 700 })
    await page.setContent('<style>[hidden]{display:none} [data-shelf-list-item]{margin-bottom:24px} [aria-busy=true]{min-height:320px}</style><div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('[data-book-shelf] [data-card]')
    for (const root of ['[data-review-shelf]', '[data-book-shelf]']) {
      const utilities = `${root} [data-shelf-utilities]`
      const all = `${utilities} [data-shelf-all-toggle]`
      const single = `${utilities} [data-shelf-single-toggle]`
      assert.deepEqual(await page.$$eval(`${utilities} button`, nodes => nodes.map(node => node.getAttribute('aria-pressed'))), ['true', 'false'])
      assert.equal(await page.$(`${utilities} [data-shelf-intro-toggle]`), null, 'The introduction toggle stays hidden')
      assert.equal(await page.$$eval(`${root} [data-intro]`, nodes => nodes.length), 1)
      assert.equal(await page.$eval(all, node => node.textContent?.trim()), 'shelfViewAll')
      assert.equal(await page.$eval(single, node => node.textContent?.trim()), 'shelfViewSingle')
      if (root === '[data-review-shelf]') {
        assert.equal(await page.$eval(`${utilities} a`, node => node.getAttribute('href')), '/records?focus=book-1')
        await page.click(`${utilities} a`)
        assert.equal(await page.$eval(all, node => node.getAttribute('aria-pressed')), 'false', 'The page arrow must not toggle inline records')
      }
      await page.click(`${root} [data-direction="next"]`)
      await page.waitForSelector(`${root} [data-card="book-1"]`)
      await page.waitForSelector(`${root} [data-intro]`)
      await page.click(all)
      await page.waitForSelector(`${root} [data-shelf-all-items]`)
      assert.deepEqual(await page.$$eval(`${utilities} button`, nodes => nodes.map(node => node.getAttribute('aria-pressed'))), ['false', 'true'])
      assert.equal(await page.$eval(all, node => node.textContent?.trim()), 'shelfViewAll')
      await page.click(all)
      assert.ok(await page.$(`${root} [data-shelf-all-items]`), 'Selecting the active mode must keep it active')
      assert.equal(await page.$$eval(`${root} [data-shelf-list-item]`, nodes => nodes.length), 20)
      assert.equal(await page.$$eval(`${utilities} button`, nodes => nodes.length), 2, 'All-items cards must not duplicate utility buttons')
      assert.ok(await page.$$eval(`${root} [data-shelf-all-items] [data-card]`, nodes => nodes.length) < 20, 'Offscreen details must remain deferred')
      await page.$eval(`${root} [data-shelf-list-item]:last-child`, node => node.scrollIntoView())
      await page.waitForSelector(`${root} [data-shelf-all-items] [data-card="book-19"] [data-intro]`)
      await page.click(single)
      await page.waitForFunction(root => !document.querySelector(`${root} [data-shelf-all-items]`), {}, root)
      assert.equal(await page.$eval(all, node => node.textContent?.trim()), 'shelfViewAll')
      assert.deepEqual(await page.$$eval(`${utilities} button`, nodes => nodes.map(node => node.getAttribute('aria-pressed'))), ['true', 'false'])
      assert.equal(await page.$eval(`${root} [data-card]`, node => node.getAttribute('data-card')), 'book-1')
      assert.equal(await page.$$eval(`${root} [data-intro]`, nodes => nodes.length), 1, 'Introduction remains visible after collapsing all records')
      await page.focus(single)
      await page.keyboard.press('ArrowRight')
      await page.waitForSelector(`${root} [data-shelf-all-items]`)
      assert.equal(await page.$eval(all, node => document.activeElement === node), true)
      await page.keyboard.press('ArrowLeft')
      await page.waitForFunction(root => !document.querySelector(`${root} [data-shelf-all-items]`), {}, root)
      assert.equal(await page.$eval(single, node => document.activeElement === node), true)
      assert.equal(await page.$eval(`${root} [data-card]`, node => node.getAttribute('data-card')), 'book-1', 'Mode arrow keys must not navigate the selected work')
    }
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
