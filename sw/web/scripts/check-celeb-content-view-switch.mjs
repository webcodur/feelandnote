import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()
const requests = []

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

page.on('request', (request) => {
  if (request.method() !== 'POST') return
  let shape = 'encoded'
  try {
    const data = JSON.parse(request.postData() ?? 'null')
    shape = Array.isArray(data)
      ? `array-${data.length}-${typeof data[0]}`
      : typeof data
  } catch {
    shape = 'encoded'
  }
  requests.push({
    at: Date.now(),
    path: new URL(request.url()).pathname,
    action: request.headers()['next-action'] ?? null,
    shape,
  })
})

const readView = () => page.evaluate(() => {
  const library = document.querySelector('#library')
  const rendered = (element) => element instanceof HTMLElement
    && element.getClientRects().length > 0
  const affiliateLinks = [...(library?.querySelectorAll('a') ?? [])]
    .filter(rendered)
    .map((link) => ({
      text: link.textContent?.trim() ?? '',
      href: link.getAttribute('href') ?? '',
      cardText: link.closest('article, li')?.textContent?.trim().slice(0, 160) ?? '',
    }))
    .filter((link) => /coupang|쿠팡|구매|제휴/i.test(`${link.text} ${link.href}`))

  return {
    nextMode: library
      ?.querySelector('[data-testid="archive-view-toggle"]')
      ?.getAttribute('data-next-view-mode') ?? null,
    selectedTitle: [...(library?.querySelectorAll('[data-testid="expand-selected-title"]') ?? [])]
      .find(rendered)
      ?.textContent?.trim() ?? null,
    affiliateLinks,
    affiliateActionCount: [...(library?.querySelectorAll('[data-testid="content-affiliate-link"]') ?? [])]
      .filter(rendered)
      .length,
    affiliateDisclosureCount: [...(library?.querySelectorAll('[data-testid="content-affiliate-disclosure"]') ?? [])]
      .filter(rendered)
      .length,
  }
})

const switchView = async () => {
  const requestStart = requests.length
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const selector = '#library [data-testid="archive-view-toggle"]'
    const button = document.querySelector(selector)
    if (!(button instanceof HTMLButtonElement)) {
      reject(new Error('보기 전환 버튼을 찾지 못했습니다.'))
      return
    }

    const before = button.dataset.nextViewMode
    const expectedMode = before
    const startedAt = performance.now()
    let settled = false
    let controlLatency = null
    const rendered = (element) => element instanceof HTMLElement
      && element.getClientRects().length > 0
    const finish = () => {
      if (settled) return
      const current = document.querySelector(selector)
      if (!(current instanceof HTMLButtonElement)) return
      if (current.dataset.nextViewMode !== before && controlLatency === null) {
        controlLatency = performance.now() - startedAt
      }
      const presenter = [...document.querySelectorAll('#library [data-library-presenter]')]
        .find((element) => rendered(element) && element.getAttribute('data-library-presenter') === expectedMode)
      if (!presenter || controlLatency === null) return
      const selectedTitle = [...presenter.querySelectorAll('[data-testid="expand-selected-title"]')]
        .find(rendered)
      if (expectedMode === 'expand' && !selectedTitle) return
      if (expectedMode === 'list' && selectedTitle) return
      settled = true
      observer.disconnect()
      requestAnimationFrame(() => resolve({
        from: before === 'expand' ? 'list' : 'expand',
        to: expectedMode,
        controlLatency: Math.round(controlLatency * 10) / 10,
        contentLatency: Math.round((performance.now() - startedAt) * 10) / 10,
      }))
    }
    const observer = new MutationObserver(finish)
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-library-presenter', 'data-next-view-mode'],
    })
    button.click()
    finish()
    setTimeout(() => {
      if (settled) return
      observer.disconnect()
      reject(new Error(`보기 전환이 5초 안에 반영되지 않았습니다: ${before}`))
    }, 5_000)
  }))

  if (result.to === 'expand') {
    await page.waitForFunction(() => [...document.querySelectorAll(
      '#library [data-expand-item-count]',
    )].some((element) => (
      element instanceof HTMLElement
      && element.getClientRects().length > 0
      && Number(element.dataset.expandItemCount) >= 35
    )), { timeout: 15_000 })
  }
  await new Promise((resolve) => setTimeout(resolve, 250))
  return {
    ...result,
    postRequests: requests.slice(requestStart),
    view: await readView(),
  }
}

try {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto('http://localhost:3000/celeb/bill-gates', {
    waitUntil: 'networkidle2',
    timeout: 60_000,
  })
  await page.waitForSelector('#library [data-testid="archive-view-toggle"]', {
    timeout: 15_000,
  })
  await page.$eval('#library', (library) => library.scrollIntoView({ block: 'start' }))
  await page.waitForSelector('#library a[rel*="sponsored"]', { timeout: 15_000 })
  await new Promise((resolve) => setTimeout(resolve, 750))
  const cdp = await page.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const initial = await readView()
  const switches = []
  for (let index = 0; index < 8; index += 1) switches.push(await switchView())

  const failures = []
  // 첫 왕복은 서버 데이터 준비 구간이다. 이후 세 번의 대표값으로 전환 성능을 판정해
  // 브라우저 GC나 개발 서버 HMR 한 번에 회귀 검사가 뒤집히지 않게 한다.
  const repeatedSwitches = switches.slice(2)
  const summarize = (mode) => {
    const samples = repeatedSwitches.filter((result) => result.to === mode)
    return {
      controlLatency: Math.round(median(samples.map((sample) => sample.controlLatency)) * 10) / 10,
      contentLatency: Math.round(median(samples.map((sample) => sample.contentLatency)) * 10) / 10,
    }
  }
  const repeatedExpand = summarize('expand')
  const repeatedList = summarize('list')
  if (repeatedExpand.controlLatency > 100) {
    failures.push(`반복 펼쳐보기 조작 반응 중앙값이 ${repeatedExpand.controlLatency}ms 걸렸습니다.`)
  }
  if (repeatedExpand.contentLatency > 250) {
    failures.push(`반복 펼쳐보기 본문 반영 중앙값이 ${repeatedExpand.contentLatency}ms 걸렸습니다.`)
  }
  if (repeatedList.controlLatency > 100) {
    failures.push(`반복 리스트 조작 반응 중앙값이 ${repeatedList.controlLatency}ms 걸렸습니다.`)
  }
  if (repeatedList.contentLatency > 250) {
    failures.push(`반복 리스트 본문 반영 중앙값이 ${repeatedList.contentLatency}ms 걸렸습니다.`)
  }
  if (switches.slice(1).some((result) => result.postRequests.length > 0)) {
    failures.push('최초 펼쳐보기 뒤의 보기 전환에서 서버 액션을 다시 요청했습니다.')
  }

  if (initial.affiliateActionCount < 4 || initial.affiliateDisclosureCount === 0) {
    failures.push('The first four list items must expose Coupang actions and a disclosure.')
  }
  if (initial.affiliateLinks.length !== initial.affiliateActionCount) {
    failures.push('The archive must not render a separate affiliate rail above the item actions.')
  }

  if (initial.affiliateLinks.length === 0) {
    failures.push('감상 영역 상단에 쿠팡 제휴 도서가 노출되지 않았습니다.')
  }

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await switchView()
  const menuSelector = '#library aside button[aria-controls][aria-label]'
  await page.$eval(menuSelector, (button) => button.click())
  const firstIndexItem = '#library aside nav section div button[title]'
  await page.waitForSelector(firstIndexItem, { timeout: 15_000 })
  await page.click(firstIndexItem)
  await page.waitForFunction(() => [...document.querySelectorAll(
    '#library [data-testid="content-affiliate-link"]',
  )].some((element) => element instanceof HTMLElement && element.getClientRects().length > 0))
  const selectedAffiliate = await page.evaluate(() => {
    const rendered = (element) => element instanceof HTMLElement
      && element.getClientRects().length > 0
    const link = [...document.querySelectorAll('#library [data-testid="content-affiliate-link"]')]
      .find(rendered)
    const disclosure = [...document.querySelectorAll('#library [data-testid="content-affiliate-disclosure"]')]
      .find(rendered)
    return {
      href: link?.getAttribute('href') ?? null,
      label: link?.textContent?.trim() ?? null,
      hasDisclosure: Boolean(disclosure),
    }
  })
  if (!selectedAffiliate.href || !selectedAffiliate.hasDisclosure) {
    failures.push('펼쳐보기에서 제휴 도서를 골랐을 때 구매 링크와 고지 문구가 함께 보이지 않았습니다.')
  }

  console.log(JSON.stringify({ initial, switches, repeatedExpand, repeatedList, selectedAffiliate, failures }, null, 2))
  if (failures.length > 0) process.exitCode = 1
} finally {
  await browser.close()
}
