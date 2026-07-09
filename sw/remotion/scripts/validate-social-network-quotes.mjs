/**
 * Validates Social-Network faction cast quotes (shipped data path).
 * Run: node scripts/validate-social-network-quotes.mjs
 * Exit 0 only if all acceptance checks pass against the real JSON file.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(
  __dirname,
  '../public/factions/Social-Network/faction-data.json',
)

const POLITE = /(습니다|입니다|합니다|겁니다|됩니다|없습니다|있습니다|십시오|됐습니다|었습니다|였습니다)\.?/
const PHILOSOPHY =
  /철학|목적|믿음|연결|대화|프라이버시|광고|광장|자유|커뮤니티|익명|네트워크|피드|사진|감정|인맥|이웃|토론|암호화|데이터|인연|일촌|친구|결제|일상|메신저|소셜|앱|사이트|동호회|유료|단문|관계|표현|이어|사람|메시지|영상|시선|동네|동창|동호회|광장|귓속|순간|세계|혼자|팀|상품|광고판|수사|인권|탈중앙|계정/

/** 고신호 번역투·해설서 패턴 (KO 독백 회귀 방지) */
const TRANSLATESE = [
  [/연결되지 못한/, 'calque 연결되지 못한'],
  [/한 손에 모일/, 'calque 한 손에 모일'],
  [/비로소 갖춰/, 'calque 비로소 갖춰'],
  [/역할이 다릅니다/, 'meta 역할 설명'],
  [/각각 다른 목적/, 'meta 목적 라벨'],
  [/의 철학은/, 'meta ~의 철학은'],
  [/철학은 단순/, 'meta 철학은'],
  [/목적입니다/, 'meta 목적입니다'],
  [/그것이 .+입니다/, 'cleft 그것이~입니다'],
  [/하는 것이 .+입니다/, 'cleft 하는 것이~입니다'],
  [/것,?\s*그게\s/, 'cleft 것, 그게'],
  [/그게\s.+입니다/, 'cleft 그게~입니다'],
  [/그 선을 지키는 것이/, 'cleft 그 선을 지키는 것이'],
  [/밝혀습니다|밝혔습니다/, 'report 밝혔습니다'],
  [/로 하여금/, 'calque 로 하여금'],
  [/에 있어서/, 'calque 에 있어서'],
  [/되어졌/, '이중 수동'],
]

/**
 * 제품 카탈로그 병렬 (영문 브로슈어 A→B×N).
 * 예: "순간은 인스타그램에, 귓속말은 왓츠앱에, … 스레드에"
 * 또는 브랜드가 조사 은/는 주어로 3회 이상 병렬.
 */
function productParallelFlags(quote) {
  const flags = []
  // "…는 …에," 가 2회 이상 → 위치/앱 배정 카탈로그
  const locHits = quote.match(/[은는]\s[^,，.]{0,16}에[,，]/g) || []
  if (locHits.length >= 2) {
    flags.push(`product-loc-parallel (는…에 ×${locHits.length}: ${locHits.join(' | ')})`)
  }
  // 브랜드 + 은/는 가 한 문장에 3+
  const brandTopic =
    quote.match(
      /(페이스북|인스타그램|왓츠앱|스레드|텔레그램|시그널|위챗|트위터|틱톡|스냅챗|링크드인|레딧|마이스페이스|블루스카이|카카오톡)[은는]/g,
    ) || []
  if (brandTopic.length >= 3) {
    flags.push(`brand-topic-parallel (×${brandTopic.length}: ${brandTopic.join(' ')})`)
  }
  return flags
}

function collectPeople(data) {
  const out = []
  for (const g of data.groups ?? []) {
    for (const c of g.clusters ?? []) {
      for (const p of c.people ?? []) out.push(p)
    }
  }
  return out
}

function main() {
  // 회귀: 과거 카탈로그 문장은 반드시 잡혀야 함 (false negative 방지)
  const knownBad =
    '사람은 이어져 있어야 합니다. 그래서 페이스북을 만들었습니다. 순간은 인스타그램에, 귓속말은 왓츠앱에, 밖으로 꺼낼 말은 스레드에 실었습니다. 넷이 모이면 세계가 됩니다.'
  const badFlags = productParallelFlags(knownBad)
  if (badFlags.length === 0) {
    console.error('FAIL: productParallelFlags missed known-bad catalog line')
    process.exit(1)
  }
  console.log('self-check known-bad flags:', badFlags.join('; '))

  if (!fs.existsSync(DATA)) {
    console.error('FAIL: missing', DATA)
    process.exit(1)
  }
  const raw = fs.readFileSync(DATA, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    console.error('FAIL: JSON parse', e.message)
    process.exit(1)
  }

  const people = collectPeople(data)
  const fails = []
  if (people.length !== 25) fails.push(`cast count ${people.length} !== 25`)

  const musk = people.find((p) => p.name === '일론 머스크')
  if (!musk) fails.push('Musk missing')
  const muskChunks = musk?.quoteChunks?.length ?? 0

  // Musk approved closer
  if (musk && !musk.quote.includes('세계 금융 시스템의 절반이 될 겁니다')) {
    fails.push('Musk missing approved finance closer')
  }
  if (musk && musk.quote.includes('세면대')) fails.push('Musk still has sink meme')
  if (musk && /트위터를 샀|트위터를 인수/.test(musk.quote)) {
    fails.push('Musk still has Twitter purchase line')
  }

  for (const p of people) {
    const tag = p.name
    if (!p.quote?.trim()) fails.push(`${tag}: empty quote`)
    if (!Array.isArray(p.quoteChunks) || p.quoteChunks.length < 2) {
      fails.push(`${tag}: quoteChunks < 2`)
    }
    if (!p.quoteEn?.trim()) fails.push(`${tag}: empty quoteEn`)
    if (!Array.isArray(p.quoteEnChunks) || p.quoteEnChunks.length < 1) {
      fails.push(`${tag}: empty quoteEnChunks`)
    }
    if (!POLITE.test(p.quote || '')) fails.push(`${tag}: no 정중체 pattern`)
    if (!PHILOSOPHY.test(p.quote || '')) fails.push(`${tag}: weak philosophy markers`)
    // 기자 보고체 차단 — 말하는 이 1인칭이어야 함
    if (/(밝혔습니다|설명했습니다|강조했습니다|밝혔다고|보도했습니다)/.test(p.quote || '')) {
      fails.push(`${tag}: report prose (not first-person speech)`)
    }
    for (const [re, label] of TRANSLATESE) {
      if (re.test(p.quote || '')) fails.push(`${tag}: 번역투/${label}`)
    }
    for (const label of productParallelFlags(p.quote || '')) {
      fails.push(`${tag}: 번역투/${label}`)
    }

    for (const ch of p.quoteChunks ?? []) {
      const norm = (s) => s.replace(/\s+/g, '')
      if (!norm(p.quote).includes(norm(ch))) {
        fails.push(`${tag}: chunk not in quote: ${ch.slice(0, 32)}`)
      }
    }

    if (p.name !== '일론 머스크' && (p.quoteChunks?.length ?? 0) > muskChunks + 1) {
      fails.push(`${tag}: longer than Musk chunks (${p.quoteChunks.length}>${muskChunks})`)
    }
  }

  console.log('file', DATA)
  console.log('cast', people.length)
  console.log('musk_chunks', muskChunks)
  if (fails.length) {
    console.log('FAIL', fails.length)
    for (const f of fails) console.log(' -', f)
    process.exit(1)
  }
  console.log('PASS all quote acceptance checks')
  process.exit(0)
}

main()
