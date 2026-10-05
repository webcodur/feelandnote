import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true, args: ['--mute-audio'] })
const locale = process.argv.includes('--en') ? 'en' : 'ko'
const sizes = process.argv.includes('--all')
  ? [{ width: 624, height: 718 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]
  : [{ width: 624, height: 718 }]
try {
  for (const viewport of sizes) {
    const page = await browser.newPage()
    page.setDefaultTimeout(60_000)
    await page.setViewport(viewport)
    await page.setExtraHTTPHeaders({ 'Accept-Language': locale })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') console.error(message.text())
    })
    const click = async selector => {
      await page.waitForSelector(selector)
      await page.$eval(selector, button => button.click())
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    await page.goto(`http://localhost:3000/${locale}/explore/faction/xai`, { waitUntil: 'networkidle2', timeout: 90_000 })
    console.log(JSON.stringify({ viewport, step: 'faction loaded' }))
    await page.addStyleTag({ content: '* { scroll-behavior: auto !important; transition-duration: 0s !important; animation-duration: 0s !important; }' })
    await new Promise(resolve => setTimeout(resolve, 1000))
    await page.waitForFunction(() => {
      const button = document.querySelectorAll('[data-bookshelf] [role="radio"]')[2]
      return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true'
    }, { timeout: 90_000 })
    console.log(JSON.stringify({ viewport, step: 'reading list loaded' }))
    await page.$$eval('[data-bookshelf] [role="radio"]', buttons => buttons[2].click())
    await page.waitForFunction(() => document.querySelectorAll('[data-bookshelf] [role="radio"]')[2]?.getAttribute('aria-checked') === 'true')
    await new Promise(resolve => setTimeout(resolve, 1200))
    await click('[data-bookshelf-selection] header button[aria-expanded]')
    await page.waitForFunction(() => document.querySelector('[data-bookshelf-selection] header button[aria-expanded]')?.getAttribute('aria-expanded') === 'true')
    await page.waitForSelector('[data-bookshelf-book-list]')
    await click('[data-bookshelf-list-book="5706fb16-214a-4862-b970-343ae1f0bc76"]')
    await click('[data-bookshelf-open-people="read"]')
    await page.$$eval('[data-figure-person-row="8e338e26-272c-4bc7-8b9b-92a6f2bafe73"] button[aria-haspopup="dialog"]', buttons => buttons.at(-1).click())
    await page.waitForSelector('[data-celeb-context-review]', { timeout: 30_000 })
    await new Promise(resolve => setTimeout(resolve, 700))
    const geometry = await page.evaluate(() => {
      const review = document.querySelector('[data-celeb-context-review]')
      const dialog = review.closest('[role="dialog"]')
      const r = review.getBoundingClientRect()
      const d = dialog.getBoundingClientRect()
      const text = review.querySelector('.custom-scrollbar')
      const portrait = dialog.querySelector('[data-celeb-modal-portrait]').getBoundingClientRect()
      const follow = dialog.querySelector('[data-celeb-modal-follow]').getBoundingClientRect()
      return {
        reviewBottom: r.bottom, dialogBottom: d.bottom,
        reviewHeight: r.height, textHeight: text?.clientHeight,
        visible: r.top >= d.top && r.bottom <= d.bottom + 1,
        followAtPortraitBottomRight: follow.left > portrait.left + portrait.width / 2 && follow.top > portrait.top + portrait.height / 2,
      }
    })
    const screenshot = join(tmpdir(), `celeb-context-review-${locale}-${viewport.width}x${viewport.height}.png`)
    await page.screenshot({ path: screenshot })
    console.log(JSON.stringify({ locale, viewport, geometry, errors, screenshot }))
    assert(geometry.visible, 'The single context review card must fit inside the initial modal viewport')
    assert(geometry.textHeight >= 48, 'The context review must retain a readable text area')
    assert(geometry.followAtPortraitBottomRight, 'The follow button must sit at the portrait bottom right')
    assert.equal(errors.length, 0)
    await page.close()
  }
} finally {
  await browser.close()
}
