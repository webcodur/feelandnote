import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type Builder = { onResolve: (options: { filter: RegExp }, cb: (args: { path: string }) => unknown) => void; onLoad: (options: { filter: RegExp; namespace?: string }, cb: (args: { path: string }) => unknown) => void }
type FixtureWindow = Window & { queries: string[]; resolve: (key: string, value: unknown) => void; update: (props: Record<string, unknown>) => void; locale: string }

async function fixture(entry: string, mocks: Record<string, string>) {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  return (await build({
    absWorkingDir: fileURLToPath(new URL('../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client'; import {useState} from 'react';
      window.queries=[]; window.pending={}; window.locale='ko';
      window.request=key=>{window.queries.push(key);return new Promise(resolve=>window.pending[key]=resolve)};
      window.resolve=(key,value)=>window.pending[key](value);
      ${entry}
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'shelf-prefetch', setup(builder: Builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        const name=args.path.split('/').pop()!
        return mocks[name] ? {path:name,namespace:'fixture'} : undefined
      })
      builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir}))
    } }],
  })).outputFiles[0].text
}

const sharedMocks = {
  'next-intl': `export const useLocale=()=>window.locale;export const useTranslations=()=>key=>key;`,
  'dynamic': `export default function dynamic(){return ()=>null}`,
  'MobileIndexModal': `export default function Modal(){return null}`,
  'BookShelfReviewDetail': `export default function Review(){return null}`,
  'LibraryShelfUtilities': `export default function Utilities(){return null}`,
  'topOverlayBottom': `export const TOP_OVERLAY_MIN_BOTTOM=0;export const topOverlayBottom=()=>0;`,
  'LibraryDetailNavigation': `export const LIBRARY_DETAIL_FRAME_CLASS='';export function LibraryArrowButton({direction,onClick}){return <button data-nav={direction} onClick={onClick}>{direction}</button>};export function LibraryTitleHeader({title}){return <h3>{title}</h3>};export function LibraryBottomNavigation(){return null}`,
}

test('review shelf fetches only current and actual next work in parallel, reuses pending results and ignores stale selection', async () => {
  const script = await fixture(`
    import Reviews from '../features/user/contentLibrary/expand/ExpandDetailView';
    const item=(id,type)=>({id,content_id:id,content:{id,title:id,type}});
    const items=[item('a','BOOK'),item('music','MUSIC'),item('b','BOOK')];
    function App(){const [props,setProps]=useState({items,celebId:'figure'});window.update=next=>setProps(p=>({...p,...next}));return <Reviews {...props}/>}
    createRoot(document.getElementById('root')).render(<App/>);
  `, {...sharedMocks,
    'getContentBrief': `export function getContentBriefResult(id,locale){return window.request('brief:'+locale+':'+id)}`,
    'getCelebContentExpand': `export function getPublicCelebContentRecord(celeb,id){return window.request('record:'+(celeb==='figure'?'':celeb+':')+id)}`,
    'contentLibraryTypes': `export function mapPublicToUserContent(items){return items}`,
    'operation': `export const beginOperation=()=>()=>{};`,
    'ExpandCard': `export default function Card({item,brief}){return <article data-current={item.content_id} data-brief={brief?.contentId} data-record={item.review}/>}`,
    'ExpandNavigation': `export {LibraryArrowButton as ExpandArrowButton,LibraryTitleHeader as ExpandTitleHeader,LibraryBottomNavigation as ExpandBottomNavigation} from './LibraryDetailNavigation';`,
  })
  const browser=await puppeteer.launch({headless:true})
  try {
    const page=await browser.newPage()
    await page.setContent('<div id="root"></div>');await page.addScriptTag({content:script})
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.length===4)
    assert.deepEqual((await page.evaluate(()=>(window as unknown as FixtureWindow).queries)).sort(), ['brief:ko:a','brief:ko:b','record:a','record:b'].sort(), 'Prefetch must follow grouped navigation and stop one item ahead while current requests remain pending')
    const resolve=async(id:string)=>page.evaluate(id=>{
      const w=window as unknown as FixtureWindow
      w.resolve('brief:ko:'+id,{status:'ready',brief:{contentId:id,category:'book',metadata:null}})
      w.resolve('record:'+id,{content_id:id,review:'review-'+id,content:{id,title:id,type:'BOOK'}})
    },id)
    await resolve('b')
    await page.click('[data-nav=next]')
    await page.waitForSelector('article[data-current=b][data-brief=b][data-record=review-b]')
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.length===6)
    await resolve('a')
    assert.equal(await page.$eval('article',node=>node.getAttribute('data-current')),'b','A late previous response must not replace the current work')
    await resolve('music')
    await page.click('[data-nav=next]');await page.waitForSelector('article[data-current=music][data-brief=music]')
    await page.click('[data-nav=next]');await page.waitForSelector('article[data-current=a][data-brief=a]')
    assert.equal(await page.evaluate(()=>(window as unknown as FixtureWindow).queries.length),6,'Selecting a prefetched work and wrapping must reuse cached results')
    await page.evaluate(()=>{const w=window as unknown as FixtureWindow;w.locale='en';w.update({isActive:false})})
    await page.waitForFunction(()=>!document.querySelector('article[data-brief]'))
    assert.equal(await page.evaluate(()=>(window as unknown as FixtureWindow).queries.length),6,'Inactive shelves must not prefetch')
    await page.evaluate(()=>(window as unknown as FixtureWindow).update({isActive:true}))
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.length===8)
    assert.deepEqual((await page.evaluate(()=>(window as unknown as FixtureWindow).queries)).slice(-2).sort(),['brief:en:a','brief:en:b'],'Locale changes need their own current and next introductions')
    await page.evaluate(()=>(window as unknown as FixtureWindow).update({celebId:'other'}))
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.length===10)
    assert.deepEqual((await page.evaluate(()=>(window as unknown as FixtureWindow).queries)).slice(-2).sort(),['record:other:a','record:other:b'],'Review caches must be scoped to the person, including the next work')
    assert.equal(await page.$('article[data-record]'),null,'Another person must not inherit the previous review')
  } finally {await browser.close()}
})

test('reference shelf prefetches next book and its preferred edition introduction with the edition locale and reuses both', async () => {
  const script=await fixture(`
    import Selection from './BookShelf/BookShelfSelection';
    const books=['a','b','c'].map(id=>({id,title:id,editions:[],detailsLoaded:false}));
    createRoot(document.getElementById('root')).render(<Selection selectionKey="appearance" intro="Books" books={books} listOpen={false} onListOpenChange={()=>{}}/>);
  `, {...sharedMocks,
    'getBookShelfBook': `export function getBookShelfBook(id,locale){return window.request('book:'+locale+':'+id)}`,
    'fetchBookMetadata': `export function getBookIntroduction(isbn,locale){return window.request('intro:'+locale+':'+isbn)}`,
    'BookShelfFeature': `import {useBookIntroduction} from '@/hooks/useBookIntroduction';export default function Feature({source}){const e=source.editions.find(e=>e.id===source.preferredEditionId)||source.editions[0];const intro=useBookIntroduction(e?.bookIntroduction,e?.locale||'ko',e?.description);return <article data-reference={source.id} data-intro={intro.description}/>}`,
    'BookShelfRelations': `export function prefetchBookShelfPeople(){};export default function Relations(){return null}`,
    'BookShelfBookList': `export default function List(){return null}`,
    'pending': `export function RetryBlock(){return null}`,
  })
  const browser=await puppeteer.launch({headless:true})
  try {
    const page=await browser.newPage()
    await page.setContent('<div id="root"></div>');await page.addScriptTag({content:script})
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.length===2)
    assert.deepEqual(await page.evaluate(()=>(window as unknown as FixtureWindow).queries),['book:ko:a','book:ko:b'])
    await page.evaluate(()=>(window as unknown as FixtureWindow).resolve('book:ko:b',{id:'b',title:'b',preferredEditionId:2,editions:[{id:1,locale:'ko'},{id:2,locale:'en',bookIntroduction:{isbn:'english-b',source:'openlibrary'}}]}))
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.includes('intro:en:english-b'))
    await page.evaluate(()=>(window as unknown as FixtureWindow).resolve('intro:en:english-b','Prepared introduction'))
    await page.click('[data-nav=next]')
    await page.waitForSelector('article[data-reference=b][data-intro="Prepared introduction"]')
    await page.waitForFunction(()=>(window as unknown as FixtureWindow).queries.includes('book:ko:c'))
    const queries=await page.evaluate(()=>(window as unknown as FixtureWindow).queries)
    assert.equal(queries.filter(q=>q==='book:ko:b').length,1,'Selecting next must reuse its metadata request')
    assert.equal(queries.filter(q=>q==='intro:en:english-b').length,1,'Selecting next must reuse its edition-language introduction request')
    assert.equal(queries.includes('intro:ko:english-b'),false)
  } finally {await browser.close()}
})
