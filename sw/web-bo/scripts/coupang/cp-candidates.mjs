/*
  검색 결과 후보만 모은다. 링크는 만들지 않는다.
  사람이 목록을 읽고 무엇을 고를지 정한 뒤, cp-pick.mjs로 그 하나만 만든다.

  사용: node cp-candidates.mjs <대상.json> <후보.json> [시작] [끝]
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
const done = new Set(out.map((r) => r.content_id))

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
const pages = await browser.pages()
const page = pages.find((p) => p.url().includes('coupang')) ?? pages[0]
await page.setViewport({ width: 1440, height: 1000 })

for (let i = from; i < to && i < targets.length; i++) {
  const t = targets[i]
  if (done.has(t.content_id)) continue

  // 제목만으로 검색한다 — 저자·출판사를 붙이면 후보가 좁아져 더 나은 상품을 놓친다
  const query = t.title.replace(/\s*\(.*?\)\s*/g, ' ').trim()

  try {
    await page.goto(`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await sleep(6000)

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
        res.push({ idx, name: name.slice(0, 110), price })
      })
      return res
    })

    const real = cards.filter((c) => c.name && !c.name.includes('광고할 링크') && !c.name.includes('클릭하여'))
    out.push({ ...t, query, candidates: real.slice(0, 12) })
    console.log(`[${i}] ${t.title} — 후보 ${real.length}개`)
  } catch (e) {
    out.push({ ...t, query, candidates: [], error: String(e).slice(0, 120) })
    console.log(`[${i}] ${t.title} — 오류`)
  }

  fs.writeFileSync(outFile, JSON.stringify(out, null, 1), 'utf8')
  await sleep(6500)
}

console.log(`\n후보 수집 끝: ${out.length}건`)
await browser.disconnect()
