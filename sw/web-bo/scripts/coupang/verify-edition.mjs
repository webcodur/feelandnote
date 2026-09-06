/*
  반영된 쿠팡 상품이 실제로 그 판본인지 상품 상세에서 ISBN·출판사·저자를 뽑아 대조한다.
  상품 상세 영역만 읽는다 — 페이지 상단 메뉴의 로켓 아이콘을 배지로 오인하지 않기 위해서다.
  판정만 하고 DB는 건드리지 않는다.

  사용: node verify-edition.mjs <선택.json> <결과.json> [시작] [끝]
*/
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
const require = createRequire(path.join(REPO, 'package.json'))
const puppeteer = require('puppeteer')

const [inFile, outFile, fromArg, toArg] = process.argv.slice(2)
if (!inFile || !outFile) throw new Error('선택.json과 결과.json 경로가 필요합니다.')

const rows = JSON.parse(fs.readFileSync(inFile, 'utf8'))
const from = Number(fromArg ?? 0)
const to = Number(toArg ?? rows.length)
const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : []
const seen = new Set(done.map((row) => `${row.content_id}:${row.productId}`))

function squash(value) {
  return String(value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.「」『』<>-]/g, '').toLowerCase()
}

const browser = await puppeteer.connect({
  browserURL: `http://localhost:${process.env.COUPANG_CHROME_PORT ?? 9222}`,
  defaultViewport: { width: 1280, height: 900 },
})
const page = await browser.newPage()

for (let index = from; index < to && index < rows.length; index += 1) {
  const row = rows[index]
  if (seen.has(`${row.content_id}:${row.productId}`)) continue
  try {
    // 연속 요청이 잦으면 쿠팡이 Access Denied로 막는다. 막히면 길게 쉬었다 다시 연다.
    let detail = null
    for (let attempt = 1; attempt <= 3 && !detail?.publisher; attempt += 1) {
      if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 45000))
      if (attempt === 1) await page.goto(row.productUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
      else await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 })
      if (/Access Denied/i.test(await page.title())) continue
      try {
        await page.waitForSelector('.prod-atf, .prod-buy', { timeout: 12000 })
      } catch { /* 선택자가 안 뜨면 아래에서 빈 결과로 처리한다 */ }
      await new Promise((resolve) => setTimeout(resolve, 2500))
      detail = await page.evaluate(() => {
        const root = document.querySelector('.prod-atf, .prod-buy')
        if (!root) return null
        const text = root.innerText.replace(/\s+/g, ' ')
      const grab = (label) => text.match(new RegExp(`${label}\\s*:?\\s*([^:]{1,60}?)(?=\\s+(?:출판사|저자|ISBN|적립|수량|다른 판매자)|$)`))?.[1]?.trim() ?? null
      return {
        isbn: text.match(/ISBN\s*:?\s*([\dXx-]{10,17})/)?.[1] ?? null,
        publisher: grab('출판사'),
        creator: grab('저자'),
        // 도착 보장·로켓 문구는 상품 영역 안에서만 인정한다.
        // 무료배송은 배지가 아니다. 일반배송 상품도 무료면 뜬다.
        delivery: [...new Set((text.match(/(로켓배송|로켓프레시|로켓직구|오늘도착|새벽도착|내일도착|도착 보장)/g) ?? []))],
        }
      })
    }

    const wantIsbn = String(row.isbn ?? '').replace(/[^0-9Xx]/g, '')
    const gotIsbn = String(detail?.isbn ?? '').replace(/[^0-9Xx]/g, '')
    const isbnVerdict = !gotIsbn ? 'not_shown' : (gotIsbn === wantIsbn ? 'match' : 'mismatch')
    const publisherHit = detail?.publisher ? squash(row.name).includes(squash(detail.publisher)) : null

    const record = {
      content_id: row.content_id,
      productId: row.productId,
      title: row.title,
      wantIsbn,
      gotIsbn: gotIsbn || null,
      isbnVerdict,
      detailPublisher: detail?.publisher ?? null,
      detailCreator: detail?.creator ?? null,
      publisherInName: publisherHit,
      delivery: detail?.delivery ?? [],
      hasRealBadge: (detail?.delivery ?? []).length > 0,
    }
    done.push(record)
    fs.writeFileSync(outFile, JSON.stringify(done, null, 2), 'utf8')
    const mark = isbnVerdict === 'match' ? '✔' : (isbnVerdict === 'mismatch' ? '✖' : '·')
    console.log(`${mark} [${index}] ${row.title.slice(0, 34)} | ISBN ${isbnVerdict} | 배지 ${record.hasRealBadge ? 'O' : 'X'}`)
    // 차단을 부르지 않도록 상품 사이를 띄운다.
    await new Promise((resolve) => setTimeout(resolve, 6000))
  } catch (error) {
    console.log(`! [${index}] ${row.title.slice(0, 34)} :: ${error.message.slice(0, 80)}`)
  }
}

await page.close()
browser.disconnect()

const match = done.filter((row) => row.isbnVerdict === 'match').length
const mismatch = done.filter((row) => row.isbnVerdict === 'mismatch').length
const notShown = done.filter((row) => row.isbnVerdict === 'not_shown').length
const noBadge = done.filter((row) => !row.hasRealBadge).length
console.log(`\n대조 ${done.length}건 — 일치 ${match} / 불일치 ${mismatch} / ISBN 미노출 ${notShown} / 배지 없음 ${noBadge}`)
console.log(`WROTE ${outFile}`)
