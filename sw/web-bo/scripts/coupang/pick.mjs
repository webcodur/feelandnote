/*
  사람이 고른 후보 하나로 링크를 만들고 자료에 넣는다.

  사용: node pick.mjs <선택.json>
  선택.json = [{ "content_id": "...", "title": "...", "query": "...", "idx": 3 }, ...]
    idx 는 candidates.json 의 후보 idx 값이다.
  후보 조사 뒤 서비스를 먼저 등록해 content_id를 확정해야 실행할 수 있다.
*/
import { fileURLToPath } from 'url'
import path from 'path'

// 이 파일 위치에서 저장소 뿌리를 되짚는다 — 절대 경로를 박으면 다른 컴퓨터에서 못 돈다
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
import { createRequire } from 'module'
import fs from 'fs'
const requireWeb = createRequire(path.join(REPO, 'sw/web/package.json'))
const requireRoot = createRequire(path.join(REPO, 'package.json'))
const puppeteer = requireRoot('puppeteer')
const { createClient } = requireWeb('@supabase/supabase-js')

const env = fs.readFileSync(path.join(REPO, 'sw/web/.env'), 'utf8')
const pickEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}
const supabase = createClient(pickEnv('NEXT_PUBLIC_SUPABASE_URL'), pickEnv('SUPABASE_SERVICE_ROLE_KEY'))

const picks = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
  protocolTimeout: 240000,
})
const pages = await browser.pages()
const page = pages.find((p) => p.url().includes('coupang')) ?? pages[0]
await page.setViewport({ width: 1440, height: 1000 })

let done = 0
for (const p of picks) {
  try {
    if (typeof p.content_id !== 'string' || !p.content_id.trim()) {
      throw new Error(`${p.title ?? '(제목 없음)'}: 서비스 등록 뒤 content_id가 필요합니다.`)
    }
    await page.goto(`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent(p.query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await sleep(6000)

    const chosen = await page.evaluate((idx) => {
      const btns = Array.from(document.querySelectorAll('button, a, [role=button]')).filter(
        (b) => (b.innerText || '').trim() === '링크 생성'
      )
      const btn = btns[idx]
      if (!btn) return null
      let node = btn
      let name = ''
      for (let up = 0; up < 8 && node; up++) {
        node = node.parentElement
        if (!node) break
        const txt = (node.innerText || '').trim()
        if (txt.length > 15) {
          name = txt.split('\n').map((s) => s.trim()).filter((s) => s && s !== '링크 생성' && s !== '상품정보')[0] || ''
          if (name.length > 5) break
        }
      }
      btn.scrollIntoView({ block: 'center' })
      btn.click()
      return name.slice(0, 110)
    }, p.idx)

    if (!chosen) {
      console.log(`건너뜀(후보 없음): ${p.title}`)
      continue
    }

    await sleep(5000)
    const link = await page.evaluate(() => {
      const m = (document.body.innerText || '').match(/https:\/\/link\.coupang\.com\/a\/[A-Za-z0-9]+/g) || []
      return m.length ? m[m.length - 1] : null
    })

    if (!link) {
      console.log(`링크 회수 실패: ${p.title}`)
      continue
    }

    const { error } = await supabase
      .from('content_locales')
      .update({ affiliate_url: [{ platform: 'coupang', url: link }], updated_at: new Date().toISOString() })
      .eq('content_id', p.content_id)
      .eq('locale', 'ko')

    if (error) console.error(`반영 실패: ${p.title} — ${error.message}`)
    else {
      done++
      console.log(`${p.title} -> ${chosen}`)
    }

    await page.keyboard.press('Escape')
  } catch (e) {
    console.log(`오류: ${p.title} — ${String(e).slice(0, 100)}`)
  }
  await sleep(7000)
}

console.log(`\n교체 완료 ${done} / ${picks.length}`)
await browser.disconnect()
