/*
  검색 결과 후보만 모은다. 링크는 만들지 않는다.
  content_id가 아직 없는 신규 책은 candidate_key로 조사할 수 있다.
  사람이 목록을 읽고 무엇을 고를지 정한 뒤, 서비스를 등록하고 pick.mjs로 링크를 만든다.

  사용: node candidates.mjs <대상.json> <후보.json> [시작] [끝]
*/
import { fileURLToPath } from 'url'
import path from 'path'

// 이 파일 위치에서 저장소 뿌리를 되짚는다 — 절대 경로를 박으면 다른 컴퓨터에서 못 돈다
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(path.join(REPO, 'package.json'))
const puppeteer = require('puppeteer')

const [targetFile, outFile, fromArg, toArg] = process.argv.slice(2)
const targets = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
const from = Number(fromArg ?? 0)
const to = Number(toArg ?? targets.length)

const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : []
const targetKey = (row) => String(row.content_id ?? row.candidate_key ?? '').trim()
const done = new Set(out.map(targetKey).filter(Boolean))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cleanCreator(c) {
  if (!c) return ''
  return c
    .replace(/\(.*?\)/g, ' ')
    .replace(/[·,;^]/g, ' ')
    .replace(/(옮김|엮음|지음|편저|편역|역주|주해|편|저|역해|역)\b/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
}

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
  protocolTimeout: 240000,
})
// 사용자가 보고 있던 탭을 검색 화면으로 덮어쓰지 않는다.
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })

try {
  for (let i = from; i < to && i < targets.length; i++) {
    const t = targets[i]
    const key = targetKey(t)
    if (!key) throw new Error(`[${i}] content_id 또는 candidate_key가 필요합니다.`)
    if (typeof t.title !== 'string' || !t.title.trim()) {
      throw new Error(`[${i}] 검색할 title이 필요합니다.`)
    }
    if (done.has(key)) continue

    // 제목만으로 검색한다 — 저자·출판사를 붙이면 후보가 좁아져 더 나은 상품을 놓친다
    const query = t.title.replace(/\s*\(.*?\)\s*/g, ' ').trim()

    try {
      await page.goto(`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      await sleep(6000)
      if (page.url().startsWith('https://login.coupang.com/')) {
        throw new Error('쿠팡 파트너스 로그인이 필요합니다. 로그인 뒤 같은 명령을 다시 실행하세요.')
      }

      const cards = await page.evaluate(() => {
        const res = []
        const btns = Array.from(document.querySelectorAll('button, a, [role=button]')).filter(
          (b) => (b.innerText || '').trim() === '링크 생성'
        )
        btns.forEach((btn, idx) => {
          let node = btn
          let name = ''
          let price = ''
          for (let up = 0; up < 8 && node; up++) {
            node = node.parentElement
            if (!node) break
            const txt = (node.innerText || '').trim()
            if (txt.length > 15) {
              const lines = txt.split('\n').map((s) => s.trim()).filter((s) => s && s !== '링크 생성' && s !== '상품정보')
              name = lines[0] || ''
              price = lines.find((l) => /원$/.test(l)) || ''
              if (name.length > 5) break
            }
          }
          const productLink = node?.querySelector?.('a[href*="/vp/products/"]')
            || node?.closest?.('a[href*="/vp/products/"]')
          const productUrl = productLink?.href || ''
          const productId = productUrl.match(/\/vp\/products\/(\d+)/)?.[1] || ''
          res.push({ idx, name: name.slice(0, 110), price, productId, productUrl })
        })
        return res
      })

      const real = cards.filter((c) => c.name && !c.name.includes('광고할 링크') && !c.name.includes('클릭하여'))
      out.push({ ...t, query, candidates: real.slice(0, 12) })
      console.log(`[${i}] ${t.title} — 후보 ${real.length}개`)
    } catch (e) {
      if (String(e).includes('쿠팡 파트너스 로그인이 필요합니다')) throw e
      out.push({ ...t, query, candidates: [], error: String(e).slice(0, 120) })
      console.log(`[${i}] ${t.title} — 오류: ${String(e).slice(0, 120)}`)
    }

    fs.writeFileSync(outFile, JSON.stringify(out, null, 1), 'utf8')
    await sleep(6500)
  }

  console.log(`\n후보 수집 끝: ${out.length}건`)
} finally {
  await page.close()
  await browser.disconnect()
}
