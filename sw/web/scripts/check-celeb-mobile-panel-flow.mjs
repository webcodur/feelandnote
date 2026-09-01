import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

const clickButton = async (label, selector = 'button') => {
  const clicked = await page.evaluate(({ label, selector }) => {
    const button = [...document.querySelectorAll(selector)].find(
      (element) => element.textContent?.trim() === label,
    )
    button?.click()
    return Boolean(button)
  }, { label, selector })

  if (!clicked) throw new Error(`버튼을 찾지 못했습니다: ${label}`)
}

try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto('http://localhost:3000/celeb/elon-musk', {
    waitUntil: 'networkidle2',
    timeout: 60_000,
  })

  const analysisOpened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.trim().startsWith('05'),
    )
    button?.click()
    return Boolean(button)
  })
  if (!analysisOpened) throw new Error('수치 분석 구획을 열지 못했습니다.')

  await page.waitForFunction(
    () => document.body.innerText.includes('전체 스펙트럼이 유사한 인물'),
    { timeout: 10_000 },
  )

  const spectrumGaps = []
  for (const mode of ['능력', '성향', '덕목']) {
    await clickButton(mode, 'button[aria-current]')
    await new Promise((resolve) => setTimeout(resolve, 550))

    const layout = await page.evaluate((mode) => {
      const overallButton = [...document.querySelectorAll('button')].find(
        (element) => element.textContent?.trim() === '전체 스펙트럼이 유사한 인물',
      )
      const carousel = overallButton?.parentElement?.previousElementSibling
      const tabs = carousel
        ? [...carousel.querySelectorAll('button[aria-current]')]
        : []
      const activeIndex = tabs.findIndex(
        (tab) => tab.getAttribute('aria-current') === 'true',
      )
      const track = carousel?.querySelector('div[tabindex="0"]')
      const activeSlide = track?.children[activeIndex]

      if (!overallButton || !track || !activeSlide || activeIndex < 0) {
        return { mode, found: false }
      }

      track.style.alignItems = 'flex-start'
      const buttonBox = overallButton.getBoundingClientRect()
      const slideBox = activeSlide.getBoundingClientRect()
      const trackBox = track.getBoundingClientRect()
      return {
        mode,
        found: true,
        gap: Math.round((buttonBox.top - slideBox.bottom) * 10) / 10,
        activeHeight: Math.round(slideBox.height * 10) / 10,
        trackHeight: Math.round(trackBox.height * 10) / 10,
      }
    }, mode)
    spectrumGaps.push(layout)
  }

  await clickButton('영향력')
  await page.waitForSelector('#influence-ranking-title', { timeout: 10_000 })

  const influenceMetrics = await page.evaluate(() =>
    [...document.querySelectorAll('span')]
      .map((parent) => {
        if (parent.getClientRects().length === 0) return null
        const metrics = [...parent.children].filter(
          (child) =>
            child.children.length === 0
            && /\S+\s+\d+점$/.test(child.textContent?.trim() ?? ''),
        )
        if (metrics.length !== 2) return null

        return {
          text: metrics.map((metric) => metric.textContent?.trim()),
          tops: metrics.map(
            (metric) => Math.round(metric.getBoundingClientRect().top * 10) / 10,
          ),
          hasSeparator: [...parent.children].some(
            (child) => child.textContent?.trim() === '|',
          ),
        }
      })
      .filter(Boolean),
  )

  const failures = []
  for (const layout of spectrumGaps) {
    if (!layout.found) failures.push(`${layout.mode} 모드의 배치를 찾지 못했습니다.`)
    if (layout.found && layout.gap > 16) {
      failures.push(`${layout.mode} 모드의 추천 버튼 간격이 ${layout.gap}px입니다.`)
    }
  }

  if (influenceMetrics.length === 0) {
    failures.push('영향력 카드의 분야별 점수를 찾지 못했습니다.')
  }
  if (influenceMetrics.some((group) => group.hasSeparator)) {
    failures.push('영향력 카드의 분야별 점수 사이에 | 구분자가 남아 있습니다.')
  }
  if (influenceMetrics.some((group) => new Set(group.tops).size !== 2)) {
    failures.push('영향력 카드의 분야별 점수가 같은 줄에 놓였습니다.')
  }

  console.log(JSON.stringify({ spectrumGaps, influenceMetrics, failures }, null, 2))
  if (failures.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
