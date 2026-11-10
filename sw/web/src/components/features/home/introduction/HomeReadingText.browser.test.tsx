import assert from 'node:assert/strict'
import test from 'node:test'
import puppeteer from 'puppeteer'
import { fixture } from './HomeGraph.browser.fixture'

test('home reading opens full text from the clipped preview in both home sections', async t => {
  const bundles = {
    appreciations: await fixture('ko'),
    books: await fixture('en'),
  }
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const mode of ['appreciations', 'books'] as const) for (const width of [320, 390, 1440]) await t.test(`${mode} ${width}px`, async () => {
      const page = await browser.newPage()
      page.setDefaultTimeout(5000)
      const bundle = bundles[mode]
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      try {
        await page.setViewport({ width, height: 900 })
        await page.setRequestInterception(true)
        page.on('request', request => void request.respond({ contentType: 'text/html', body: `<html lang="${mode === 'appreciations' ? 'ko' : 'en'}"><body><div id="root" style="max-width:960px;margin:30px auto;padding:0 16px"></div></body></html>` }))
        await page.goto('http://home-reading.test/')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-graph-reading]')
        const heading = await page.$eval('[data-graph-reading]', element => {
          const title = element.querySelector('h3')!
          const cover = element.querySelector('a[href^="/content/"]')!
          return { titleTop: title.getBoundingClientRect().top, coverTop: cover.getBoundingClientRect().top,
            titleBreak: getComputedStyle(title).wordBreak, textBreak: getComputedStyle(element.querySelector('[data-home-reading-preview]')!).wordBreak }
        })
        assert.ok(Math.abs(heading.titleTop - heading.coverTop) <= 1, 'Keep the work title aligned to the cover top at every width')
        assert.equal(heading.titleBreak, mode === 'appreciations' ? 'break-all' : 'keep-all')
        assert.equal(heading.textBreak, mode === 'appreciations' ? 'break-all' : 'keep-all')
        if (width >= 390) {
          const controlOffset = () => page.$eval('[data-graph-reading]', element => {
            const cover = element.querySelector('a[href^="/content/"]')!.getBoundingClientRect()
            const controls = element.querySelector('[data-home-work-controls]')!.getBoundingClientRect()
            return Math.abs(cover.bottom - controls.bottom)
          })
          assert.ok(await controlOffset() <= 1, 'Anchor the work controls to the bottom edge of the cover')
          if (width === 1440) {
            const originalTitle = await page.$eval('[data-graph-reading] h3 a', element => element.textContent!)
            await page.$eval('[data-graph-reading] h3 a', element => { element.textContent = '제목이 두 줄로 이어지는 책' })
            assert.ok(await controlOffset() <= 1, 'Wrapping the title must not move the controls away from the cover bottom')
            await page.$eval('[data-graph-reading] h3 a', (element, title) => { element.textContent = title }, originalTitle)
          }
        }
        const checkShort = async (label: string) => {
          assert.ok(await page.$eval('[data-graph-reading]', (element, value) => element.textContent?.includes(value), label))
          assert.equal(await page.$('[data-home-text-expand]'), null, 'The separate full-view icon stays removed')
          assert.equal(await page.$('[data-home-reading-expandable]'), null, 'Fully visible text itself must not be a modal trigger')
          await page.$eval('[data-home-reading-preview]', element => (element as HTMLElement).click())
          assert.equal(await page.$('[data-test-text-modal]'), null)
          assert.equal(await page.$('[data-graph-reading] .clip-fade-end'), null)
          if (label === 'About the work:') assert.equal(await page.$('[data-content-reading-label="review"] a'), null)
          else {
            const source = await page.$eval('[data-content-reading-label="review"] a', e => ({ href: e.getAttribute('href'), target: e.getAttribute('target'), underline: getComputedStyle(e).textDecorationLine, nested: !!e.closest('[role="button"]') }))
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
        await page.waitForSelector('[data-home-reading-expandable]')
        assert.ok(await page.$eval('[data-home-reading-preview]', element => element.scrollHeight > element.clientHeight + 1))
        const blank = await page.$eval('[data-home-reading-preview]', element => {
          const box = element.getBoundingClientRect()
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
          const rectangles: DOMRect[] = []
          while (walker.nextNode()) { const range = document.createRange(); range.selectNodeContents(walker.currentNode); rectangles.push(...range.getClientRects()) }
          for (let y = box.top + 4; y < box.bottom - 2; y += 4) {
            const x = box.right - 2
            if (!rectangles.some(rect => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) return { x, y }
          }
          throw new Error('No text-free point found in the preview')
        })
        await page.mouse.move(blank.x, blank.y)
        assert.equal(await page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, blank), 'pointer', 'Whitespace belongs to the full-text interaction area')
        await page.mouse.click(blank.x, blank.y)
        await page.waitForSelector('[data-test-text-modal]')
        await page.click('[data-test-text-modal] button')
        await page.$eval('[data-content-reading-label="review"] a', element => element.addEventListener('click', event => event.preventDefault()))
        await page.click('[data-content-reading-label="review"] a')
        assert.equal(await page.$('[data-test-text-modal]'), null, 'Clicking a source must not open the full-text modal')
        const textLine = await page.$eval('[data-home-reading-preview] [data-content-reading-body] > span:last-child', element => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
          const node = walker.nextNode()!
          const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, Math.min(25, node.textContent!.length))
          const box = range.getClientRects()[0]
          return { x: box.left + 2, y: box.top + box.height / 2, end: Math.min(box.right - 2, box.left + 110) }
        })
        await page.mouse.move(textLine.x, textLine.y); await page.mouse.down()
        await page.mouse.move(textLine.end, textLine.y, { steps: 4 }); await page.mouse.up()
        assert.ok(await page.evaluate(() => !!window.getSelection()?.toString()), 'The full-area interaction must still allow selecting text')
        assert.equal(await page.$('[data-test-text-modal]'), null, 'Selecting text must not open a modal')
        await page.evaluate(() => window.getSelection()?.removeAllRanges())
        await page.focus('[data-home-reading-expandable]')
        await page.keyboard.press('Enter')
        await page.waitForSelector('[data-test-text-modal]')
        assert.ok((await page.$eval('[data-test-text-modal] p', element => element.textContent?.length ?? 0)) > 1000)
        if (mode === 'books') assert.ok(await page.$('[data-test-text-modal] a[href="https://source.test/evidence"]'), 'Read-book sources remain in the full-text modal')
        await page.click('[data-test-text-modal] button')
        assert.equal(await page.$eval('[data-home-reading-preview]', e => e.scrollTop), 0, 'Closing the full text must not scroll the clipped preview past its first sentence')
        await page.click('[data-next-work]')
        await page.waitForFunction(() => document.querySelector('[data-home-reading-expandable]') === null)
        await checkShort(mode === 'books' ? 'Appreciation background' : '감상 배경')
        if (mode === 'books') {
          await page.click('[data-shelf-category="appearance"]')
          await checkShort('About the work:')
          await page.click('[data-next-work]')
          await page.waitForSelector('[data-home-reading-expandable]')
          await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-animated-height]')!).overflow !== 'clip')
          await page.$eval('[data-home-reading-preview]', element => (element as HTMLElement).click())
          await page.waitForSelector('[data-test-text-modal]')
          assert.equal(await page.$('[data-test-text-modal] a'), null, 'Book introductions must not inherit a review source')
        }
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
