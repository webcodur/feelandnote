import assert from 'node:assert/strict'
import test from 'node:test'
import puppeteer from 'puppeteer'
import { fixture } from './HomeGraph.browser.fixture'

test('category changes keep the same person and only person navigation changes the bookshelf owner', async t => {
  const browser = await puppeteer.launch({ headless: true })
  try {
    for (const [locale, width] of [['ko', 390], ['ko', 1440], ['en', 390]] as const) await t.test(`${locale} ${width}px`, async () => {
      const bundle = await fixture(locale, 'Person', null, { personFirst: true })
      const page = await browser.newPage()
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      await page.setViewport({ width, height: 1000 })
      await page.setRequestInterception(true)
      page.on('request', request => void request.respond({ contentType: 'text/html', body: '<html><body><div id="root" style="max-width:960px;margin:24px auto;padding:0 16px"></div></body></html>' }))
      const mount = async () => { await page.addStyleTag({ content: bundle.css }); await page.addScriptTag({ content: bundle.js }); await page.waitForSelector('[data-home-rotation]') }
      try {
        await page.goto('http://home-media-selection.test/')
        await mount()
        assert.equal(await page.$$eval('[data-home-rotation] [role="tab"]', tabs => tabs.length), 8)
        assert.ok(await page.$('[data-home-graph] [role="tablist"]'), 'Keep media tabs inside the original reading column')
        assert.equal(await page.$eval('[data-graph-root]', element => getComputedStyle(element).display), width === 1440 ? 'block' : 'grid', 'Keep the desktop photo-and-reading columns at the full editorial width')
        const layout = await page.$eval('[data-home-graph]', element => {
          const person = element.querySelector('[data-graph-root]')!.getBoundingClientRect()
          const tabs = element.querySelector('[role="tablist"]')!.getBoundingClientRect()
          return { personRight: person.right, personBottom: person.bottom, tabLeft: tabs.left, tabTop: tabs.top }
        })
        assert.ok(width === 1440 ? layout.tabLeft >= layout.personRight : layout.tabTop >= layout.personBottom - 1, 'Tabs stay above the work in the right column, or below the portrait on mobile')
        const person = () => page.$eval('[data-home-rotation]', element => element.getAttribute('data-person'))
        const nextPerson = async () => { await page.click('[data-home-rotation] [data-person-direction="1"]') }
        assert.equal(await person(), 'person1')
        await page.click('[data-shelf-category="MUSIC"]')
        assert.equal(await person(), 'person1')
        assert.equal(await page.$eval('[data-media-reading]', element => element.getAttribute('data-media-reading')), 'MUSIC')
        await page.click('[data-next-work]')
        assert.equal(await person(), 'person1', 'Moving between works does not replace the person')
        await page.click('[data-shelf-category="BOOK"]')
        assert.equal(await person(), 'person1')
        await page.click('[data-shelf-category="MUSIC"]')
        assert.equal(await person(), 'person1')
        await page.focus('[data-shelf-category="MUSIC"]')
        await page.keyboard.press('ArrowLeft')
        assert.equal(await person(), 'person1')
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-shelf-category')), 'VIDEO')
        assert.equal(await page.$eval('[role="tab"][aria-selected="true"]', element => element.id), await page.$eval('[data-home-rotation] [role="tabpanel"]', element => element.getAttribute('aria-labelledby')))
        await nextPerson()
        assert.equal(await person(), 'person2')
        await page.click('[data-shelf-category="VIDEO"]')
        assert.equal(await person(), 'person2', 'Categories now belong to the newly selected person')
        await page.reload()
        await mount()
        assert.equal(await person(), 'person2', 'Restore the selected person for the section, independently of the category')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        assert.deepEqual(errors, [])
      } finally { await page.close() }
    })

    await t.test('an empty category stays disabled instead of choosing another person', async () => {
      const bundle = await fixture('ko', 'Person', null, { personFirst: true, sparseMedia: true })
      const page = await browser.newPage()
      try {
        await page.setContent('<div id="root" style="max-width:960px;margin:24px auto;padding:0 16px"></div>')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-home-rotation]')
        assert.equal(await page.$$eval('[data-shelf-category-row="direct"] [role="tab"]:disabled', tabs => tabs.length), 3)
        await page.click('[data-shelf-category="MUSIC"]')
        assert.equal(await page.$eval('[data-home-rotation]', element => element.getAttribute('data-person')), 'person1')
        assert.equal(await page.$eval('[data-media-reading]', element => element.getAttribute('data-media-reading')), 'BOOK')
      } finally { await page.close() }
    })

    await t.test('sparse book relationships', async () => {
      const bundle = await fixture('ko', 'Person', 'Introduction', { sparseRelations: true })
      const page = await browser.newPage()
      try {
        await page.setViewport({ width: 390, height: 1000 })
        await page.setContent('<div id="root" style="max-width:960px;margin:24px auto;padding:0 16px"></div>')
        await page.addStyleTag({ content: bundle.css })
        await page.addScriptTag({ content: bundle.js })
        await page.waitForSelector('[data-shelf-category-tabs]')
        assert.deepEqual(await page.$$eval('[data-shelf-category-row="explore"] [role="tab"]:not(:disabled)', tabs => tabs.map(tab => tab.getAttribute('data-shelf-category'))), ['authored'])
        assert.equal(await page.$$eval('[data-shelf-category-row="explore"] [role="tab"]:disabled', tabs => tabs.length), 3, 'Empty relationships stay in place as disabled tabs')
        await page.click('[data-shelf-category="authored"]')
        assert.equal(await page.$eval('[data-home-reading-toggle]', element => (element as HTMLButtonElement).disabled), true)
        assert.ok(await page.$('[data-home-reading-toggle] svg'), 'Keep the disabled transition icon when no appreciation exists')
      } finally { await page.close() }
    })
  } finally { await browser.close() }
})
