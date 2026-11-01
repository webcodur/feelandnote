import assert from 'node:assert/strict'
import test from 'node:test'
import puppeteer from 'puppeteer'
import { fixture } from './HomeGraph.browser.fixture'

test('only books with an introduction and appreciation get a same-panel switch', async t => {
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const locale of ['ko', 'en'] as const) for (const width of [320, 390, 1440]) await t.test(`${locale} ${width}px`, async () => {
      const bundle = await fixture(locale, 'appreciations', 'Stephen Fry', null, { introDelay: 150 })
      const page = await browser.newPage()
      try {
        await page.setViewport({ width, height: 1000 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:24px auto;padding:0 16px"></div></body></html>' }))
        await page.goto('http://reading-switch.test/')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        const waitForToggle = async () => {
          await page.waitForSelector('[data-home-reading-toggle]')
          await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-animated-height]')!).overflow !== 'clip')
        }
        await waitForToggle()
        assert.equal(await page.$('[data-home-reading-actions]'), null)
        assert.equal(await page.$('[data-home-person-records], [data-home-service-records], [data-home-work-intro]'), null)
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'review')
        assert.ok(await page.$('[data-home-review-source]'))
        const geometry = await page.$eval('[data-home-reading-toggle]', e => ({ height: e.getBoundingClientRect().height, width: e.scrollWidth, available: e.clientWidth }))
        assert.ok(geometry.height >= 44 && geometry.width <= geometry.available + 1)
        await page.locator('[data-home-reading-toggle]').click()
        await page.waitForFunction(() => document.querySelector('[data-graph-reading]')?.getAttribute('data-reading-mode') === 'intro')
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'intro')
        assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Introduction of BOOK1')))
        assert.equal(await page.$('[data-home-review-source], [data-test-text-modal]'), null)
        await waitForToggle()
        await page.locator('[data-home-reading-toggle]').click()
        assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Review')))
        assert.ok(await page.$('[data-home-review-source]'))
        await page.click('[data-next-work]')
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'review')
        assert.equal(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Introduction of BOOK1')), false, 'A new book must not inherit the previous introduction')
        await waitForToggle()
        await page.click('[data-media-mode="MUSIC"]')
        assert.equal(await page.$('[data-home-reading-toggle]'), null)
        await page.click('[data-media-mode="BOOK"]')
        await waitForToggle()
        assert.equal(await page.evaluate(() => (window as Window & { introCalls?: number }).introCalls), 2, 'Revisited book introductions stay cached')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      } finally { await page.close() }
    })
    for (const kind of ['review-only', 'intro-only', 'failed-intro'] as const) await t.test(kind, async () => {
      const bundle = await fixture('ko', 'appreciations', 'Stephen Fry', null, kind === 'intro-only'
        ? { review: null, intro: 'Only the introduction' } : kind === 'review-only' ? { intro: null } : { failIntro: true })
      const page = await browser.newPage()
      try {
        await page.setContent('<div id="root"></div>')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForFunction(() => (window as Window & { introSettled?: number }).introSettled === 1)
        await page.waitForFunction(() => document.querySelector('[data-home-reading-preview]')?.textContent?.includes('Only the introduction') || document.querySelector('[data-home-review-source]'))
        assert.equal(await page.$('[data-home-reading-toggle]'), null)
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), kind === 'intro-only' ? 'intro' : 'review')
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
