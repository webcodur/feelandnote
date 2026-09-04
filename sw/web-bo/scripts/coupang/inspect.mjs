/*
  사람이 추린 쿠팡 상품 후보의 상세 화면에서 판본·배송·판매 근거를 회수한다.
  상품을 자동 선택하거나 링크를 만들지 않는다.

  사용: node inspect.mjs <검토대상.json> <근거.json>
  검토대상.json = [{ "content_id":"...", "isbn":"...", "title":"...",
    "productId":"...", "productUrl":"https://www.coupang.com/vp/products/..." }]
*/
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
const require = createRequire(path.join(REPO, 'package.json'))
const puppeteer = require('puppeteer')

const [targetFile, outFile] = process.argv.slice(2)
if (!targetFile || !outFile) {
  throw new Error('검토대상.json과 근거.json 경로가 필요합니다.')
}

const targets = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
if (!Array.isArray(targets) || targets.length === 0) {
  throw new Error('검토 대상은 한 건 이상의 배열이어야 합니다.')
}

function normalizedIsbn(value) {
  return String(value ?? '').replace(/[^0-9Xx]/g, '')
}

function productIdentity(rawUrl) {
  const url = new URL(rawUrl)
  const productId = url.pathname.match(/\/vp\/products\/(\d+)/)?.[1] ?? ''
  if (url.protocol !== 'https:' || !/(^|\.)coupang\.com$/i.test(url.hostname) || !productId) {
    throw new Error(`올바른 쿠팡 상품 URL이 아닙니다: ${rawUrl}`)
  }
  return {
    productId,
    itemId: url.searchParams.get('itemId') ?? '',
    vendorItemId: url.searchParams.get('vendorItemId') ?? '',
  }
}

const reviewed = fs.existsSync(outFile)
  ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
  : []
const done = new Set(reviewed.map((row) => `${row.content_id}:${row.productId}`))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const browser = await puppeteer.connect({
  browserURL: `http://localhost:${process.env.COUPANG_CHROME_PORT ?? 9222}`,
  defaultViewport: null,
  protocolTimeout: 240000,
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })

try {
  for (const [index, target] of targets.entries()) {
    const expected = productIdentity(target.productUrl)
    if (String(target.productId) !== expected.productId) {
      throw new Error(`[${index}] productId와 productUrl이 다릅니다.`)
    }
    const key = `${target.content_id}:${target.productId}`
    if (done.has(key)) continue

    try {
      await page.goto(target.productUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await sleep(5_000)

      const evidence = await page.evaluate(() => {
        const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
        const unique = (values) => [...new Set(values.map(clean).filter(Boolean))]
        const bodyText = document.body?.innerText ?? ''
        const lines = unique(bodyText.split(/\r?\n/))
        const title = clean(
          document.querySelector('.prod-buy-header__title')?.textContent
          ?? document.querySelector('h1')?.textContent
          ?? document.title,
        )
        const isbnMatches = unique(
          bodyText.match(/97[89][0-9\s-]{10,18}[0-9]/g) ?? [],
        ).map((value) => value.replace(/[^0-9Xx]/g, ''))
        const imageBadges = unique(
          Array.from(document.images).flatMap((image) => {
            const value = `${image.alt || ''} ${image.src || ''}`
            return /rocket|delivery|arrival|로켓|배송|도착/i.test(value) ? [value] : []
          }),
        ).slice(0, 20)
        const deliveryLines = lines.filter((line) => (
          /로켓\s*배송|로켓와우|도착\s*보장|오늘\s*도착|내일\s*도착|새벽\s*도착|무료\s*배송/i.test(line)
        )).slice(0, 30)
        const salesLines = lines.filter((line) => (
          /상품평|구매|판매자|재고|남은\s*수량/i.test(line)
        )).slice(0, 30)
        return { title, isbnMatches, imageBadges, deliveryLines, salesLines }
      })

      const isbn = normalizedIsbn(target.isbn)
      const row = {
        ...target,
        finalUrl: page.url(),
        inspectedAt: new Date().toISOString(),
        ...evidence,
        isbnVisible: evidence.isbnMatches.includes(isbn),
        hasDeliveryEvidence: evidence.deliveryLines.length > 0 || evidence.imageBadges.length > 0,
      }
      reviewed.push(row)
      done.add(key)
      fs.writeFileSync(outFile, JSON.stringify(reviewed, null, 2), 'utf8')
      console.log(`[${index}] ${target.title} · ${target.productId} · 배송근거 ${row.hasDeliveryEvidence ? '있음' : '없음'} · ISBN ${row.isbnVisible ? '노출' : '미노출'}`)
    } catch (error) {
      const row = {
        ...target,
        inspectedAt: new Date().toISOString(),
        error: String(error).slice(0, 300),
      }
      reviewed.push(row)
      done.add(key)
      fs.writeFileSync(outFile, JSON.stringify(reviewed, null, 2), 'utf8')
      console.log(`[${index}] ${target.title} · 오류 ${row.error}`)
    }

    await sleep(5_000)
  }
} finally {
  await page.close()
  await browser.disconnect()
}

