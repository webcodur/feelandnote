import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const failures = []
const previews = '#virtual-monologue [role="button"][aria-haspopup="dialog"], #library [role="button"][aria-haspopup="dialog"]'
const readingSections = ['#person-guide']

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

      assert.equal(await page.$('#reading'), null, '읽어보기 통합 구획은 없어야 한다')
      assert.equal(await page.$('#archive-tab-guide, #archive-tab-monologue'), null, '인물 안내·가상독백 모드 탭은 없어야 한다')

      for (const selector of readingSections) {
        await page.waitForSelector(`${selector} p`)
        const measurements = await page.$eval(selector, (section) => {
          const paragraphs = [...section.querySelectorAll('p')]
          const ancestors = new Set()
          for (const paragraph of paragraphs) {
            let current = paragraph
            while (current && current !== section) {
              ancestors.add(current)
              current = current.parentElement
            }
          }
          return {
            paragraphs: paragraphs.length,
            textLength: paragraphs.map((paragraph) => paragraph.textContent).join('').trim().length,
            previewButtons: section.querySelectorAll('[aria-haspopup="dialog"]').length,
            clipped: [...ancestors].filter((element) => (
              element.scrollHeight > element.clientHeight + 1
              && /hidden|clip/.test(getComputedStyle(element).overflowY)
            )).length,
            internalScroll: [...ancestors].filter((element) => /auto|scroll/.test(getComputedStyle(element).overflowY)).length,
            fades: [...ancestors].filter((element) => getComputedStyle(element).maskImage !== 'none').length,
          }
        })
        console.log(JSON.stringify({ width, section: selector, measurements }))
        assert.ok(measurements.paragraphs > 0 && measurements.textLength > 0, `${width}px ${selector}: 전문 본문이 있어야 한다`)
        assert.equal(measurements.previewButtons, 0, `${width}px ${selector}: 미리보기 모달 버튼은 없어야 한다`)
        assert.equal(measurements.clipped, 0, `${width}px ${selector}: 전문을 잘라서는 안 된다`)
        assert.equal(measurements.internalScroll, 0, `${width}px ${selector}: 내부 스크롤은 없어야 한다`)
        assert.equal(measurements.fades, 0, `${width}px ${selector}: 전문 끝 흐림은 없어야 한다`)
        await page.$eval(`${selector} p`, (paragraph) => paragraph.click())
        assert.equal(await page.$('[role="dialog"]'), null, `${width}px ${selector}: 본문 클릭으로 전문 모달을 열지 않는다`)

        // 음원이 확인된 플레이어만 노출한다. 타이밍이 있으면 문장 재생과 강조도 인라인에서 이어진다.
        const controls = `${selector} [role="group"]`
        if (await page.$(controls)) {
          const audio = await page.$eval(controls, (element) => ({
            inert: element.closest('[inert]') !== null,
            duration: Number(element.querySelector('input[type="range"]').max),
          }))
          assert.equal(audio.inert, false, `${width}px ${selector}: 존재하지 않는 음원의 비활성 플레이어를 표시하지 않는다`)
          assert.ok(audio.duration > 0, `${width}px ${selector}: 플레이어에 유효한 음원 길이가 있어야 한다`)
          const sentences = `${selector} p [role="button"]`
          const sentenceCount = await page.$$eval(sentences, (elements) => elements.length)
          if (sentenceCount) {
            const sentenceElements = await page.$$(sentences)
            await sentenceElements[Math.floor(sentenceElements.length / 2)].click()
            await page.waitForSelector(`${selector} mark[aria-current="true"]`)
            assert.equal(await page.$('[role="dialog"]'), null, `${width}px ${selector}: 문장 재생은 전문 모달을 열지 않는다`)
            await page.$eval(controls, (element) => element.querySelectorAll('button')[2].click())
            assert.ok(await page.$(`${selector} mark[aria-current="true"]`), `${width}px ${selector}: 일시정지해도 현재 문장 강조를 유지한다`)
            await page.$eval(controls, (element) => element.querySelectorAll('button')[0].click())
            await page.waitForSelector(`${selector} mark[aria-current="true"]`, { hidden: true })
          }
          console.log(JSON.stringify({ width, section: selector, audioDuration: audio.duration, timedSentenceCount: sentenceCount }))
        } else {
          console.log(JSON.stringify({ width, section: selector, narration: 'player not exposed' }))
        }
      }

      if (width >= 768) {
        const fullMonologue = await page.$eval('#virtual-monologue', (section) => {
          const paragraphs = [...section.querySelectorAll('p')].filter((element) => element.getBoundingClientRect().height > 0)
          const ancestors = new Set()
          for (const paragraph of paragraphs) {
            let element = paragraph
            while (element && element !== section) {
              ancestors.add(element)
              element = element.parentElement
            }
          }
          return {
            textLength: paragraphs.map((paragraph) => paragraph.textContent).join('').length,
            clipped: [...ancestors].some((element) => element.scrollHeight > element.clientHeight + 1 && /hidden|clip/.test(getComputedStyle(element).overflowY)),
            faded: [...ancestors].some((element) => getComputedStyle(element).maskImage !== 'none'),
          }
        })
        assert.ok(fullMonologue.textLength > 500, 'PC 가상독백은 전문을 바로 표시한다')
        assert.equal(fullMonologue.clipped, false, 'PC 가상독백은 높이 제한으로 자르지 않는다')
        assert.equal(fullMonologue.faded, false, 'PC 가상독백 전문은 끝을 흐리지 않는다')
        console.log(JSON.stringify({ width, section: '#virtual-monologue', fullMonologue }))
      }

      const measurements = await page.$$eval(previews, (elements) => elements.filter((element) => element.getBoundingClientRect().height > 0).map((element) => {
        const style = getComputedStyle(element)
        const clipped = element.scrollHeight > element.clientHeight + 1
        return {
          section: element.closest('section')?.id,
          label: element.getAttribute('aria-label'),
          height: element.clientHeight,
          fullHeight: element.scrollHeight,
          clipped,
          overflow: style.overflowY,
          fades: style.maskImage !== 'none',
        }
      }))
      // 미리보기(접힘+모달)는 상한 INLINE_READING_TEXT_MAX을 넘는 장문에만 남는다 — 상한 안의
      // 소개·감상배경은 통째로 보이므로 개수를 고정하지 않고 보이는 미리보기만 검사한다
      const monologue = measurements.find((item) => item.section === 'virtual-monologue')
      if (width < 768 && monologue) assert.ok(monologue.clipped && monologue.fades, `${width}px: 긴 가상독백은 적정 높이에서 자르고 끝을 흐린다`)
      console.log(JSON.stringify({ width, section: 'previews', measurements }))
      for (const item of measurements) {
        const context = `${width}px preview: ${item.label}`
        if (/auto|scroll/.test(item.overflow)) failures.push(`${context}: 내부 스크롤`)
        const previewHeightLimit = width >= 768 ? 844 * 0.55 : 844 / 2
        if (item.height > previewHeightLimit + 1) failures.push(`${context}: 미리보기가 화면 높이 제한보다 김`)
        if (item.clipped && !item.fades) failures.push(`${context}: 잘린 본문에는 끝 흐림이 있어야 함`)
      }

      // 잘린 미리보기에서도 눌러 전문을 열고 키보드로 닫을 수 있어야 한다.
      const labels = measurements.map((item) => item.label)
      for (const label of labels) {
        await page.evaluate((name) => {
          const element = [...document.querySelectorAll('#virtual-monologue [role="button"][aria-haspopup="dialog"], #library [role="button"][aria-haspopup="dialog"]')]
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
      assert.equal(await page.$('#timeline'), null, '연표 구획은 없어야 한다')
    } finally {
      await page.close()
    }
  }
  assert.deepEqual(failures, [])
  console.log('PASS: PC·모바일 인물 안내 전문, 인라인 낭독, 가상독백·작품 미리보기 높이·끝 흐림·전문 모달, 연표 제거')
} finally {
  await browser.close()
}
