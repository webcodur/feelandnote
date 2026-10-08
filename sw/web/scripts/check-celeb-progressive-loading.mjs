import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import path from 'node:path'

const browser = await puppeteer.launch({ headless: true })
const base = process.env.CELEB_CHECK_URL ?? 'http://localhost:3000'
try {
  for (const width of [1440, 390]) {
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    // 자동화 UA는 의도적으로 완성 HTML을 받는다. 여기서는 사용자 스트리밍 경로를 검사한다.
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'))
    await page.setExtraHTTPHeaders({ 'Accept-Language': width === 1440 ? 'en-US' : 'ko-KR' })
    await page.setCookie({ name: 'NEXT_LOCALE', value: width === 1440 ? 'en' : 'ko', domain: new URL(base).hostname, path: '/' })
    const errors = []
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack) })
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
    await page.evaluateOnNewDocument(() => {
      window.__celebTiming = {}
      const observe = () => {
        const visible = selector => [...document.querySelectorAll(selector)].some(element => element.getClientRects().length)
        for (const [key, selector] of Object.entries({ identity: '[data-page-identity],#introduction',
          reading: '#person-guide', library: '[data-celeb-loaded="library"]', books: '[data-celeb-loaded="books"]',
          waiting: '[role="status"][aria-label*="Loading"],[role="status"][aria-label*="불러"],[role="status"][aria-label*="펼치"]' })) {
          if (!window.__celebTiming[key] && visible(selector)) window.__celebTiming[key] = Math.round(performance.now())
        }
      }
      new MutationObserver(observe).observe(document, { childList: true, subtree: true, attributes: true })
    })
    // 영어 자료도 검수한다. 첫 실행에서는 별도의 locale 캐시를 쓰므로 콜드 조회를 관찰할 수 있다.
    const route = width === 1440 ? '/en/celeb/pearl-s.-buck' : '/celeb/pearl-s.-buck'
    const navigation = page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (process.env.CELEB_SCREENSHOT_DIR) {
      await page.waitForSelector('#affiliate-books [role="status"]', { visible: true, timeout: 15_000 })
      await page.waitForSelector('[data-celeb-loaded="library"]', { visible: true, timeout: 15_000 })
      // 첫 이동의 스크롤 복원과 경쟁하지 않도록 실제 문서 좌표로 대기 구획을 촬영한다.
      const clip = await page.$eval('#affiliate-books', (element, width) => {
        const top = Math.max(0, element.getBoundingClientRect().top + window.scrollY - 360)
        return { x: 0, y: top, width, height: Math.min(900, document.documentElement.scrollHeight - top) }
      }, width)
      const screenshot = path.join(process.env.CELEB_SCREENSHOT_DIR, `celeb-loading-${width}-${Date.now()}.png`)
      await page.screenshot({ path: screenshot, clip, captureBeyondViewport: true })
      console.log(JSON.stringify({ screenshot }))
    }
    await navigation
    await page.waitForSelector('[data-celeb-loaded="library"]', { visible: true, timeout: 30_000 })
    await page.waitForSelector('[data-celeb-loaded="books"]', { visible: true, timeout: 30_000 })
    await page.waitForFunction(() => window.__celebTiming.reading && window.__celebTiming.library && window.__celebTiming.books)
    const state = await page.evaluate(() => ({ timing: window.__celebTiming,
      reading: document.querySelector('#person-guide')?.innerText,
      library: document.querySelector('#library')?.innerText,
      books: document.querySelector('#affiliate-books')?.innerText,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      anchor: getComputedStyle(document.documentElement).overflowAnchor,
    }))
    assert.ok(state.reading?.trim())
    assert.ok(state.library?.trim())
    assert.ok(state.books?.trim())
    assert.equal(state.overflow, false, 'progressive sections must fit narrow screens')
    assert.equal(state.anchor, 'none')
    assert.deepEqual(errors, [], 'no client render or intl context errors')
    console.log(JSON.stringify({ width, route, ...state.timing, anchor: state.anchor }))
    if (process.env.CELEB_EXPECT_BOOK_DELAY) assert.ok(state.timing.books > state.timing.reading + 1000,
      'reading must appear while reference books are delayed')
    // 타임라인은 첫 화면의 필수 조회가 아니며, 열면 대기 안내 또는 실제 사건을 표시한다.
    const timelineLabel = width === 1440 ? 'Timeline' : '타임라인'
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 })
    await page.waitForFunction(label => !!document.querySelector(`button[aria-label="${label}"]`), {}, timelineLabel)
    await page.click(`button[aria-label="${timelineLabel}"]`)
    await page.waitForSelector('[role="dialog"]', { visible: true, timeout: 15_000 })
    await page.waitForFunction(() => !!document.querySelector('[data-timeline-modal]') ||
      document.querySelector('[role="dialog"]')?.innerText.includes('생애 기록이 없습니다') ||
      document.querySelector('[role="dialog"]')?.innerText.includes('No timeline entries'), { timeout: 15_000 })
    assert.deepEqual(errors, [])
    await context.close()
  }
} finally {
  await browser.close()
}
