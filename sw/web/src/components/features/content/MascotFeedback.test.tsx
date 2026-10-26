import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
type FixtureWindow = Window & { fixture: { failAdd: boolean; failReview: boolean; reviews: { reviewPresets: string[] }[] } }

test('mascots respect save results, review sentiment, and record ownership', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client';import {useState} from 'react';
      import RecordButton from './ContentRecordButton';import Review from './MyReviewSection';
      import {EmptyState} from '../user/contentLibrary/ContentLibraryStates';
      window.fixture={failAdd:false,failReview:false,reviews:[]};
      const content={id:'work',type:'BOOK',title:'Fixture',creator:'Author'};
      function App(){const [record,setRecord]=useState(null);return <>
        <section id="record"><RecordButton content={content} userRecord={record} isLoggedIn isAuthResolved onRecordChange={setRecord}/></section>
        <section id="record-existing"><RecordButton content={content} userRecord={{id:'existing',status:'FINISHED'}} isLoggedIn isAuthResolved onRecordChange={()=>{}}/></section>
        <section id="review"><Review content={content} userRecord={record} onRecordChange={setRecord}/></section>
        <section id="after-review">Next section</section>
        <section id="owner-empty"><EmptyState message="empty" member own/></section>
        <section id="visitor-empty"><EmptyState message="empty" member/></section>
        <section id="celeb-empty"><EmptyState message="empty"/></section>
      </>}createRoot(document.getElementById('root')).render(<App/>);
    ` },
    bundle: true, write: false, outfile: 'mascot-feedback-fixture.js', platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'record-feedback-fixture', setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
      onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
    }) {
      builder.onResolve({ filter: /^(next-intl|next\/image|.*\/i18n\/navigation|.*\/actions\/contents\/(addContent|removeContent|updateReview)|.*\/ui\/Button|.*\/shared\/AuthLink)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useTranslations=()=>key=>key;`
        else if (args.path === 'next/image') contents = `export default function Image({src,alt,width,height}){return <img src={src} alt={alt} width={width} height={height}/>} `
        else if (args.path.endsWith('/i18n/navigation')) contents = `export function Link({children,...props}){return <a {...props}>{children}</a>}`
        else if (args.path.endsWith('/addContent')) contents = `export async function addContent(){await new Promise(r=>setTimeout(r,30));return window.fixture.failAdd?{success:false,error:'failed'}:{success:true,data:{userContentId:'record'}}}`
        else if (args.path.endsWith('/updateReview')) contents = `export async function updateReview(value){await new Promise(r=>setTimeout(r,30));window.fixture.reviews.push(value);return window.fixture.failReview?{success:false,error:'failed'}:{success:true}}`
        else if (args.path.endsWith('/removeContent')) contents = `export async function removeContent(){}`
        else if (args.path.endsWith('/AuthLink')) contents = `export default function AuthLink({children,...props}){return <a {...props}>{children}</a>}`
        else contents = `export default function Button({children,variant,size,unstyled,...props}){return <button {...props}>{children}</button>}`
        return { contents, loader: 'jsx', resolveDir }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 320, height: 812 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.setContent('<div id="root"></div>')
    await page.addStyleTag({ content: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.css'))!.text })
    await page.addScriptTag({ content: output.outputFiles.find((file: { path: string }) => file.path.endsWith('.js'))!.text })
    await page.waitForSelector('#record button')
    assert.ok(await page.$('#owner-empty [data-mascot="lion"]'))
    assert.equal(await page.$eval('#owner-empty a', node => node.getAttribute('href')), '/search?mode=content')
    assert.ok(await page.$('#visitor-empty [data-mascot="lion"]'))
    assert.equal(await page.$('#visitor-empty a'), null, 'Visitors must not be asked to fill someone else’s records')
    assert.equal(await page.$('#celeb-empty [data-mascot]'), null, 'Public figure records must not use the personal archive companion')
    assert.equal(await page.$('#record [data-mascot]'), null)
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixture.failAdd = true })
    await page.click('#record button')
    await page.waitForSelector('#record [role="alert"]')
    assert.equal(await page.$('#record [data-mascot]'), null, 'Failed additions must not kindle the flame')
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixture.failAdd = false })
    await page.click('#record button')
    await page.waitForSelector('#record [data-mascot="flame"]')
    assert.equal(await page.$eval('#record button', node => node.getAttribute('aria-pressed')), 'true')
    const recordedWidths = await page.evaluate(() => ['record', 'record-existing'].map(id =>
      document.querySelector(`#${id} button`)!.getBoundingClientRect().width))
    assert.ok(Math.abs(recordedWidths[0] - recordedWidths[1]) < 1, 'The success mascot must keep the recorded button width unchanged')

    await page.click('input[value="NEG_02"]')
    const nextSectionBeforeSave = await page.$eval('#after-review', node => node.getBoundingClientRect().top + window.scrollY)
    await page.click('[data-save-review]')
    await page.waitForSelector('#review [role="status"] [data-mascot="flame"]')
    const nextSectionAfterSave = await page.$eval('#after-review', node => node.getBoundingClientRect().top + window.scrollY)
    assert.ok(Math.abs(nextSectionAfterSave - nextSectionBeforeSave) < 1, 'Save feedback must not push the following section down')
    assert.equal(await page.$eval('#review [role="status"]', node => node.textContent), 'saved')
    assert.deepEqual(await page.evaluate(() => (window as unknown as FixtureWindow).fixture.reviews.at(-1)?.reviewPresets), ['지루해요'])
    const negativeFeedback = await page.$eval('#review [role="status"]', node => node.innerHTML)

    await page.click('input[value="POS_02"]')
    await page.evaluate(() => { (window as unknown as FixtureWindow).fixture.failReview = true })
    await page.click('[data-save-review]')
    await page.waitForSelector('#review [role="alert"]')
    assert.equal(await page.$('#review [data-mascot]'), null, 'Failed review saves must not show success feedback')

    await page.evaluate(() => { (window as unknown as FixtureWindow).fixture.failReview = false })
    await page.click('[data-save-review]')
    await page.waitForSelector('#review [role="status"] [data-mascot="flame"]')
    assert.equal(await page.$eval('#review [role="status"]', node => node.innerHTML), negativeFeedback)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
