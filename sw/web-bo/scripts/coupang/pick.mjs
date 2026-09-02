/*
  사람이 고른 후보 하나로 링크를 만들고 자료에 넣는다.

  사용: node pick.mjs <선택.json>
  선택.json = [{ "content_id": "...", "isbn": "...", "title": "...", "query": "...",
    "name": "...", "productId": "...", "productUrl": "...", "qualityEvidence": ["..."] }, ...]
    productId/productUrl은 candidates.json에서 복사한 상품 식별자다.
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

function productIdentity(raw, field) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${field}: 올바른 쿠팡 상품 URL이 아닙니다.`)
  }
  if (url.protocol !== 'https:' || !/(^|\.)coupang\.com$/i.test(url.hostname)) {
    throw new Error(`${field}: 쿠팡 HTTPS URL이 아닙니다.`)
  }
  const productId = url.pathname.match(/\/vp\/products\/(\d+)/)?.[1] ?? ''
  if (!productId) throw new Error(`${field}: productId를 URL에서 찾을 수 없습니다.`)
  return {
    productId,
    itemId: url.searchParams.get('itemId') ?? '',
    vendorItemId: url.searchParams.get('vendorItemId') ?? '',
  }
}

function normalizeName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

const rawPicks = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
if (!Array.isArray(rawPicks) || rawPicks.length === 0) {
  throw new Error('선택.json은 한 건 이상의 배열이어야 합니다.')
}
const picks = rawPicks.map((p, index) => {
  const label = `[${index}] ${p?.title ?? '(제목 없음)'}`
  if (typeof p?.content_id !== 'string' || !p.content_id.trim()) {
    throw new Error(`${label}: 서비스 등록 뒤 content_id가 필요합니다.`)
  }
  const isbn = String(p.isbn ?? '').replace(/[\s-]/g, '')
  if (!/^(?:97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) {
    throw new Error(`${label}: 정확한 판본을 고정할 ISBN-10 또는 ISBN-13이 필요합니다.`)
  }
  if (typeof p.query !== 'string' || !p.query.trim()) throw new Error(`${label}: query가 필요합니다.`)
  if (typeof p.name !== 'string' || !p.name.trim()) throw new Error(`${label}: 후보 name이 필요합니다.`)
  if (typeof p.productId !== 'string' || !/^\d+$/.test(p.productId)) {
    throw new Error(`${label}: 후보 productId가 필요합니다.`)
  }
  if (!Array.isArray(p.qualityEvidence) || !p.qualityEvidence.some((item) => typeof item === 'string' && item.trim())) {
    throw new Error(`${label}: 상품 화면에서 확인한 qualityEvidence가 필요합니다.`)
  }
  const expectedProduct = productIdentity(p.productUrl, `${label} productUrl`)
  if (expectedProduct.productId !== p.productId) {
    throw new Error(`${label}: productId와 productUrl이 서로 다릅니다.`)
  }
  return { ...p, isbn, expectedProduct }
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 링크를 만든 뒤 판본 불일치로 버리는 일이 없도록 모든 DB 대상을 먼저 확정한다.
const contentIds = [...new Set(picks.map((pick) => pick.content_id))]
const [sourceResult, editionResult, localeResult] = await Promise.all([
  supabase
    .from('fiction_source_contents')
    .select('content_id')
    .in('content_id', contentIds),
  supabase
    .from('fiction_source_editions')
    .select('id,content_id,isbn')
    .eq('locale', 'ko')
    .in('content_id', contentIds),
  supabase
    .from('content_locales')
    .select('content_id,isbn')
    .eq('locale', 'ko')
    .in('content_id', contentIds),
])
if (sourceResult.error) throw new Error(`원전 작품 조회 실패: ${sourceResult.error.message}`)
if (editionResult.error) throw new Error(`원전 판본 조회 실패: ${editionResult.error.message}`)
if (localeResult.error) throw new Error(`도서 판본 조회 실패: ${localeResult.error.message}`)

const sourceIds = new Set((sourceResult.data ?? []).map((row) => row.content_id))
const editionByKey = new Map((editionResult.data ?? []).map((row) => (
  [`${row.content_id}:${String(row.isbn ?? '').replace(/[\s-]/g, '')}`, row.id]
)))
const localeIsbnByContent = new Map((localeResult.data ?? []).map((row) => (
  [row.content_id, String(row.isbn ?? '').replace(/[\s-]/g, '')]
)))
const preparedPicks = picks.map((pick) => {
  if (sourceIds.has(pick.content_id)) {
    const editionId = editionByKey.get(`${pick.content_id}:${pick.isbn}`)
    if (!editionId) {
      throw new Error(`${pick.title}: 작품 아래에 ISBN ${pick.isbn} 판본을 먼저 등록하세요.`)
    }
    return { ...pick, sourceEditionId: editionId }
  }

  if (localeIsbnByContent.get(pick.content_id) !== pick.isbn) {
    throw new Error(`${pick.title}: content_locales ISBN과 선택한 ISBN이 다릅니다.`)
  }
  return { ...pick, sourceEditionId: null }
})

const browser = await puppeteer.connect({
  browserURL: 'http://localhost:9222',
  defaultViewport: null,
  protocolTimeout: 240000,
})
// 사용자가 보고 있던 탭을 검색·링크 생성 화면으로 덮어쓰지 않는다.
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 1000 })

let done = 0
try {
  for (const p of preparedPicks) {
    try {
    await page.goto(`https://partners.coupang.com/#affiliate/ws/link/0/${encodeURIComponent(p.query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await sleep(6000)
    if (page.url().startsWith('https://login.coupang.com/')) {
      throw new Error('쿠팡 파트너스 로그인이 필요합니다. 로그인 뒤 같은 명령을 다시 실행하세요.')
    }

    const chosen = await page.evaluate((expected) => {
      const btns = Array.from(document.querySelectorAll('button, a, [role=button]')).filter(
        (b) => (b.innerText || '').trim() === '링크 생성'
      )

      const inspect = (btn) => {
        let node = btn
        let name = ''
        let productUrl = ''
        for (let up = 0; up < 10 && node; up++) {
          const link = node.querySelector?.('a[href*="/vp/products/"]')
            || node.closest?.('a[href*="/vp/products/"]')
          if (link?.href) productUrl = link.href
          const txt = (node.innerText || '').trim()
          if (txt.length > 15) {
            name = txt.split('\n').map((s) => s.trim()).filter((s) => s && s !== '링크 생성' && s !== '상품정보')[0] || name
          }
          if (productUrl && name.length > 5) break
          node = node.parentElement
        }
        if (!productUrl) return null
        const url = new URL(productUrl)
        return {
          btn,
          name: name.slice(0, 110),
          productUrl,
          productId: url.pathname.match(/\/vp\/products\/(\d+)/)?.[1] || '',
          itemId: url.searchParams.get('itemId') || '',
          vendorItemId: url.searchParams.get('vendorItemId') || '',
        }
      }

      const candidates = btns.map(inspect).filter(Boolean)
      const match = candidates.find((candidate) => (
        candidate.productId === expected.productId
        && (!expected.itemId || candidate.itemId === expected.itemId)
        && (!expected.vendorItemId || candidate.vendorItemId === expected.vendorItemId)
      ))
      if (!match) return null
      match.btn.scrollIntoView({ block: 'center' })
      match.btn.click()
      return { name: match.name, productId: match.productId, productUrl: match.productUrl }
    }, p.expectedProduct)

    if (!chosen) {
      console.log(`건너뜀(검토한 상품이 현재 검색 결과에 없음): ${p.title} — ${p.productId}`)
      continue
    }
    if (normalizeName(chosen.name) !== normalizeName(p.name)) {
      console.log(`건너뜀(상품명 변경): ${p.title} — 검토 "${p.name}" / 현재 "${chosen.name}"`)
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

    const checkedAt = new Date().toISOString()
    const { error } = p.sourceEditionId
      ? await supabase.rpc('replace_fiction_source_product', {
          p_edition_id: p.sourceEditionId,
          p_platform: 'coupang',
          p_product_id: p.productId,
          p_product_url: p.productUrl,
          p_affiliate_url: link,
          p_quality_evidence: p.qualityEvidence.map((value) => value.trim()).filter(Boolean),
          p_checked_at: checkedAt,
        })
      : await supabase
          .from('content_locales')
          .update({ affiliate_url: [{ platform: 'coupang', url: link }], updated_at: checkedAt })
          .eq('content_id', p.content_id)
          .eq('locale', 'ko')

    if (error) console.error(`반영 실패: ${p.title} — ${error.message}`)
    else {
      done++
      console.log(`${p.title} -> ${chosen.name} (${chosen.productId})`)
    }

    await page.keyboard.press('Escape')
    } catch (e) {
      if (String(e).includes('쿠팡 파트너스 로그인이 필요합니다')) throw e
      console.log(`오류: ${p.title} — ${String(e).slice(0, 100)}`)
    }
    await sleep(7000)
  }

  console.log(`\n교체 완료 ${done} / ${preparedPicks.length}`)
} finally {
  await page.close()
  await browser.disconnect()
}
