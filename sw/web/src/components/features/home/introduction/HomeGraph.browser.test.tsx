import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import path from 'node:path'
import puppeteer from 'puppeteer'
import { HOME_PERSON_ROTATION_STORAGE_PREFIX } from './config'

import { appDir, fixture } from './HomeGraph.browser.fixture'

const require = createRequire(import.meta.url)

test('home media uses a modal without page growth or repeat fetch', async t => {
  const bundles = { en: await fixture('en'), ko: await fixture('ko') }
  const browser = await puppeteer.launch({ headless: true })
  try {
    const cases = [...[320, 390, 712, 1440].map(width => ({ width, locale: 'en' as const })), { width: 390, locale: 'ko' as const }]
    for (const { width, locale } of cases) await t.test(`${locale} ${width}px`, async () => {
      const bundle = bundles[locale]
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      try {
        await page.setViewport({ width, height: 844 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:200px auto;padding:0 16px"></div></body></html>' }))
        await page.goto('http://home-media.test/')
        await page.evaluate(key => sessionStorage.setItem(key, '2'), `${HOME_PERSON_ROTATION_STORAGE_PREFIX}:appreciations`)
        await page.addStyleTag({ content: bundle.css + 'html,body{overflow-anchor:none} #following{min-height:100vh}' })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-media-reading="BOOK"]', { timeout: 3000 }).catch(error => { throw new Error(errors.join('\n') || String(error)) })
        const checkSelection = async (type: string) => {
          assert.equal(await page.$eval('[data-media-reading]', element => element.getAttribute('data-media-reading')), type)
        }
        await checkSelection('BOOK')
        await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-animated-height]')!).overflow !== 'clip')
        assert.equal(await page.$('[data-home-reading-actions]'), null, 'The three footer actions are removed')
        await page.waitForSelector('[data-home-reading-toggle]')
        await page.click('[data-home-reading-toggle]')
        await page.waitForFunction(() => document.querySelector('[data-home-reading-preview]')?.textContent?.includes('Introduction of BOOK1'))
        assert.equal(await page.evaluate(() => (window as Window & { introCalls?: number }).introCalls), 1)
        await page.click('[data-home-reading-toggle]')
        assert.ok(await page.$('[data-content-reading-label="review"] a'))
        assert.equal(await page.$('[data-home-media-description]'), null)
        assert.equal(await page.$('[data-home-explore]'), null)
        assert.equal(await page.$eval('[data-cover-zoom]', element => element.previousElementSibling?.getAttribute('href')), '/content/BOOK1')
        await page.click('[data-cover-zoom] > span')
        await page.waitForSelector('[data-test-cover-preview]')
        assert.equal(new URL(page.url()).pathname, '/', 'Expanding the cover must not navigate to the work')
        await page.click('[data-test-cover-preview] button')
        assert.equal(await page.$('[data-test-cover-preview]'), null)
        await page.waitForFunction(() => document.querySelector('[data-rotation-index]')?.textContent === '2')
        if (width < 860) {
          const portrait = await page.$eval('[data-person-image="portrait"]', element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }))
          assert.ok(portrait.width >= 128 && portrait.height > portrait.width, 'Mobile must show a readable vertical portrait')
          assert.ok(Math.abs(portrait.width / portrait.height - 0.8) < 0.02, 'Keep the source portrait ratio on mobile')
          assert.equal(await page.$eval('[data-person-image="avatar"]', element => getComputedStyle(element).display), 'none', 'Use the avatar only as a fallback when a portrait is available')
        } else {
          assert.ok(await page.$eval('[data-person-image="portrait"]', element => element.getBoundingClientRect().width >= 300), 'Wide layouts must give the representative photo enough space')
          assert.equal(await page.$eval('[data-person-image="avatar"]', element => getComputedStyle(element).display), 'none')
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'English labels must stay within the viewport')
        await page.click('[data-media-mode="VIDEO"]')
        await page.waitForSelector('[data-media-reading="VIDEO"]', { timeout: 150 })
        await checkSelection('VIDEO')
        const opacity = await page.$eval('[data-media-reading="VIDEO"]', element => getComputedStyle(element).opacity)
        assert.equal(opacity, '1', 'New content must be visible without waiting for an exit animation')
        assert.equal(await page.$('[data-content-image-gallery]'), null)
        assert.equal(await page.evaluate(() => (window as unknown as { mediaCalls?: number }).mediaCalls ?? 0), 0, 'Closed previews must not fetch media')
        const waitForPreview = async () => {
          await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-animated-height]')!).overflow !== 'clip')
        }
        await waitForPreview()
        const cardHeight = await page.$eval('[data-home-graph]', e => e.getBoundingClientRect().height)
        assert.equal(await page.$eval('[data-next-work]', e => e.textContent?.trim()), '', 'Next work is an icon-only control')
        assert.ok(await page.$eval('[data-next-work]', e => e.getBoundingClientRect().width >= 44))
        assert.ok(await page.$$eval('[role="tab"] [class*="label"]', labels => labels.every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)))
        if (width >= 860) assert.ok(await page.$eval('[data-home-reading-preview]', e => e.getBoundingClientRect().height >= 220), 'The reading text fills the freed column height')
        await page.locator('[data-media-toggle]').click()
        await page.waitForSelector('[data-test-media-modal]')
        await page.waitForSelector('[data-content-image-gallery]', { timeout: 3000 })
        assert.ok(await page.$eval('[data-content-image-gallery]', e => !!e.closest('[role="dialog"]')))
        assert.equal(await page.$eval('[data-home-graph]', e => e.getBoundingClientRect().height), cardHeight, 'Opening media must not enlarge the page card')
        await page.keyboard.press('Escape')
        assert.equal(await page.$('[data-test-media-modal], [data-content-image-gallery], iframe'), null, 'Closing the modal unmounts its media')
        await page.locator('[data-media-toggle]').click()
        await page.waitForSelector('[data-content-image-gallery]')
        assert.equal(await page.evaluate(() => (window as unknown as { mediaCalls: number }).mediaCalls), 1, 'Reopening a preview reuses the cached media')
        await page.click('[data-media-close]')
        await page.click('[data-media-mode="BOOK"]')
        await page.click('[data-media-mode="VIDEO"]')
        await waitForPreview()
        assert.equal(await page.$eval('[data-media-toggle]', e => e.getAttribute('aria-expanded')), 'false')
        await page.locator('[data-media-toggle]').click()
        await page.waitForSelector('[data-content-image-gallery]')
        assert.equal(await page.evaluate(() => (window as unknown as { mediaCalls: number }).mediaCalls), 1)
        await page.click('[data-media-close]')
        await page.click('[data-next-work]')
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-next-work')), true)
        assert.equal(await page.$eval('[data-media-toggle]', e => e.getAttribute('aria-expanded')), 'false')
        await checkSelection('VIDEO')
        for (const type of ['GAME', 'BOOK', 'MUSIC', 'VIDEO']) {
          await page.click(`[data-media-mode="${type}"]`)
          await checkSelection(type)
        }
        await page.keyboard.press('ArrowRight')
        await checkSelection('GAME')
        await page.keyboard.press('Home')
        await checkSelection('BOOK')
        await page.keyboard.press('End')
        await checkSelection('MUSIC')
        await waitForPreview()
        await page.locator('[data-media-toggle]').click()
        await page.waitForSelector('[data-test-media-modal] [role="status"]')
        await page.click('[data-media-close]')
        await page.click('[data-media-mode="VIDEO"]')
        assert.equal(await page.$eval('[data-media-reading]', element => element.getAttribute('data-media-reading')), 'VIDEO')
        await page.$eval('[data-rotation-index]', element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
        assert.equal(await page.$eval('[data-rotation-index]', element => element.textContent), '2', 'Entering the viewport must keep the restored person')
        await page.click('[data-rotation-next]')
        assert.equal(await page.evaluate(key => sessionStorage.getItem(key), `${HOME_PERSON_ROTATION_STORAGE_PREFIX}:appreciations`), '0')
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})

test('People and Books shares the person and reading layout while keeping book relationships and links', async t => {
  const [ko, en] = await Promise.all([fixture('ko', 'books'), fixture('en', 'books')])
  const bundles = { ko, en }
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const { locale, width } of [{ locale: 'ko' as const, width: 390 }, { locale: 'en' as const, width: 320 }, { locale: 'en' as const, width: 1440 }]) await t.test(`${locale} ${width}px`, async () => {
      const page = await browser.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      try {
        await page.setViewport({ width, height: 844 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:100px auto;padding:0 16px"></div></body></html>' }))
        await page.goto('http://home-books.test/')
        await page.addStyleTag({ content: bundles[locale].css + 'html,body{overflow-anchor:none} #following{min-height:100vh}' })
        await page.addScriptTag({ content: bundles[locale].js })
        await page.waitForSelector('[data-home-graph="books"] [data-book-relation="read"]')
        assert.equal(await page.$$eval('[data-book-tabs] [role="tab"]', elements => elements.length), 4)
        assert.equal(await page.$('[data-home-media-description]'), null, 'Book relationships must not show an appreciation benefit for an unread book')
        assert.equal(await page.$eval('[data-content-reading-label="review"] a', e => e.getAttribute('href')), 'https://source.test/evidence')
        if (width >= 860) {
          const person = await page.$eval('[data-graph-root]', e => ({ height: e.getBoundingClientRect().height, width: e.getBoundingClientRect().width,
            childrenHeight: [...e.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0) }))
          assert.ok(Math.abs(person.height - person.childrenHeight) < 2, 'Do not reserve an empty biography area below the person name')
          assert.ok(person.width >= 400, 'Keep the representative photo as wide as the appreciation section')
        }
        assert.ok(await page.$('[data-person-direction="1"]'))
        if (width < 860) {
          const geometry = await page.evaluate(() => {
            const photo = document.querySelector('[data-graph-origin]')!.getBoundingClientRect()
            const previous = document.querySelector('[data-person-direction="-1"]')!.getBoundingClientRect()
            const next = document.querySelector('[data-person-direction="1"]')!.getBoundingClientRect()
            return { width: photo.width, ratio: photo.width / photo.height, previousRight: previous.right, left: photo.left, right: photo.right, nextLeft: next.left,
              radius: getComputedStyle(document.querySelector('[data-graph-origin]')!).borderRadius }
          })
          assert.ok(geometry.width >= 128)
          assert.ok(Math.abs(geometry.ratio - 0.8) < 0.02, 'Preserve the original portrait ratio')
          assert.ok(geometry.previousRight <= geometry.left && geometry.nextLeft >= geometry.right, 'Person navigation must flank the portrait')
          assert.notEqual(geometry.radius, '50%', 'Do not crop the portrait into a circle')
        } else assert.ok(await page.$eval('[data-person-image="portrait"]', element => element.getBoundingClientRect().width >= 300))
        await page.click('[data-book-tab="appearance"]')
        assert.equal(await page.$eval('[data-work-id]', element => element.getAttribute('data-work-id')), 'appearance1')
        assert.ok(await page.$eval('[data-home-reading-preview]', e => e.textContent?.includes('Book introduction')))
        assert.ok(await page.$('[data-home-reading-toggle]'), 'Introduction-only books also keep the introduction control')
        assert.equal(await page.$('a[href="https://source.test/evidence"]'), null, 'A book introduction must not inherit the read-book source')
        await page.click('[data-next-work]')
        assert.equal(await page.$eval('[data-work-id]', element => element.getAttribute('data-work-id')), 'appearance2')
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-next-work')), true)
        await page.click('[data-previous-work]')
        assert.equal(await page.$eval('[data-work-id]', element => element.getAttribute('data-work-id')), 'appearance1')
        assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-previous-work')), true, 'Previous-work navigation must retain focus on its own control')
        await page.focus('[data-book-tab="appearance"]')
        await page.keyboard.press('ArrowRight')
        assert.equal(await page.$eval('[data-book-relation]', element => element.getAttribute('data-book-relation')), 'authored')
        await page.keyboard.press('End')
        assert.equal(await page.$eval('[data-book-relation]', element => element.getAttribute('data-book-relation')), 'affiliation')
        const link = await page.$eval('a[href="/explore/faction/their-world"]', element => ({ label: element.getAttribute('aria-label'), text: element.textContent }))
        const labels = require(path.join(appDir, 'messages', locale, 'home.json')).home.landing.graph
        assert.equal(link.label, labels.openAffiliation.replace('{name}', 'Their world'))
        assert.ok(link.text?.includes('Their world'))
        const context = await page.$eval('[data-home-book-context]', element => ({ text: element.textContent,
          afterWork: !!(document.querySelector('[data-home-work-controls]')!.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) }))
        assert.ok(context.afterWork, 'Show the work before its related-theme context')
        assert.ok(context.text?.includes('A theme about people and their world.'))
        assert.ok(!context.text?.includes('Stephen Fry'), 'Do not repeat a generic person-to-theme sentence')
        await page.keyboard.press('Home')
        assert.equal(await page.$eval('[data-book-relation]', element => element.getAttribute('data-book-relation')), 'read')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Relationship tabs and the shared reading layout must fit the viewport')
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
