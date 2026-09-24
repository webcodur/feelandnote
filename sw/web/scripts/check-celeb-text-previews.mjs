import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const failures = []
const previews = '#reading [role="button"][aria-haspopup="dialog"], #library [role="button"][aria-haspopup="dialog"]'

try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage()
    try {
      await page.setViewport({ width, height: 844 })
      await page.goto('http://localhost:3000/celeb/bill-gates', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForFunction(() => (
        Number(document.querySelector('#library [data-expand-item-count]')?.dataset.expandItemCount) > 4
        && document.querySelector('[data-testid="expand-detail-body"]')?.getAttribute('aria-busy') === 'false'
      ))
      await page.evaluate(() => document.fonts.ready)

      for (const tab of ['guide', 'monologue']) {
        await page.click(`#archive-tab-${tab}`)
        await delay(150)
        const measurements = await page.$$eval(previews, (elements) => elements.map((element) => {
          const style = getComputedStyle(element)
          const clipped = element.scrollHeight > element.clientHeight + 1
          return {
            label: element.getAttribute('aria-label'),
            height: element.clientHeight,
            fullHeight: element.scrollHeight,
            clipped,
            overflow: style.overflowY,
            fades: style.maskImage !== 'none',
          }
        }))
        assert.equal(measurements.length, 3, '인물 본문·작품 소개·감상배경을 모두 검사한다')
        console.log(JSON.stringify({ width, tab, measurements }))
        for (const item of measurements) {
          const context = `${width}px ${tab}: ${item.label}`
          if (/auto|scroll/.test(item.overflow)) failures.push(`${context}: 내부 스크롤`)
          if (item.height > 844 / 2) failures.push(`${context}: 미리보기가 화면 절반보다 김`)
          if (item.clipped !== item.fades) failures.push(`${context}: 잘린 본문에만 끝 흐림이 있어야 함`)
        }

        // 잘린 미리보기에서도 눌러 전문을 열고 키보드로 닫을 수 있어야 한다.
        const labels = measurements.map((item) => item.label)
        for (const label of labels) {
          await page.evaluate((name) => {
            const element = [...document.querySelectorAll('[role="button"][aria-haspopup="dialog"]')]
              .find((item) => item.getAttribute('aria-label') === name)
            element.click()
          }, label)
          await page.waitForSelector('[role="dialog"]', { visible: true })
          const closeOffset = await page.$eval('[role="dialog"]', (dialog) => {
            const heading = dialog.querySelector('h2')
            const header = heading.parentElement.parentElement.getBoundingClientRect()
            const close = dialog.querySelector('button').getBoundingClientRect()
            return Math.abs(close.top + close.height / 2 - header.top - header.height / 2)
          })
          assert.ok(closeOffset <= 1, `${width}px ${label}: 닫기 버튼이 헤더 중앙에서 ${closeOffset}px 벗어남`)
          await page.keyboard.press('Escape')
          await page.waitForSelector('[role="dialog"]', { hidden: true })
        }
      }
    } finally {
      await page.close()
    }
  }
  assert.deepEqual(failures, [])
  console.log('PASS: PC·모바일 미리보기 높이, 내부 스크롤 없음, 끝 흐림, 전문 열기')
} finally {
  await browser.close()
}
