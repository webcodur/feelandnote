import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type FixtureWindow = Window & { calls: { catalog: number; read: number; profession: number }; count: number; failRead: boolean }
type FixtureBuilder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}

test('책장이 가까워질 때 목록을 받고 감상·직군은 선택한 분류만 조회·재시도한다', async () => {
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir: fileURLToPath(new URL('./', import.meta.url)), loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import Shelf from './AtlasWorkShelf';
      window.calls = { catalog: 0, read: 0, profession: 0 };
      createRoot(document.getElementById('root')).render(<><h1>세력 소개</h1><div style={{height:2200}}/><Shelf mode="faction" theme={{id:"f", name:"세력", slug:"f"}} works={[]} memberIds={['a']} onCount={count => { window.count = count; }}/></>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'shelf-fixture', setup(builder: FixtureBuilder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {}', loader: 'js' }))
      builder.onResolve({ filter: /^(next-intl|.*getFactionFigureBooks|.*getFactionMemberShelf|.*BookShelfSelection|.*BookShelfBookList|.*AtlasBookShelfSkeleton|.*pending|.*DeveloperCommerceFallback)$/ }, (args: { path: string }) => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args: { path: string }) => {
        let contents = ''
        if (args.path === 'next-intl') contents = `export const useLocale = () => 'ko'; export const useTranslations = () => Object.assign(key => key, { has: () => false });`
        else if (args.path.endsWith('getFactionFigureBooks')) contents = `export function getFactionFigureBooks() { window.calls.catalog++; return Promise.resolve([
          {contentId:'theme', title:'세력', url:'', isTheme:true, memberIds:[], appearedIds:[], authoredIds:[]},
          {contentId:'authored', title:'집필 책', url:'', memberIds:['a'], appearedIds:[], authoredIds:['a']}
        ]); }`
        else if (args.path.endsWith('getFactionMemberShelf')) contents = `export function getFactionReadBooks() { window.calls.read++; return window.failRead ? Promise.reject(new Error('DB failed')) : Promise.resolve([{contentId:'read', title:'읽은 책', url:'', memberIds:['a'], appearedIds:[], authoredIds:[]}]); }
          export function getFactionProfessionShelf() { window.calls.profession++; return Promise.resolve({profession:null,professionBooks:[]}); }`
        else if (args.path.endsWith('BookShelfSelection')) contents = `export default function Selection({books}) { return <div data-selection>{books[0]?.title}</div>; }`
        else if (args.path.endsWith('BookShelfBookList')) contents = `export default function List({pending,categoryPicker}) { return <div>{categoryPicker}{pending}</div>; }`
        else if (args.path.endsWith('AtlasBookShelfSkeleton')) contents = `export default function Skeleton() { return <div data-skeleton style={{height:400}}/>; }`
        else if (args.path.endsWith('DeveloperCommerceFallback')) contents = `export default function Empty() { return null; }`
        else contents = `export function RetryBlock({onRetry}) { return <button data-retry onClick={onRetry}>Retry</button>; }`
        return { contents, loader: 'jsx', resolveDir: fileURLToPath(new URL('./', import.meta.url)) }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.on('pageerror', error => console.error('Shelf fixture browser error:', String(error)))
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('[data-skeleton]', { timeout: 5000 })
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { catalog: 0, read: 0, profession: 0 })
    assert.equal(await page.$eval('h1', element => element.textContent), '세력 소개')
    await page.$eval('[data-skeleton]', element => element.scrollIntoView())
    await page.waitForSelector('[data-selection]')
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).calls), { catalog: 1, read: 0, profession: 0 })
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).count), 2)
    const choose = async (key: string) => {
      await page.evaluate(key => {
        const button = [...document.querySelectorAll('button')].find(element => element.textContent?.includes(key))
        if (!button || button.disabled) throw new Error('Unavailable category: ' + key)
        button.click()
      }, key)
    }
    await page.evaluate(() => { (window as unknown as FixtureWindow).failRead = true })
    await choose('groupRead')
    await page.waitForSelector('[data-retry]')
    await page.evaluate(() => { (window as unknown as FixtureWindow).failRead = false })
    await page.click('[data-retry]')
    await page.waitForFunction(() => document.querySelector('[data-selection]')?.textContent === '읽은 책')
    await choose('groupAuthored')
    await choose('groupRead')
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.read), 2)
    assert.equal(await page.evaluate(() => (window as unknown as FixtureWindow).calls.profession), 0)
    await choose('groupProfession')
    await page.waitForFunction(() => (window as unknown as FixtureWindow).calls.profession === 1 && !document.querySelector('[data-bookshelf-loading]'))
    assert.equal(await page.$eval('h1', element => element.textContent), '세력 소개')
  } finally { await browser.close() }
})
