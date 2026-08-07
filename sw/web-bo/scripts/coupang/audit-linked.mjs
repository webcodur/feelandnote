import { fileURLToPath } from 'url'
import path from 'path'

// 이 파일 위치에서 저장소 뿌리를 되짚는다 — 절대 경로를 박으면 다른 컴퓨터에서 못 돈다
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../../..')
// 화면에 실제로 뜨는 책들이 어떤 상품에 걸려 있는지 모아 본다.
// 수집 회차별 결과 파일을 합쳐 content_id → 상품명을 만든다.
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(path.join(REPO, 'sw/web/package.json'))
const { createClient } = require('@supabase/supabase-js')

const DIR = process.env.CP_DIR ?? process.cwd()
const env = fs.readFileSync(path.join(REPO, 'sw/web/.env'), 'utf8')
const pick = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}
const supabase = createClient(pick('NEXT_PUBLIC_SUPABASE_URL'), pick('SUPABASE_SERVICE_ROLE_KEY'))

/* 회차별 결과를 합친다.
   같은 책을 여러 회차에서 시도한 경우가 있어 나중 것이 덮어쓰면 사실과 어긋난다
   (실제로 넣지 않고 건너뛴 후보가 표시되는 일이 있었다).
   그래서 상품명을 **주소별로** 담아 두고, 자료에 실제 걸린 주소로 되찾는다. */
const byUrl = new Map()
const byId = new Map()
for (const f of ['results.json', 'results-next.json', 'results-retry.json', 'results-origin.json', 'results-origin2.json', 'results-topic.json', 'results-topic2.json', 'results-picked.json']) {
  const p = `${DIR}/${f}`
  if (!fs.existsSync(p)) continue
  for (const r of JSON.parse(fs.readFileSync(p, 'utf8'))) {
    if (r.status === 'ok' && r.product) { if (r.url === 'picked') byId.set(r.content_id, r.product); else if (r.url) byUrl.set(r.url, r.product) }
  }
}

// 링크가 걸린 책 전량
const { data, error } = await supabase
  .from('content_locales')
  .select('content_id, title, creator, isbn, affiliate_url, contents!inner(user_count, type)')
  .eq('locale', 'ko')
  .eq('contents.type', 'BOOK')
  .not('affiliate_url', 'is', null)
  .limit(1000)

if (error) {
  console.error('조회 실패:', error.message)
  process.exit(1)
}

/** 상품이 미덥지 않은 신호 */
function smells(title, prod) {
  if (!prod) return '상품명 미확인'
  const flags = []
  if (/NSB\d|새책-|새책_|스테이책터|북마트|더스터디물류|책광장/.test(prod)) flags.push('개별서점재고')
  if (/세트|전집|전\d+권|\+ /.test(prod)) flags.push('묶음')
  if (/\b\d\s*\(?[상하]\)?|[ ,:]\d권|\d\/\d/.test(prod)) flags.push('분권')
  if (/DVD|CD|블루레이/.test(prod)) flags.push('영상물')
  if (!prod.includes(title.replace(/\s*\(.*?\)\s*/g, '').split(/[:(]/)[0].trim().slice(0, 6))) flags.push('제목불일치')
  return flags.join(',')
}

const rows = (data ?? [])
  .filter((r) => {
    const a = r.affiliate_url
    return Array.isArray(a) && a.length > 0
  })
  .map((r) => {
    const url = r.affiliate_url?.[0]?.url ?? null
    return {
      content_id: r.content_id,
      title: r.title,
      creator: r.creator,
      isbn: r.isbn,
      user_count: r.contents?.user_count ?? 0,
      url,
      product: byId.get(r.content_id) ?? (url ? (byUrl.get(url) ?? null) : null),
    }
  })

const suspect = rows.map((r) => ({ ...r, flags: smells(r.title, r.product) })).filter((r) => r.flags)

fs.writeFileSync(`${DIR}/audit.json`, JSON.stringify(rows, null, 1), 'utf8')
fs.writeFileSync(`${DIR}/audit-suspect.json`, JSON.stringify(suspect, null, 1), 'utf8')

console.log(`링크 보유 ${rows.length}권 / 미덥지 않은 것 ${suspect.length}권`)
const byFlag = {}
suspect.forEach((s) => s.flags.split(',').forEach((f) => (byFlag[f] = (byFlag[f] ?? 0) + 1)))
console.log(byFlag)
