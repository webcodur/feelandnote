import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const origin = process.env.CELEB_FILTER_CHECK_BASE_URL ?? 'http://localhost:3000'
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Use a local test server')
const browser = await puppeteer.launch({ headless: true })
try {
  for (const [width, prefix, search, warning] of [[1440, '', '예수', '이전 결과'], [390, '/en', 'Jesus', 'Previous results']]) {
    const page = await browser.newPage()
    try {
      await page.setViewport({ width, height: 900 })
      let failNext = true
      let rejected = false
      let listingPosts = 0
      await page.setRequestInterception(true)
      page.on('request', request => {
        if (request.method() === 'POST' && request.headers()['next-action'] && request.url().includes('/explore')) listingPosts++
        if (failNext && request.method() === 'POST' && request.headers()['next-action'] && request.url().includes('/explore')) {
          failNext = false
          rejected = true
          void request.abort('failed')
        } else void request.continue()
      })
      await page.goto(`${origin}${prefix}/explore?reality=BOTH`, { waitUntil: 'networkidle2', timeout: 45_000 })
      const input = 'form input[type="search"]'
      const cards = 'section[aria-busy] button[aria-haspopup="dialog"]'
      await page.waitForFunction(selector => {
        const element = document.querySelector(selector)
        return element && Object.keys(element).some(key => key.startsWith('__reactProps'))
      }, {}, input)
      const before = await page.$$eval(cards, elements => elements.length)
      assert.ok(before > 0)
      const sizes = await page.$$eval('section[aria-busy] select option', elements => elements.map(element => Number(element.value)))
      assert.deepEqual(sizes, [12, 24, 48])
      await page.type(input, search)
      await page.keyboard.press('Enter')
      await page.waitForFunction(text => document.querySelector('section[aria-busy="false"] [role="status"]')?.textContent?.includes(text), {}, warning)
      assert.equal(rejected, true)
      assert.equal(await page.$$eval(cards, elements => elements.length), before, 'failed queries must preserve the previous list')
      await page.click('section[aria-busy="false"] [role="status"] button')
      await page.waitForFunction(() => {
        const section = document.querySelector('section[aria-busy="false"]')
        return section && !section.querySelector('[role="status"] button') && section.querySelector('button[aria-haspopup="dialog"]')
      }, { timeout: 20_000 })
      const beforeCacheHit = listingPosts
      await page.focus(input)
      await page.keyboard.press('Enter')
      await page.waitForNetworkIdle({ idleTime: 150 })
      assert.equal(listingPosts, beforeCacheHit, 'a recent successful filter must reuse browser memory')
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await page.keyboard.press('Enter')
      await page.waitForFunction(() => document.querySelector('section[aria-busy="false"] button[aria-haspopup="dialog"]'))
      await page.waitForNetworkIdle({ idleTime: 150 })
      assert.equal(listingPosts, beforeCacheHit + 1, 'returning to the tab must invalidate cached viewer state')
      await page.type(input, 'x'.repeat(100))
      assert.equal(await page.$eval(input, element => element.value.length), 80)
      console.log(`PASS ${width}px ${prefix || '/ko'}: limits, retained results, retry, browser cache and focus invalidation`)
    } finally { await page.close() }
  }
} finally { await browser.close() }
