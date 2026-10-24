import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const postcss = require('postcss')
const tailwind = require('@tailwindcss/postcss')
type Builder = {
  onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void
  onLoad: (options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => unknown) => void
}

test('all records toggle and icon-only page link share one control and keep navigation confirmation', async () => {
  const resolveDir = fileURLToPath(new URL('./', import.meta.url))
  const output = await build({
    absWorkingDir: fileURLToPath(new URL('../../../../../../', import.meta.url)),
    tsconfig: fileURLToPath(new URL('../../../../../../tsconfig.json', import.meta.url)),
    stdin: { resolveDir, loader: 'tsx', contents: `
      import {createRoot} from 'react-dom/client';import Reviews from './ReviewsSection';
      window.routes=[];
      createRoot(document.getElementById('root')).render(<Reviews userId="figure" slug="author" nickname="Author" emptyMessage="Empty" initialContents={{total:2}}/>);
    ` },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env': '{}' },
    plugins: [{ name: 'records-controls-fixture', setup(builder: Builder) {
      builder.onResolve({ filter: /^(next-intl|.*\/navigation|.*\/ContentLibrary|.*ViewAllRecordsConfirmModal)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        let contents: string
        if (args.path === 'next-intl') contents = `export const useTranslations=()=>key=>key;`
        else if (args.path.endsWith('/navigation')) contents = `export function Link(props){return <a {...props}/>};export const useRouter=()=>({push:href=>window.routes.push(href)});`
        else if (args.path.endsWith('/ContentLibrary')) contents = `
          import {useState,useEffect} from 'react';import Utilities from '@/components/shared/LibraryShelfUtilities';
          export default function Library({recordsAction,filterTrailing,onActiveContentChange}){
            const [all,setAll]=useState(false);
            useEffect(()=>{onActiveContentChange('track-a',0)},[onActiveContentChange]);
            return <><div data-old-filter>{filterTrailing}</div><Utilities showAllItems={all} onAllItemsChange={setAll} recordsAction={recordsAction}/>{all&&<div data-all-records/>}</>
          }`
        else contents = `export default function Confirm({isOpen,onConfirm}){return isOpen&&<button data-confirm onClick={onConfirm}>Confirm</button>}`
        return { contents, loader: 'jsx', resolveDir }
      })
    } }],
  })
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    const css = await postcss([tailwind()]).process(`
      @import "tailwindcss" source(none);
      @source "./components/shared/LibraryShelfUtilities.tsx";
      @source "./app/[locale]/(main)/celeb/[slug]/ReviewsSection.tsx";
      @theme { --color-accent: #ddbb66; --radius-control: 6px; }
    `, { from: fileURLToPath(new URL('../../../../../shelf-hover.css', import.meta.url)) })
    await page.setContent('<div id="root"></div>')
    await page.addStyleTag({ content: css.css })
    await page.addScriptTag({ content: output.outputFiles[0].text })
    await page.waitForSelector('[data-shelf-records-actions] a[href$="focus=track-a"]')
    assert.equal(await page.$$eval('[data-old-filter] a', nodes => nodes.length), 0, 'The separate full-width records link must be removed')
    assert.equal(await page.$eval('[data-shelf-all-toggle]', node => node.textContent?.trim()), 'shelfViewAll')
    assert.equal(await page.$eval('[data-shelf-single-toggle]', node => node.textContent?.trim()), 'shelfViewSingle')
    assert.ok(await page.$('[data-shelf-all-option] [data-shelf-all-toggle]'))
    assert.ok(await page.$('[data-shelf-all-option] a'), 'The page arrow belongs inside the all-view segment')
    const arrowLayout = await page.$eval('[data-shelf-all-option] a', node => {
      const arrow = node.getBoundingClientRect()
      const option = node.closest('[data-shelf-all-option]')!.getBoundingClientRect()
      const style = getComputedStyle(node)
      return { insets: [arrow.left - option.left, option.right - arrow.right, arrow.top - option.top, option.bottom - arrow.bottom], border: style.borderLeftWidth }
    })
    assert.ok(arrowLayout.insets.every(inset => inset >= 3), 'The arrow must sit inset inside all view, not form an adjacent segment')
    assert.equal(arrowLayout.border, '1px', 'The inset page arrow must have its own outline')
    assert.equal(await page.$eval('[data-shelf-records-actions] a', node => node.textContent), '', 'Only the arrow icon belongs in the page link')
    assert.equal(await page.$eval('[data-shelf-records-actions] a', node => node.getAttribute('aria-label')), 'records.openPage')
    for (const target of ['[data-shelf-single-toggle]', '[data-shelf-all-toggle]', '[data-shelf-records-actions] a']) {
      await page.hover(target)
      const border = await page.$eval('[data-shelf-records-actions]', node => {
        const style = getComputedStyle(node)
        return { width: style.borderTopWidth, colors: [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor], overflow: style.overflow }
      })
      assert.equal(border.width, '1px', 'Joined controls must share one outer border')
      assert.deepEqual(border.colors, Array(4).fill('rgb(221, 187, 102)'), 'Hovering either half must highlight the full outline uniformly')
      assert.equal(border.overflow, 'hidden', 'Hover fills must stay inside the shared rounded corners')
    }
    await page.click('[data-shelf-all-toggle]')
    await page.waitForSelector('[data-all-records]')
    assert.equal(await page.$eval('[data-shelf-all-toggle]', node => node.getAttribute('aria-pressed')), 'true')
    assert.equal(await page.$('[data-confirm]'), null)
    await page.click('[data-shelf-records-actions] a')
    await page.waitForSelector('[data-confirm]')
    assert.equal(await page.$eval('[data-shelf-all-toggle]', node => node.getAttribute('aria-pressed')), 'true')
    assert.equal(await page.evaluate(() => (window as unknown as { routes: string[] }).routes.length), 0)
    await page.click('[data-confirm]')
    const routes = await page.evaluate(() => (window as unknown as { routes: string[] }).routes)
    assert.equal(routes.length, 1)
    assert.ok(routes[0].endsWith('/author/records?focus=track-a'))
    assert.deepEqual(errors, [])
  } finally {
    await browser.close()
  }
})
