import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const url = 'http://localhost:3000/celeb/bill-gates'
const listButton = '#library button[aria-label="리뷰 목록"]'
const titleSelector = '#library [data-testid="expand-selected-title"]'

async function openList(page) {
  await page.click(listButton)
  await page.waitForSelector('[role="dialog"] [data-original-index]', { visible: true })
}

async function readList(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('[role="dialog"] [data-original-index]')]
    return {
      titles: rows.map((row) => row.title),
      selectedIndex: rows.findIndex((row) => row.getAttribute('aria-current') === 'true'),
    }
  })
}

async function waitForTitle(page, expected) {
  await page.waitForFunction((selector, title) => (
    document.querySelector(selector)?.textContent?.trim() === title
  ), {}, titleSelector, expected)
}

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage()
    try {
      await page.setViewport({ width, height: 900 })
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
      await page.waitForFunction(() => (
        Number(document.querySelector('#library [data-expand-item-count]')?.dataset.expandItemCount) > 4
      ))
      const title = await page.$eval(titleSelector, (element) => element.textContent.trim())
      await openList(page)
      const list = await readList(page)
      console.log(JSON.stringify({ width, title, selectedNumber: list.selectedIndex + 1, firstTitle: list.titles[0] }))
      assert.equal(list.selectedIndex, 0, '첫 진입은 감상 목록의 첫 책을 선택해야 한다')
      assert.equal(title, list.titles[0])

      // 목록에서 고른 책은 유지하고, 다음 화살표도 그 다음 책으로 이동한다.
      await page.$eval('[role="dialog"] [data-original-index="2"]', (button) => button.click())
      await waitForTitle(page, list.titles[2])
      await openList(page)
      assert.equal((await readList(page)).selectedIndex, 2)
      await page.keyboard.press('Escape')
      await page.waitForSelector('[role="dialog"]', { hidden: true })
      await page.evaluate(() => {
        const button = [...document.querySelectorAll('#library button[aria-label="다음 기록"]')]
          .find((element) => element.getClientRects().length > 0)
        button.click()
      })
      await waitForTitle(page, list.titles[3])
      console.log(`PASS ${width}px: 첫 책, 직접 선택 유지, 다음 책 이동`)
    } finally {
      await page.close()
    }
  }

  // 전체 색인이 늦게 도착해도 그 전에 사용자가 직접 고른 책은 바꾸지 않는다.
  const page = await browser.newPage()
  let releaseIndex
  const indexGate = new Promise((resolve) => { releaseIndex = resolve })
  let markIndexHeld
  const indexHeld = new Promise((resolve) => { markIndexHeld = resolve })
  let held = false
  try {
    await page.setRequestInterception(true)
    page.on('request', async (request) => {
      let params
      try { [params] = JSON.parse(request.postData() ?? '[]') } catch { /* RSC form */ }
      if (!held && request.method() === 'POST' && params?.userId && params?.limit > 4) {
        held = true
        markIndexHeld()
        await indexGate
      }
      if (!request.isInterceptResolutionHandled()) await request.continue()
    })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const timeout = setTimeout(() => markIndexHeld(), 15_000)
    await indexHeld
    clearTimeout(timeout)
    assert.ok(held, '전체 색인 요청을 지연시켜야 한다')
    await openList(page)
    const seed = await readList(page)
    assert.equal(seed.titles.length, 4)
    await page.$eval('[role="dialog"] [data-original-index="1"]', (button) => button.click())
    await waitForTitle(page, seed.titles[1])
    releaseIndex()
    await page.waitForFunction(() => (
      Number(document.querySelector('#library [data-expand-item-count]')?.dataset.expandItemCount) > 4
    ))
    await openList(page)
    const full = await readList(page)
    assert.equal(full.titles[full.selectedIndex], seed.titles[1])
    await waitForTitle(page, seed.titles[1])
    console.log(`PASS 지연 로딩: 직접 고른 '${seed.titles[1]}' 유지`)
  } finally {
    releaseIndex()
    await page.close()
  }
} finally {
  await browser.close()
}
