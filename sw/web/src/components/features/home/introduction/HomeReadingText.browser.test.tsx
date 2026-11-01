import assert from 'node:assert/strict'
import test from 'node:test'
import puppeteer from 'puppeteer'
import { fixture } from './HomeGraph.browser.fixture'

test('home reading opens full text only when clipped, in both home sections', async t => {
  const bundles = {
    appreciations: await fixture('ko', 'appreciations'),
    books: await fixture('en', 'books'),
  }
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const mode of ['appreciations', 'books'] as const) for (const width of [390, 1440]) await t.test(`${mode} ${width}px`, async () => {
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)
      const bundle = bundles[mode]
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      try {
        await page.setViewport({ width, height: 900 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:30px auto;padding:0 16px"></div></body></html>' }))
        await page.goto('http://home-reading.test/')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-graph-reading]')
        const openText = '[data-graph-reading] [role="button"][aria-haspopup="dialog"]'
        const checkShort = async (label: string) => {
          assert.ok(await page.$eval('[data-graph-reading]', (element, value) => element.textContent?.includes(value), label))
          assert.equal(await page.$(openText), null, 'Fully visible text must not be a modal trigger')
          assert.equal(await page.$('[data-graph-reading] .clip-fade-end'), null)
          if (label === 'About the work:') assert.equal(await page.$('[data-home-review-source]'), null)
          else {
            const source = await page.$eval('[data-home-review-source]', e => ({ href: e.getAttribute('href'), target: e.getAttribute('target'), underline: getComputedStyle(e).textDecorationLine, nested: !!e.closest('[role="button"]') }))
            assert.equal(source.href, 'https://source.test/evidence')
            assert.equal(source.target, '_blank')
            assert.equal(source.underline, 'underline')
            assert.equal(source.nested, false, 'Source navigation must be separate from the full-text trigger')
            const inline = await page.$eval('[data-home-reading-preview]', e => ({ text: e.textContent, display: getComputedStyle(e.lastElementChild!).display }))
            assert.ok(inline.text?.startsWith(`${label}: Review`), 'Keep the label, colon and review in the same paragraph')
            assert.equal(inline.display, 'inline')
          }
        }
        await checkShort(mode === 'books' ? 'Appreciation background' : '감상 배경')
        await page.click('[data-next-work]')
        await page.waitForSelector(openText)
        assert.ok(await page.$eval('[data-home-reading-preview]', element => element.scrollHeight > element.clientHeight + 1))
        await page.focus(openText)
        await page.keyboard.press('Enter')
        await page.waitForSelector('[data-test-text-modal]')
        assert.ok((await page.$eval('[data-test-text-modal] p', element => element.textContent?.length ?? 0)) > 1000)
        if (mode === 'books') assert.ok(await page.$('[data-test-text-modal] a[href="https://source.test/evidence"]'), 'Read-book sources remain in the full-text modal')
        await page.click('[data-test-text-modal] button')
        assert.equal(await page.$eval('[data-home-reading-preview]', e => e.scrollTop), 0, 'Closing the full text must not scroll the clipped preview past its first sentence')
        await page.click('[data-next-work]')
        await page.waitForFunction(() => document.querySelector('[data-graph-reading] [role="button"]') === null)
        await checkShort(mode === 'books' ? 'Appreciation background' : '감상 배경')
        if (mode === 'books') {
          await page.click('[data-book-tab="appearance"]')
          await checkShort('About the work:')
          await page.click('[data-next-work]')
          await page.waitForSelector(openText)
          await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-animated-height]')!).overflow !== 'clip')
          await page.click(openText)
          await page.waitForSelector('[data-test-text-modal]')
          assert.equal(await page.$('[data-test-text-modal] a'), null, 'Book introductions must not inherit a review source')
        }
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
