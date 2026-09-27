import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const url = process.argv[2] ?? 'http://localhost:3000/explore/works/curated'
const cardSelector = 'main a[aria-haspopup="dialog"][href*="/explore/works/curated/"]'
const browser = await puppeteer.launch({ headless: true })

try {
  const page = await browser.newPage()
  // Lane은 자동화 UA에 완성 HTML을 준다. 실제 사용자의 Suspense 경로를 검사한다.
  await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'))
  await page.setViewport({ width: Number(process.argv[3] ?? 1280), height: 900 })
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 })
  await page.waitForSelector(cardSelector, { visible: true })
  const initial = await page.evaluate(() => ({ url: location.href, origin: performance.timeOrigin }))
  const documentRequests = []
  const deferredScripts = []
  await page.setRequestInterception(true)
  page.on('request', async request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documentRequests.push(request.url())
    }
    // 첫 클릭의 모달 청크가 빠른 캐시 때문에 증상을 숨기지 않게 한다.
    if (request.resourceType() === 'script') {
      deferredScripts.push(new URL(request.url()).pathname)
      await new Promise(resolve => setTimeout(resolve, 600))
    }
    await request.continue().catch(() => {})
  })

  for (const index of [0, 1]) {
    const cards = await page.$$(cardSelector)
    assert.ok(cards[index], `기관 카드 ${index + 1}이 있어야 한다`)
    const name = await cards[index].evaluate(card => card.getAttribute('title'))
    await page.evaluate(selector => {
      const card = document.querySelector(selector)
      const probe = { hidden: false, loading: false }
      const inspect = () => {
        for (let node = card; node; node = node.parentElement) {
          if (!node.isConnected || getComputedStyle(node).display === 'none') probe.hidden = true
        }
        if (document.querySelector('main [role="status"][aria-busy="true"]')) probe.loading = true
      }
      const observer = new MutationObserver(inspect)
      observer.observe(document.body, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['style', 'hidden', 'aria-busy'],
      })
      window.__curatorPreviewCheck = { probe, observer }
      inspect()
    }, cardSelector)
    await cards[index].click()
    await page.waitForSelector('[role="dialog"]', { visible: true, timeout: 15_000 })
    const result = await page.evaluate(() => {
      const check = window.__curatorPreviewCheck
      check?.observer.disconnect()
      return {
        ...check?.probe,
        url: location.href,
        origin: performance.timeOrigin,
        dialog: document.querySelector('[role="dialog"]')?.textContent ?? '',
      }
    })
    assert.equal(result.url, initial.url, '기관 미리보기가 주소를 바꾸면 안 된다')
    assert.equal(result.origin, initial.origin, '기관 미리보기가 문서를 새로 로드하면 안 된다')
    assert.equal(documentRequests.length, 0, '기관 클릭이 문서 이동 요청을 만들면 안 된다')
    assert.ok(result.dialog.includes(name), '선택한 기관의 모달이 열려야 한다')
    console.log(JSON.stringify({ click: index + 1, name, hidden: result.hidden, loading: result.loading, deferredScripts: deferredScripts.length }))
    assert.equal(result.hidden, false, '모달을 처음 불러오는 동안에도 기관 목록이 보여야 한다')
    assert.equal(result.loading, false, '기관 클릭이 페이지의 로딩 화면을 다시 띄우면 안 된다')
    await page.keyboard.press('Escape')
    await page.waitForSelector('[role="dialog"]', { hidden: true })
    assert.ok(await page.$eval(cardSelector, card => card.getClientRects().length > 0))
  }
  console.log(`PASS: 첫 클릭과 다음 기관 클릭에서 목록 유지, 모달 열기·닫기 확인 (${url})`)
} finally {
  await browser.close()
}
