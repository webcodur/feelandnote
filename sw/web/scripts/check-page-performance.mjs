import http from 'node:http'
import https from 'node:https'
import { writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import puppeteer from 'puppeteer'

const value = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i < 0 ? fallback : process.argv[i + 1]
}
const origin = value('--origin', 'http://localhost:3108')
const paths = value('--paths', '/celeb/satoshi-nakamoto,/explore,/explore/faction/openai,/explore/myth/greek').split(',')
const output = value('--out', null)
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const humanUserAgent = (await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/')
const results = []

async function navigation(path, pass) {
  const page = await browser.newPage()
  await page.setUserAgent(humanUserAgent)
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.evaluateOnNewDocument(() => {
    window.__pageTiming = { headingMs: null, cls: 0, lcpMs: 0 }
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      if (!entry.hadRecentInput) window.__pageTiming.cls += entry.value
    })).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(entry => {
      window.__pageTiming.lcpMs = entry.startTime
    })).observe({ type: 'largest-contentful-paint', buffered: true })
    const check = () => {
      const heading = document.querySelector('h1,[data-page-identity] [role="heading"][aria-level="1"]')
      if (!heading || heading.getBoundingClientRect().height === 0 || heading.closest('[hidden]')) return
      window.__pageTiming.headingMs ??= performance.now()
    }
    new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true })
    document.addEventListener('DOMContentLoaded', check)
  })
  const response = await page.goto(new URL(path, origin).href, { waitUntil: 'load', timeout: 90_000 })
  // 스트림의 load 이벤트 뒤에 실행되는 React 구획 교체까지 확인한다.
  await page.waitForFunction(() => !document.querySelector('div[id^="S:"]') &&
    !Array.from(document.querySelectorAll('template')).some(node => node.id.startsWith('B:')),
    { timeout: 60_000 }).catch(() => { errors.push('Unfinished streamed boundary') })
  await page.waitForFunction(() => document.body.innerText.length > 400, { timeout: 30_000 })
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    return {
      heading: document.querySelector('h1')?.textContent?.trim(),
      headingMs: Math.round(window.__pageTiming.headingMs ?? 0),
      ttfbMs: Math.round(nav.responseStart),
      responseMs: Math.round(nav.responseEnd),
      loadMs: Math.round(nav.loadEventEnd || performance.now()),
      fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0),
      transferredBytes: nav.transferSize,
      bodyTextLength: document.body.innerText.length,
      cls: Number(window.__pageTiming.cls.toFixed(3)),
      lcpMs: Math.round(window.__pageTiming.lcpMs),
    }
  })
  await page.close()
  return { path, pass, status: response.status(), ...timing, errors }
}

async function html(path, userAgent) {
  const started = performance.now()
  const url = new URL(path, origin)
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {
      headers: { 'user-agent': userAgent, 'accept-encoding': 'identity' },
    }, response => {
      let text = ''
      let firstByteMs = null
      response.on('data', chunk => { firstByteMs ??= performance.now() - started; text += chunk })
      response.on('end', () => resolve({
        status: response.statusCode,
        firstByteMs: Math.round(firstByteMs ?? 0),
        totalMs: Math.round(performance.now() - started),
        bytes: Buffer.byteLength(text),
        nextCache: response.headers['x-nextjs-cache'] ?? null,
        cfCache: response.headers['cf-cache-status'] ?? null,
        canonical: text.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? null,
        h1: text.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1]?.replace(/<[^>]*>/g, '') ?? null,
        failedBoundary: text.includes('data-dgst='),
        h1Count: (text.match(/<h1(?:\s|>)/g) ?? []).length,
        pendingBoundaries: (text.match(/<template id="B:/g) ?? []).length,
        canonicalInHead: /<head>[\s\S]*?<link[^>]+rel="canonical"[^>]+href="[^"]+"[\s\S]*?<\/head>/.test(text),
      }))
    })
    request.setTimeout(90_000, () => request.destroy(new Error('HTTP timeout')))
    request.on('error', reject)
  })
}

try {
  for (const path of paths) {
    for (const pass of ['first', 'repeat']) {
      const result = await navigation(path, pass)
      results.push(result)
      console.log(JSON.stringify(result))
    }
    for (const [pass, ua] of [['googlebot', 'Googlebot/2.1'], ['yeti', 'Yeti/1.1']]) {
      const bot = await html(path, ua)
      results.push({ path, pass, ...bot })
      console.log(JSON.stringify({ path, pass, ...bot }))
    }
  }
} finally {
  await browser.close()
  if (output) await writeFile(output, JSON.stringify({ origin, results }, null, 2) + '\n')
}
if (results.some(result => result.status !== 200 || result.errors?.length || result.failedBoundary || !(result.h1 ?? result.heading)
  || (result.h1Count !== undefined && (result.h1Count !== 1 || result.pendingBoundaries || !result.canonicalInHead)))) {
  process.exitCode = 1
}
