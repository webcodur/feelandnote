import assert from 'node:assert/strict'
import test from 'node:test'
import puppeteer from 'puppeteer'
import { fixture } from './HomeGraph.browser.fixture'

test('all home works keep icon-only introduction controls, including missing introductions', async t => {
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
        assert.equal(await page.$eval('[data-home-reading-toggle]', e => e.textContent), '')
        assert.ok(await page.$eval('[data-home-reading-toggle]', e => e.getAttribute('aria-label')))
        assert.equal(await page.$('[data-home-reading-actions]'), null)
        assert.equal(await page.$('[data-home-person-records], [data-home-service-records], [data-home-work-intro]'), null)
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'review')
        assert.ok(await page.$('[data-content-reading-label="review"] a'))
        const geometry = await page.$eval('[data-home-reading-toggle]', e => ({ height: e.getBoundingClientRect().height, width: e.scrollWidth, available: e.clientWidth }))
        assert.ok(geometry.height >= 44 && geometry.width <= geometry.available + 1)
        await page.locator('[data-home-reading-toggle]').click()
        await page.waitForFunction(() => document.querySelector('[data-home-reading-preview]')?.textContent?.includes('Introduction of BOOK1'))
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'intro')
        assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Introduction of BOOK1')))
        assert.equal(await page.$('[data-content-reading-label="review"] a, [data-test-text-modal]'), null)
        await waitForToggle()
        await page.locator('[data-home-reading-toggle]').click()
        assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Review')))
        assert.ok(await page.$('[data-content-reading-label="review"] a'))
        await page.click('[data-next-work]')
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'review')
        assert.equal(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Introduction of BOOK1')), false, 'A new book must not inherit the previous introduction')
        await waitForToggle()
        await page.waitForFunction(() => (window as Window & { introSettled?: number }).introSettled === 2)
        await page.click('[data-media-mode="MUSIC"]')
        assert.ok(await page.$('[data-home-reading-toggle]'), 'Music also keeps an introduction control')
        assert.equal(await page.$eval('[data-media-toggle]', e => e.textContent), '')
        await page.click('[data-home-reading-toggle]')
        await page.waitForFunction(() => document.querySelector('[data-home-reading-preview]')?.textContent?.includes('Introduction of MUSIC1'))
        await page.click('[data-media-mode="BOOK"]')
        await waitForToggle()
        assert.equal(await page.evaluate(() => (window as Window & { introCalls?: number }).introCalls), 3, 'Revisited introductions stay cached')
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
        await page.waitForFunction(() => document.querySelector('[data-home-reading-preview]')?.textContent?.includes('Only the introduction') || document.querySelector('[data-content-reading-label="review"] a'))
        assert.ok(await page.$('[data-home-reading-toggle]'), 'Keep the introduction control even with only one text or a failed request')
        assert.equal(await page.$eval('[data-home-reading-toggle]', element => (element as HTMLButtonElement).disabled), kind === 'intro-only', 'Only a work with an appreciation background can switch between the two texts')
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), kind === 'intro-only' ? 'intro' : 'review')
        await page.click('[data-home-reading-toggle]')
        assert.equal(await page.$eval('[data-graph-reading]', e => e.getAttribute('data-reading-mode')), 'intro')
        if (kind === 'intro-only') assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Only the introduction')))
        else {
          assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('작품 소개: 작품 소개는 상세 페이지에서 확인할 수 있습니다.')))
          await page.click('[data-home-reading-toggle]')
          assert.ok(await page.$('[data-content-reading-label="review"] a'), 'The review remains available when an introduction is missing')
        }
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
